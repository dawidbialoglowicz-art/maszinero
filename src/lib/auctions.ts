import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { extendedEnd, minNextBid, resolveProxies } from "./auction-rules";

export type BidResult =
  | { ok: true; leading: boolean; price: number; endsAt: Date }
  | { ok: false; error: string };

/**
 * Składa ofertę z limitem. Cała operacja idzie w transakcji z blokadą wiersza aukcji,
 * więc dwie równoczesne oferty nie nadpiszą sobie ceny.
 */
export async function placeBid(auctionId: string, userId: string, amount: number): Promise<BidResult> {
  if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, error: "Podaj kwotę w pełnych złotych" };
  try {
    return await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Auction" WHERE id = ${auctionId} FOR UPDATE`;
      if (locked.length === 0) return { ok: false, error: "Aukcja nie istnieje" } as const;
      const a = await tx.auction.findUniqueOrThrow({
        where: { id: auctionId },
        include: { listing: { select: { userId: true, status: true } } },
      });
      const now = new Date();
      if (a.status !== "LIVE" || a.listing.status !== "ACTIVE" || now >= a.endsAt) return { ok: false, error: "Aukcja jest już zakończona" } as const;
      if (now < a.startsAt) return { ok: false, error: "Aukcja jeszcze się nie rozpoczęła" } as const;
      if (a.listing.userId === userId) return { ok: false, error: "Nie możesz licytować własnej maszyny" } as const;

      const existing = await tx.proxyBid.findUnique({ where: { auctionId_userId: { auctionId, userId } } });
      const isLeader = a.leaderId === userId;
      if (isLeader) {
        // prowadzący może tylko podnieść swój limit; cena się nie zmienia, chyba że przekroczy cenę minimalną
        if (existing && amount <= existing.maxAmount) return { ok: false, error: `Twój limit to już ${existing.maxAmount} zł` } as const;
      } else {
        const min = minNextBid(a);
        if (amount < min) return { ok: false, error: `Minimalna oferta to ${min} zł` } as const;
      }

      if (existing) {
        await tx.proxyBid.update({ where: { auctionId_userId: { auctionId, userId } }, data: { maxAmount: Math.max(existing.maxAmount, amount) } });
      } else {
        await tx.proxyBid.create({ data: { auctionId, userId, maxAmount: amount } });
      }

      const proxies = await tx.proxyBid.findMany({ where: { auctionId }, orderBy: [{ maxAmount: "desc" }, { createdAt: "asc" }], take: 2 });
      const r = resolveProxies(proxies, a.startPrice, a.reservePrice)!;
      const priceChanged = r.price !== a.currentPrice || a.bidCount === 0;
      const leaderChanged = r.leaderId !== a.leaderId;

      let newBids = 0;
      if (!isLeader && r.leaderId !== userId) {
        // licytujący został od razu przebity przez czyjś limit: pokazujemy jego ofertę i automatyczną odpowiedź
        await tx.bid.create({ data: { auctionId, userId, amount } });
        await tx.bid.create({ data: { auctionId, userId: r.leaderId, amount: r.price, auto: true } });
        newBids = 2;
      } else if (priceChanged || leaderChanged) {
        await tx.bid.create({ data: { auctionId, userId: r.leaderId, amount: r.price } });
        newBids = 1;
      }

      const endsAt = newBids > 0 ? extendedEnd(now, a.endsAt) : a.endsAt;
      await tx.auction.update({
        where: { id: auctionId },
        data: { currentPrice: r.price, leaderId: r.leaderId, bidCount: { increment: newBids }, endsAt },
      });
      await tx.listing.update({ where: { id: a.listingId }, data: { priceNet: r.price } });
      return { ok: true, leading: r.leaderId === userId, price: r.price, endsAt } as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  } catch (e) {
    console.error("placeBid", e);
    return { ok: false, error: "Nie udało się złożyć oferty. Spróbuj ponownie." };
  }
}

/**
 * Zamyka aukcje po czasie: ustala zwycięzcę, jeśli osiągnięto cenę minimalną.
 * Wołane przez cron i leniwie przy wyświetlaniu aukcji, więc musi być idempotentne.
 */
export async function finalizeEndedAuctions(onlyId?: string) {
  const due = await db.auction.findMany({
    where: { status: "LIVE", endsAt: { lte: new Date() }, ...(onlyId ? { id: onlyId } : {}) },
    select: { id: true },
    take: 200,
  });
  for (const { id } of due) {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Auction" WHERE id = ${id} FOR UPDATE`;
      const a = await tx.auction.findUniqueOrThrow({ where: { id } });
      if (a.status !== "LIVE" || a.endsAt > new Date()) return;
      const sold = a.bidCount > 0 && a.leaderId !== null && (a.reservePrice === null || a.currentPrice >= a.reservePrice);
      await tx.auction.update({
        where: { id },
        data: { status: "ENDED", winnerId: sold ? a.leaderId : null, finalPrice: sold ? a.currentPrice : null },
      });
      await tx.listing.update({ where: { id: a.listingId }, data: { status: sold ? "SOLD" : "ARCHIVED" } });
    });
  }
  return due.length;
}

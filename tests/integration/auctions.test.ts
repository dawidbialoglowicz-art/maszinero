// Testy licytacji na prawdziwym Postgresie (DATABASE_URL musi wskazywać bazę testową).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { finalizeEndedAuctions, placeBid } from "@/lib/auctions";
import { resolveProxies } from "@/lib/auction-rules";

const run = process.env.DATABASE_URL?.includes("test") ? describe : describe.skip;

let seller: string;
const bidders: string[] = [];

async function newAuction(opts: { start?: number; reserve?: number | null; endsInMs?: number } = {}) {
  const endsAt = new Date(Date.now() + (opts.endsInMs ?? 86_400_000));
  const start = opts.start ?? 10_000;
  const l = await db.listing.create({
    data: {
      title: "Test", category: "tokarki", brand: "Test", model: "T", year: 2010, priceNet: start, voivodeship: "mazowieckie",
      city: "Warszawa", description: "x".repeat(30), saleType: "AUCTION", userId: seller,
      auction: { create: { startPrice: start, currentPrice: start, reservePrice: opts.reserve ?? null, endsAt, originalEndsAt: endsAt } },
    },
    include: { auction: true },
  });
  return l.auction!;
}

run("licytacja (baza)", () => {
  beforeAll(async () => {
    await db.listing.deleteMany({ where: { title: "Test" } });
    await db.user.deleteMany({ where: { email: { endsWith: "@test.maszinero" } } });
    seller = (await db.user.create({ data: { email: "seller@test.maszinero", name: "Sprzedawca", passwordHash: "x" } })).id;
    for (let i = 0; i < 12; i++) {
      bidders.push((await db.user.create({ data: { email: `b${i}@test.maszinero`, name: `Kupujący ${i}`, passwordHash: "x", phone: "600100200" } })).id);
    }
  });
  beforeEach(async () => {
    await db.listing.deleteMany({ where: { title: "Test" } });
  });
  afterAll(async () => {
    await db.listing.deleteMany({ where: { title: "Test" } });
    await db.user.deleteMany({ where: { email: { endsWith: "@test.maszinero" } } });
    await db.$disconnect();
  });

  it("pierwsza oferta z limitem płaci cenę wywoławczą", async () => {
    const a = await newAuction();
    const r = await placeBid(a.id, bidders[0], 50_000);
    expect(r).toMatchObject({ ok: true, leading: true, price: 10_000 });
    const after = await db.auction.findUniqueOrThrow({ where: { id: a.id }, include: { listing: true } });
    expect(after).toMatchObject({ currentPrice: 10_000, leaderId: bidders[0], bidCount: 1 });
    expect(after.listing.priceNet).toBe(10_000);
  });

  it("przebicie cudzego limitu: oferta przegrywa od razu, a cena rośnie do oferty plus próg", async () => {
    const a = await newAuction();
    await placeBid(a.id, bidders[0], 50_000);
    const r = await placeBid(a.id, bidders[1], 30_000);
    expect(r).toMatchObject({ ok: true, leading: false, price: 30_250 });
    const bids = await db.bid.findMany({ where: { auctionId: a.id }, orderBy: { createdAt: "asc" } });
    expect(bids.map((b) => [b.userId, b.amount, b.auto])).toEqual([
      [bidders[0], 10_000, false],
      [bidders[1], 30_000, false],
      [bidders[0], 30_250, true],
    ]);
  });

  it("wyższy limit przejmuje prowadzenie", async () => {
    const a = await newAuction();
    await placeBid(a.id, bidders[0], 20_000);
    const r = await placeBid(a.id, bidders[1], 40_000);
    expect(r).toMatchObject({ ok: true, leading: true, price: 20_250 });
  });

  it("odrzuca ofertę sprzedawcy, ofertę za niską i podniesienie limitu w dół", async () => {
    const a = await newAuction();
    expect(await placeBid(a.id, seller, 20_000)).toMatchObject({ ok: false });
    expect(await placeBid(a.id, bidders[0], 9_999)).toMatchObject({ ok: false, error: "Minimalna oferta to 10000 zł" });
    await placeBid(a.id, bidders[0], 20_000);
    expect(await placeBid(a.id, bidders[0], 15_000)).toMatchObject({ ok: false });
    expect(await placeBid(a.id, bidders[1], 10_100)).toMatchObject({ ok: false, error: "Minimalna oferta to 10250 zł" });
  });

  it("prowadzący podnosi limit bez podnoszenia ceny", async () => {
    const a = await newAuction();
    await placeBid(a.id, bidders[0], 20_000);
    const r = await placeBid(a.id, bidders[0], 90_000);
    expect(r).toMatchObject({ ok: true, leading: true, price: 10_000 });
    const after = await db.auction.findUniqueOrThrow({ where: { id: a.id } });
    expect(after.bidCount).toBe(1);
  });

  it("dogrywka przedłuża aukcję przy ofercie w ostatnich 2 minutach", async () => {
    const a = await newAuction({ endsInMs: 60_000 });
    const before = Date.now();
    const r = await placeBid(a.id, bidders[0], 10_000);
    expect(r.ok).toBe(true);
    const after = await db.auction.findUniqueOrThrow({ where: { id: a.id } });
    expect(after.endsAt.getTime()).toBeGreaterThanOrEqual(before + 119_000);
    expect(after.originalEndsAt.getTime()).toBe(a.endsAt.getTime());
  });

  it("nie przyjmuje ofert po czasie i zamyka aukcję ze zwycięzcą", async () => {
    const a = await newAuction();
    await placeBid(a.id, bidders[0], 15_000);
    await placeBid(a.id, bidders[1], 12_000);
    await db.auction.update({ where: { id: a.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    expect(await placeBid(a.id, bidders[2], 99_000)).toMatchObject({ ok: false, error: "Aukcja jest już zakończona" });
    await finalizeEndedAuctions(a.id);
    const done = await db.auction.findUniqueOrThrow({ where: { id: a.id }, include: { listing: true } });
    expect(done).toMatchObject({ status: "ENDED", winnerId: bidders[0], finalPrice: 12_250 });
    expect(done.listing.status).toBe("SOLD");
    // ponowne zamknięcie niczego nie zmienia
    await finalizeEndedAuctions(a.id);
    expect((await db.auction.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("ENDED");
  });

  it("bez osiągnięcia ceny minimalnej aukcja kończy się bez sprzedaży", async () => {
    const a = await newAuction({ reserve: 50_000 });
    await placeBid(a.id, bidders[0], 40_000);
    await db.auction.update({ where: { id: a.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    await finalizeEndedAuctions(a.id);
    const done = await db.auction.findUniqueOrThrow({ where: { id: a.id }, include: { listing: true } });
    expect(done).toMatchObject({ status: "ENDED", winnerId: null, finalPrice: null });
    expect(done.listing.status).toBe("ARCHIVED");
  });

  it("równoczesne oferty nie psują stanu aukcji", async () => {
    const a = await newAuction();
    const amounts = bidders.map((_, i) => 10_000 + i * 3_700);
    const results = await Promise.all(bidders.map((u, i) => placeBid(a.id, u, amounts[i])));
    expect(results.every((r) => r.ok || /Minimalna oferta/.test(r.error))).toBe(true);

    const after = await db.auction.findUniqueOrThrow({ where: { id: a.id }, include: { listing: true } });
    const proxies = await db.proxyBid.findMany({ where: { auctionId: a.id } });
    const expected = resolveProxies(proxies, a.startPrice, null)!;
    expect(after.currentPrice).toBe(expected.price);
    expect(after.leaderId).toBe(expected.leaderId);
    expect(after.listing.priceNet).toBe(after.currentPrice);
    expect(await db.bid.count({ where: { auctionId: a.id } })).toBe(after.bidCount);
    // najwyższy zaakceptowany limit prowadzi
    const top = proxies.reduce((m, p) => (p.maxAmount > m.maxAmount ? p : m));
    expect(after.leaderId).toBe(top.userId);
  });
});

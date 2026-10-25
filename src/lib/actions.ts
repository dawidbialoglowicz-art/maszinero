"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { createSession, currentUser, destroySession } from "./session";
import { CATEGORIES, CONDITIONS, VOIVODESHIPS } from "./catalog";
import { deleteImages, MAX_IMAGES, saveImage } from "./storage";
import { isListingBlobUrl, normalizeNip, normalizePhone, parseAmount, parseIntParam, safeNext } from "./parse";
import { qualifiesForScrap, SCRAP_MAX_PLN_PER_KG } from "./scrap";
import { AUCTION_DURATIONS_DAYS } from "./auction-rules";
import { placeBid } from "./auctions";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

function echo(fd: FormData) {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$") && k !== "password") out[k] = v;
  });
  return out;
}

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// ---------- konta ----------

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;
// hash porównywany, gdy konto nie istnieje, żeby czas odpowiedzi nie zdradzał, które e-maile są w bazie
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("konto-nie-istnieje", 12));

const registerSchema = z.object({
  name: z.string().trim().min(2, "Podaj imię i nazwisko").max(80),
  email: z.email("Nieprawidłowy adres e-mail").max(254).transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków").max(200, "Hasło jest za długie"),
  accountType: z.enum(["PRIVATE", "COMPANY"], "Wybierz rodzaj konta"),
});

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), accountType: fd.get("accountType"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: echo(fd) };
  const d = parsed.data;

  const phoneRaw = str(fd, "phone");
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Nieprawidłowy numer telefonu", fields: echo(fd) };

  let companyName: string | null = null;
  let nip: string | null = null;
  if (d.accountType === "COMPANY") {
    companyName = str(fd, "companyName").slice(0, 120);
    nip = normalizeNip(str(fd, "nip"));
    if (companyName.length < 2) return { error: "Podaj nazwę firmy", fields: echo(fd) };
    if (!nip) return { error: "Nieprawidłowy NIP (sprawdź 10 cyfr)", fields: echo(fd) };
  }

  try {
    const user = await db.user.create({
      data: { name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 12), phone, accountType: d.accountType, companyName, nip },
    });
    await createSession(user.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Konto z tym adresem e-mail już istnieje", fields: echo(fd) };
    }
    throw e;
  }
  redirect(safeNext(fd.get("next")));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase().slice(0, 254);
  const password = String(fd.get("password") ?? "").slice(0, 200);
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const fails = await db.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } });
  if (fails >= LOGIN_MAX_FAILS) {
    return { error: "Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.", fields: { email } };
  }
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  await db.loginAttempt.create({ data: { email, success: Boolean(user && ok) } });
  if (!user || !ok) return { error: "Nieprawidłowy e-mail lub hasło", fields: { email } };
  await createSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------- ogłoszenia ----------

const year = new Date().getFullYear();

const listingSchema = z.object({
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]], "Wybierz kategorię"),
  brand: z.string().trim().min(1, "Podaj producenta").max(60),
  model: z.string().trim().min(1, "Podaj model").max(80),
  year: z.coerce.number("Podaj rok produkcji").int("Nieprawidłowy rok").min(1900, "Nieprawidłowy rok").max(year + 1, "Nieprawidłowy rok"),
  condition: z.enum(Object.keys(CONDITIONS) as [keyof typeof CONDITIONS, ...(keyof typeof CONDITIONS)[]], "Wybierz stan maszyny"),
  keyParam: z.string().trim().max(60).optional(),
  controlSystem: z.string().trim().max(60).optional(),
  voivodeship: z.enum(VOIVODESHIPS, "Wybierz województwo"),
  city: z.string().trim().min(2, "Podaj miejscowość").max(60),
  serialNumber: z.string().trim().max(40).optional(),
  description: z.string().trim().min(30, "Opis musi mieć co najmniej 30 znaków").max(8000, "Opis jest za długi"),
  saleType: z.enum(["FIXED", "AUCTION"]),
});

export async function createListing(_: FormState, fd: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/logowanie?next=/dodaj");
  const fail = (error: string) => ({ error, fields: echo(fd) });

  const parsed = listingSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  const hoursRaw = str(fd, "hours");
  const hours = hoursRaw ? parseIntParam(hoursRaw, 1_000_000) : null;
  if (hours === undefined) return fail("Godziny pracy podaj jako liczbę");
  const weightRaw = str(fd, "weightKg");
  const weightKg = weightRaw ? parseIntParam(weightRaw, 1_000_000) : null;
  if (weightKg === undefined || weightKg === 0) return fail("Masę maszyny podaj w kilogramach");

  const isAuction = d.saleType === "AUCTION";
  const price = parseAmount(str(fd, isAuction ? "startPrice" : "priceNet"));
  if (price === undefined || price < 1) return fail(isAuction ? "Podaj cenę wywoławczą" : "Podaj cenę");
  if (price > 100_000_000) return fail("Cena jest za wysoka");

  let reservePrice: number | null = null;
  let durationDays = 7;
  if (isAuction) {
    const reserveRaw = str(fd, "reservePrice");
    if (reserveRaw) {
      const r = parseAmount(reserveRaw);
      if (r === undefined) return fail("Nieprawidłowa cena minimalna");
      if (r <= price) return fail("Cena minimalna musi być wyższa od wywoławczej (albo zostaw ją pustą)");
      reservePrice = r;
    }
    durationDays = Number(str(fd, "durationDays"));
    if (!(AUCTION_DURATIONS_DAYS as readonly number[]).includes(durationDays)) return fail("Wybierz czas trwania aukcji");
  }

  const wantsScrap = fd.get("scrapPrice") === "on";
  if (wantsScrap && !weightKg) return fail("Do działu „Maszyny w cenie złomu” podaj masę maszyny");
  if (wantsScrap && !isAuction && !qualifiesForScrap(price, weightKg)) {
    return fail(`Do działu „Maszyny w cenie złomu” cena może wynosić najwyżej ${SCRAP_MAX_PLN_PER_KG} zł/kg`);
  }
  if (wantsScrap && isAuction && !qualifiesForScrap(price, weightKg)) {
    return fail(`Przy aukcji w cenie złomu cena wywoławcza może wynosić najwyżej ${SCRAP_MAX_PLN_PER_KG} zł/kg`);
  }

  // zdjęcia: adresy z Vercel Blob (wgrane przez przeglądarkę) albo pliki w formularzu (tryb lokalny)
  const urls = fd.getAll("imageUrls").filter((v): v is string => typeof v === "string" && v !== "");
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (urls.length + files.length > MAX_IMAGES) return fail(`Maksymalnie ${MAX_IMAGES} zdjęć`);
  if (urls.some((u) => !isListingBlobUrl(u))) return fail("Nieprawidłowy adres zdjęcia");
  const saved: string[] = [];
  for (const f of files) {
    const url = await saveImage(f);
    if (!url) {
      await deleteImages(saved);
      return fail(`Plik ${f.name}: dozwolone zdjęcia JPG, PNG lub WebP do 8 MB`);
    }
    saved.push(url);
  }
  const imageUrls = [...urls, ...saved];

  const now = new Date();
  const endsAt = new Date(now.getTime() + durationDays * 86_400_000);
  const listing = await db.listing.create({
    data: {
      title: `${d.brand} ${d.model}`,
      category: d.category,
      brand: d.brand,
      model: d.model,
      year: d.year,
      hours,
      condition: d.condition,
      weightKg,
      keyParam: d.keyParam || null,
      controlSystem: d.controlSystem || null,
      serialNumber: d.serialNumber || null,
      priceNet: price,
      vatInvoice: fd.get("vatInvoice") === "on",
      saleType: d.saleType,
      scrapPrice: wantsScrap,
      voivodeship: d.voivodeship,
      city: d.city,
      description: d.description,
      userId: user.id,
      images: { create: imageUrls.map((url, position) => ({ url, position })) },
      ...(isAuction && {
        auction: { create: { startPrice: price, currentPrice: price, reservePrice, endsAt, originalEndsAt: endsAt } },
      }),
    },
  });
  revalidatePath("/");
  redirect(`/ogloszenia/${listing.id}?dodano=1`);
}

const idSchema = z.string().min(1).max(40);
const statusSchema = z.enum(["ACTIVE", "SOLD", "ARCHIVED"]);

export async function setListingStatus(id: string, status: "ACTIVE" | "SOLD" | "ARCHIVED"): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/logowanie");
  if (!idSchema.safeParse(id).success || !statusSchema.safeParse(status).success) return { error: "Nieprawidłowe dane" };
  const l = await db.listing.findFirst({ where: { id, userId: user.id }, include: { auction: true } });
  if (!l) return { error: "Nie znaleziono ogłoszenia" };
  if (l.auction) {
    // aukcji z ofertami nie można przerwać, a zakończonej nie da się wznowić
    if (l.auction.status === "LIVE" && l.auction.bidCount > 0) return { error: "Aukcji z ofertami nie można przerwać" };
    if (l.auction.status !== "LIVE" || status === "ACTIVE") return { error: "Zakończonej aukcji nie można wznowić. Wystaw ją ponownie." };
    await db.auction.update({ where: { id: l.auction.id }, data: { status: "CANCELLED" } });
  }
  await db.listing.update({ where: { id }, data: { status } });
  revalidatePath("/moje");
  revalidatePath(`/ogloszenia/${id}`);
  return {};
}

export async function deleteListing(id: string): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/logowanie");
  if (!idSchema.safeParse(id).success) return { error: "Nieprawidłowe dane" };
  const l = await db.listing.findFirst({ where: { id, userId: user.id }, include: { images: true, auction: true } });
  if (!l) return { error: "Nie znaleziono ogłoszenia" };
  if (l.auction && l.auction.bidCount > 0) return { error: "Aukcji z ofertami nie można usunąć: kupujący muszą widzieć jej wynik" };
  await db.listing.delete({ where: { id } });
  await deleteImages(l.images.map((i) => i.url));
  revalidatePath("/moje");
  return {};
}

export async function toggleFavorite(listingId: string): Promise<{ ok: boolean; favorite?: boolean }> {
  const user = await currentUser();
  if (!user || !idSchema.safeParse(listingId).success) return { ok: false };
  const key = { userId_listingId: { userId: user.id, listingId } };
  try {
    const existing = await db.favorite.findUnique({ where: key });
    if (existing) await db.favorite.delete({ where: key });
    else await db.favorite.create({ data: { userId: user.id, listingId } });
    revalidatePath("/obserwowane");
    return { ok: true, favorite: !existing };
  } catch {
    // ogłoszenie usunięte w międzyczasie albo podwójne kliknięcie
    return { ok: true, favorite: false };
  }
}

/**
 * Kontakt do sprzedającego pobierany na żądanie, żeby numerów i e-maili nie dało się zebrać z kodu strony.
 * Po zakończonej aukcji kontakt dostaje tylko zwycięzca.
 */
export async function revealContact(listingId: string): Promise<{ phone: string | null; email: string } | null> {
  if (!idSchema.safeParse(listingId).success) return null;
  const l = await db.listing.findUnique({
    where: { id: listingId },
    select: { status: true, auction: { select: { winnerId: true } }, user: { select: { phone: true, email: true } } },
  });
  if (!l) return null;
  if (l.status !== "ACTIVE") {
    const me = await currentUser();
    if (!me || !l.auction?.winnerId || l.auction.winnerId !== me.id) return null;
  }
  return { phone: l.user.phone, email: l.user.email };
}

// ---------- aukcje ----------

export type BidState = { error?: string; ok?: string } | undefined;

export async function bid(_: BidState, fd: FormData): Promise<BidState> {
  const user = await currentUser();
  const auctionId = str(fd, "auctionId");
  const listingId = str(fd, "listingId");
  if (!user) redirect(`/logowanie?next=${encodeURIComponent(`/ogloszenia/${listingId}`)}`);
  if (!user.phone) return { error: "Aby licytować, uzupełnij numer telefonu w koncie (sprzedawca musi móc się z Tobą skontaktować)." };
  const amount = parseAmount(str(fd, "amount"));
  if (amount === undefined) return { error: "Podaj kwotę w złotych" };
  const r = await placeBid(auctionId, user.id, amount);
  revalidatePath(`/ogloszenia/${listingId}`);
  if (!r.ok) return { error: r.error };
  return { ok: r.leading ? "Prowadzisz w licytacji." : "Twoja oferta została od razu przebita przez wyższy limit innego licytującego." };
}

// ---------- konto ----------

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/logowanie?next=/konto");
  const name = str(fd, "name").slice(0, 80);
  if (name.length < 2) return { error: "Podaj imię i nazwisko", fields: echo(fd) };
  const phoneRaw = str(fd, "phone");
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Nieprawidłowy numer telefonu", fields: echo(fd) };
  await db.user.update({ where: { id: user.id }, data: { name, phone } });
  revalidatePath("/konto");
  return { fields: { ...echo(fd), saved: "1" } };
}

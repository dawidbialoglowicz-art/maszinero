"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { createSession, currentUser, destroySession } from "./session";
import { CATEGORIES, VOIVODESHIPS } from "./catalog";
import { isAllowedImage, saveImage } from "./storage";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

function echo(fd: FormData) {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$") && k !== "password") out[k] = v;
  });
  return out;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Podaj imię i nazwisko lub nazwę firmy"),
  email: z.email("Nieprawidłowy adres e-mail").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
  phone: z.string().trim().max(20).optional(),
  accountType: z.enum(["PRIVATE", "COMPANY"]),
  companyName: z.string().trim().max(120).optional(),
  nip: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .refine((s) => s === "" || /^\d{10}$/.test(s), "NIP musi mieć 10 cyfr")
    .optional(),
});

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: echo(fd) };
  const d = parsed.data;
  if (d.accountType === "COMPANY" && (!d.companyName || !d.nip)) {
    return { error: "Konto firmowe wymaga nazwy firmy i NIP", fields: echo(fd) };
  }
  if (await db.user.findUnique({ where: { email: d.email } })) {
    return { error: "Konto z tym adresem e-mail już istnieje", fields: echo(fd) };
  }
  const user = await db.user.create({
    data: {
      name: d.name,
      email: d.email,
      passwordHash: await bcrypt.hash(d.password, 12),
      phone: d.phone || null,
      accountType: d.accountType,
      companyName: d.accountType === "COMPANY" ? d.companyName : null,
      nip: d.accountType === "COMPANY" ? d.nip : null,
    },
  });
  await createSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Nieprawidłowy e-mail lub hasło", fields: { email } };
  }
  await createSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const year = new Date().getFullYear();
const optInt = z.preprocess(
  (v) => (typeof v === "string" && v.replace(/\D/g, "") !== "" ? Number(v.replace(/\D/g, "")) : undefined),
  z.number().int().nonnegative().optional(),
);

const listingSchema = z.object({
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]], "Wybierz kategorię"),
  brand: z.string().trim().min(1, "Podaj markę").max(60),
  model: z.string().trim().min(1, "Podaj model").max(80),
  year: z.coerce.number("Podaj rok produkcji").int().min(1950, "Nieprawidłowy rok").max(year + 1, "Nieprawidłowy rok"),
  hours: optInt,
  mileageKm: optInt,
  keyParam: z.string().trim().max(40).optional(),
  priceNet: z.preprocess(
    (v) => Number(String(v ?? "").replace(/\D/g, "")),
    z.number().int().min(100, "Podaj cenę").max(100_000_000, "Cena jest za wysoka"),
  ),
  vatInvoice: z.preprocess((v) => v === "on", z.boolean()),
  voivodeship: z.enum(VOIVODESHIPS, "Wybierz województwo"),
  city: z.string().trim().min(2, "Podaj miejscowość").max(60),
  serialNumber: z.string().trim().max(40).optional(),
  description: z.string().trim().min(30, "Opis musi mieć co najmniej 30 znaków").max(8000),
});

export async function createListing(_: FormState, fd: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/logowanie?next=/dodaj");
  const parsed = listingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: echo(fd) };

  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 20) return { error: "Maksymalnie 20 zdjęć", fields: echo(fd) };
  const bad = files.find((f) => !isAllowedImage(f));
  if (bad) return { error: `Plik ${bad.name}: dozwolone JPG, PNG lub WebP do 8 MB`, fields: echo(fd) };

  const urls = await Promise.all(files.map(saveImage));
  const d = parsed.data;
  const listing = await db.listing.create({
    data: {
      ...d,
      title: `${d.brand} ${d.model}`,
      keyParam: d.keyParam || null,
      serialNumber: d.serialNumber || null,
      userId: user.id,
      images: { create: urls.map((url, position) => ({ url, position })) },
    },
  });
  revalidatePath("/");
  redirect(`/ogloszenia/${listing.id}?dodano=1`);
}

export async function setListingStatus(id: string, status: "ACTIVE" | "SOLD" | "ARCHIVED") {
  const user = await currentUser();
  if (!user) redirect("/logowanie");
  await db.listing.updateMany({ where: { id, userId: user.id }, data: { status } });
  revalidatePath("/moje");
  revalidatePath(`/ogloszenia/${id}`);
}

export async function deleteListing(id: string) {
  const user = await currentUser();
  if (!user) redirect("/logowanie");
  await db.listing.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/moje");
}

export async function toggleFavorite(listingId: string): Promise<{ ok: boolean; favorite?: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  const key = { userId_listingId: { userId: user.id, listingId } };
  const existing = await db.favorite.findUnique({ where: key });
  if (existing) await db.favorite.delete({ where: key });
  else await db.favorite.create({ data: { userId: user.id, listingId } });
  revalidatePath("/obserwowane");
  return { ok: true, favorite: !existing };
}

import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { CATEGORIES, CONDITIONS, VOIVODESHIPS, type ConditionKey } from "./catalog";
import { parseAmount, parseIntParam } from "./parse";

export const PAGE_SIZE = 24;
const MAX_PAGE = 500;

export const SORTS = {
  new: { label: "Najnowsze", order: { createdAt: "desc" } },
  pa: { label: "Cena: od najniższej", order: { priceNet: "asc" } },
  pd: { label: "Cena: od najwyższej", order: { priceNet: "desc" } },
  y: { label: "Rok: najnowsze", order: { year: "desc" } },
  h: { label: "Najmniej godzin pracy", order: { hours: { sort: "asc", nulls: "last" } } },
  end: { label: "Aukcje: kończące się najwcześniej", order: { auction: { endsAt: "asc" } } },
} satisfies Record<string, { label: string; order: Prisma.ListingOrderByWithRelationInput }>;

export type SortKey = keyof typeof SORTS;
export type SaleFilter = "ogloszenia" | "aukcje";

export type Filters = {
  q?: string;
  kategoria?: string;
  woj?: string;
  typ?: SaleFilter;
  stan?: ConditionKey;
  zlom?: boolean;
  cenaOd?: number;
  cenaDo?: number;
  rokOd?: number;
  godzDo?: number;
  dealer?: boolean;
  vat?: boolean;
  sort: SortKey;
  strona: number;
};

type Params = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export function parseFilters(p: Params, defaultSort: SortKey = "new"): Filters {
  const kategoria = str(p.kategoria);
  const woj = str(p.woj);
  const typ = str(p.typ);
  const stan = str(p.stan);
  const sort = str(p.sort);
  return {
    q: str(p.q)?.slice(0, 100),
    kategoria: CATEGORIES.some((c) => c.id === kategoria) ? kategoria : undefined,
    woj: (VOIVODESHIPS as readonly string[]).includes(woj ?? "") ? woj : undefined,
    typ: typ === "ogloszenia" || typ === "aukcje" ? typ : undefined,
    stan: stan && stan in CONDITIONS ? (stan as ConditionKey) : undefined,
    zlom: str(p.zlom) === "1",
    cenaOd: parseAmount(str(p.cenaOd)),
    cenaDo: parseAmount(str(p.cenaDo)),
    rokOd: parseIntParam(str(p.rokOd), 2100),
    godzDo: parseIntParam(str(p.godzDo)),
    dealer: str(p.dealer) === "1",
    vat: str(p.vat) === "1",
    sort: sort && Object.hasOwn(SORTS, sort) ? (sort as SortKey) : defaultSort,
    strona: Math.min(MAX_PAGE, Math.max(1, parseIntParam(str(p.strona)) ?? 1)),
  };
}

export function filtersToQuery(f: Partial<Filters>, base = "/ogloszenia") {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === false || v === "") continue;
    if (k === "strona" && v === 1) continue;
    q.set(k, v === true ? "1" : String(v));
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

function where(f: Filters): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [{ status: "ACTIVE" }];
  if (f.kategoria) and.push({ category: f.kategoria });
  if (f.woj) and.push({ voivodeship: f.woj });
  if (f.typ) and.push({ saleType: f.typ === "aukcje" ? "AUCTION" : "FIXED" });
  if (f.typ === "aukcje" || f.sort === "end") and.push({ auction: { is: { status: "LIVE", endsAt: { gt: new Date() } } } });
  if (f.stan) and.push({ condition: f.stan });
  if (f.zlom) and.push({ scrapPrice: true });
  if (f.cenaOd !== undefined) and.push({ priceNet: { gte: f.cenaOd } });
  if (f.cenaDo !== undefined) and.push({ priceNet: { lte: f.cenaDo } });
  if (f.rokOd !== undefined) and.push({ year: { gte: f.rokOd } });
  if (f.godzDo !== undefined) and.push({ hours: { lte: f.godzDo } });
  if (f.dealer) and.push({ user: { verified: true } });
  if (f.vat) and.push({ vatInvoice: true });
  if (f.q) {
    for (const word of f.q.split(/\s+/).slice(0, 6)) {
      // "tokarka" ma trafić w kategorię "Tokarki", więc porównujemy rdzeń słowa z nazwami kategorii
      const stem = word.toLowerCase().slice(0, Math.max(3, word.length - 2));
      const cats = CATEGORIES.filter((c) => c.name.toLowerCase().includes(stem)).map((c) => c.id);
      and.push({
        OR: [
          ...(cats.length ? [{ category: { in: cats } }] : []),
          { title: { contains: word, mode: "insensitive" } },
          { brand: { contains: word, mode: "insensitive" } },
          { model: { contains: word, mode: "insensitive" } },
          { controlSystem: { contains: word, mode: "insensitive" } },
          { city: { contains: word, mode: "insensitive" } },
        ],
      });
    }
  }
  return { AND: and };
}

export const cardSelect = {
  id: true, title: true, category: true, year: true, hours: true, keyParam: true, controlSystem: true,
  priceNet: true, vatInvoice: true, city: true, voivodeship: true, createdAt: true,
  saleType: true, condition: true, weightKg: true, scrapPrice: true,
  user: { select: { verified: true } },
  images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
  auction: { select: { endsAt: true, bidCount: true, status: true, reservePrice: true, currentPrice: true } },
  _count: { select: { images: true } },
} satisfies Prisma.ListingSelect;

export type ListingCardData = Prisma.ListingGetPayload<{ select: typeof cardSelect }>;

export async function searchListings(f: Filters) {
  const w = where(f);
  const [items, total] = await Promise.all([
    db.listing.findMany({
      where: w,
      select: cardSelect,
      orderBy: [SORTS[f.sort].order, { id: "asc" }],
      skip: (f.strona - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.listing.count({ where: w }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function categoryCounts() {
  const rows = await db.listing.groupBy({ by: ["category"], where: { status: "ACTIVE" }, _count: true });
  return Object.fromEntries(rows.map((r) => [r.category, r._count]));
}

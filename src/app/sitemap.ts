import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "https://maszinero.pl";
  const listings = await db.listing.findMany({ where: { status: "ACTIVE" }, select: { id: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 45_000 });
  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/ogloszenia`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/aukcje`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/cena-zlomu`, changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIES.map((c) => ({ url: `${base}/ogloszenia?kategoria=${c.id}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...listings.map((l) => ({ url: `${base}/ogloszenia/${l.id}`, lastModified: l.updatedAt, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}

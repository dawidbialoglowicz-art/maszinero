import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "https://maszinero.pl";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/moje", "/konto", "/obserwowane", "/dodaj", "/logowanie", "/rejestracja"] },
    sitemap: `${base}/sitemap.xml`,
  };
}

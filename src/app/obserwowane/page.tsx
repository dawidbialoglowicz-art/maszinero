import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cardSelect } from "@/lib/listings";
import { ListingCard } from "@/components/ListingCard";

export const metadata: Metadata = { title: "Obserwowane" };

export default async function Page() {
  const user = await requireUser("/obserwowane");
  const favs = await db.favorite.findMany({
    where: { userId: user.id, listing: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    select: { listing: { select: cardSelect } },
  });
  return (
    <div className="wrap" style={{ paddingBottom: 48 }}>
      <div className="page-head"><h1>Obserwowane</h1></div>
      <div className="grid">
        {favs.length ? favs.map(({ listing }) => <ListingCard key={listing.id} l={listing} fav />) : (
          <div className="empty">Nie obserwujesz jeszcze żadnych maszyn. Kliknij serduszko przy ogłoszeniu. <Link className="link-btn" href="/ogloszenia">Przeglądaj ogłoszenia</Link></div>
        )}
      </div>
    </div>
  );
}

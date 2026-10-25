import type { Metadata } from "next";
import Link from "next/link";
import { filtersToQuery, parseFilters, searchListings } from "@/lib/listings";
import { categoryName } from "@/lib/catalog";
import { favoriteIds } from "@/lib/favorites";
import { num, plural } from "@/lib/format";
import { ListingCard } from "@/components/ListingCard";
import { FilterForm, SortSelect } from "@/components/FilterForm";

export const metadata: Metadata = { title: "Ogłoszenia maszyn" };

export default async function Listings({ searchParams }: PageProps<"/ogloszenia">) {
  const f = parseFilters(await searchParams);
  const [{ items, total, pages }, favs] = await Promise.all([searchListings(f), favoriteIds()]);
  const heading = `${num(total)} ${plural(total, "ogłoszenie", "ogłoszenia", "ogłoszeń")}${f.kategoria ? ` · ${categoryName(f.kategoria)}` : ""}${f.q ? ` · „${f.q}”` : ""}`;

  return (
    <div className="wrap market">
      <FilterForm key={JSON.stringify(f)} f={f} />
      <div className="results">
        <div className="bar">
          <h1>{heading}</h1>
          <SortSelect key={f.sort} value={f.sort} />
        </div>
        <div className="grid">
          {items.length ? items.map((l) => <ListingCard key={l.id} l={l} fav={favs.has(l.id)} />) : (
            <div className="empty">Brak ogłoszeń dla tych filtrów. <Link className="link-btn" href="/ogloszenia">Wyczyść filtry</Link></div>
          )}
        </div>
        {pages > 1 && (
          <nav className="pager" aria-label="Strony">
            {Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - f.strona) <= 2).map((p) =>
              p === f.strona ? <span key={p} className="on" aria-current="page">{p}</span>
                : <Link key={p} href={`/ogloszenia${filtersToQuery({ ...f, strona: p })}`}>{p}</Link>,
            )}
          </nav>
        )}
      </div>
    </div>
  );
}

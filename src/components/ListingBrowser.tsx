import Link from "next/link";
import { filtersToQuery, parseFilters, searchListings, SORTS, type SortKey } from "@/lib/listings";
import { categoryName } from "@/lib/catalog";
import { favoriteIds } from "@/lib/favorites";
import { finalizeEndedAuctions } from "@/lib/auctions";
import { num, plural } from "@/lib/format";
import { ListingCard } from "./ListingCard";
import { FilterForm, SortSelect, type Fixed } from "./FilterForm";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
  base: string;
  fixed?: Fixed;
  defaultSort?: SortKey;
  sorts?: SortKey[];
  intro?: React.ReactNode;
  empty?: React.ReactNode;
};

/** Wspólna lista z filtrami dla działów: wszystkie ogłoszenia, aukcje i maszyny w cenie złomu. */
export async function ListingBrowser({ searchParams, base, fixed = {}, defaultSort = "new", sorts, intro, empty }: Props) {
  await finalizeEndedAuctions();
  const f = { ...parseFilters(searchParams, defaultSort), ...fixed };
  const [{ items, total, pages }, favs] = await Promise.all([searchListings(f), favoriteIds()]);
  const heading = `${num(total)} ${plural(total, "maszyna", "maszyny", "maszyn")}${f.kategoria ? ` · ${categoryName(f.kategoria)}` : ""}${f.q ? ` · „${f.q}”` : ""}`;
  const sortKeys = sorts ?? (Object.keys(SORTS) as SortKey[]).filter((k) => k !== "end" || f.typ === "aukcje");
  const linkFilters = { ...f, typ: fixed.typ ? undefined : f.typ, zlom: fixed.zlom ? undefined : f.zlom };

  return (
    <>
      {intro}
      <div className="wrap market">
        <FilterForm key={JSON.stringify(f)} f={f} base={base} fixed={fixed} />
        <div className="results">
          <div className="bar">
            <h2>{heading}</h2>
            <SortSelect key={f.sort} value={f.sort} base={base} options={sortKeys.map((k) => [k, SORTS[k].label])} />
          </div>
          <div className="grid">
            {items.length ? items.map((l) => <ListingCard key={l.id} l={l} fav={favs.has(l.id)} />) : (
              <div className="empty">{empty ?? <>Brak maszyn dla tych filtrów. <Link className="link-btn" href={base}>Wyczyść filtry</Link></>}</div>
            )}
          </div>
          {pages > 1 && (
            <nav className="pager" aria-label="Strony">
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pages || Math.abs(p - f.strona) <= 2)
                .map((p) => p === f.strona
                  ? <span key={p} className="on" aria-current="page">{p}</span>
                  : <Link key={p} href={filtersToQuery({ ...linkFilters, strona: p }, base)}>{p}</Link>)}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}

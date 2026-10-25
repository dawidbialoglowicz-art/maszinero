import Link from "next/link";
import type { ListingCardData } from "@/lib/listings";
import { categoryName } from "@/lib/catalog";
import { ago, isFresh, leaseRate, num, pln } from "@/lib/format";
import { MachineIcon } from "./Icons";
import { FavButton } from "./FavButton";

export function ListingCard({ l, fav }: { l: ListingCardData; fav: boolean }) {
  const fresh = isFresh(l.createdAt);
  const img = l.images[0]?.url;
  return (
    <article className="card">
      <Link className="cover" href={`/ogloszenia/${l.id}`} aria-label={l.title} />
      <div className="ph">
        {img ? <img src={img} alt="" loading="lazy" /> : <MachineIcon category={l.category} />}
        <div className="tags">
          {fresh && <span className="tag new">Nowe</span>}
          {l.user.verified && <span className="tag ok">✓ Dealer</span>}
        </div>
        <FavButton id={l.id} initial={fav} />
        {l._count.images > 0 && <span className="photos">{l._count.images} zdj.</span>}
      </div>
      <div className="body">
        <span className="cat-l">{categoryName(l.category)}</span>
        <h3>{l.title}</h3>
        <dl className="specs">
          <div><dt>Rok</dt><dd>{l.year}</dd></div>
          {l.mileageKm != null ? (
            <div><dt>Przebieg</dt><dd>{num(l.mileageKm)} km</dd></div>
          ) : (
            <div><dt>Motogodz.</dt><dd>{l.hours != null ? `${num(l.hours)} mth` : "—"}</dd></div>
          )}
          <div><dt>Parametr</dt><dd>{l.keyParam || "—"}</dd></div>
        </dl>
        <div className="price">
          <div><strong>{pln(l.priceNet)}</strong><small>{l.vatInvoice ? "netto + 23% VAT" : "brutto, bez faktury"}</small></div>
          <div className="lease">leasing od<br /><b>{num(leaseRate(l.priceNet))} zł</b>/mies.</div>
        </div>
        <div className="loc"><span>{l.city}, {l.voivodeship}</span><span>{ago(l.createdAt)}</span></div>
      </div>
    </article>
  );
}

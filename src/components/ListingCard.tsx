import Link from "next/link";
import type { ListingCardData } from "@/lib/listings";
import { categoryName, CONDITIONS } from "@/lib/catalog";
import { ago, isFresh, leaseRate, num, plural, pln } from "@/lib/format";
import { formatPerKg, pricePerKg } from "@/lib/scrap";
import { MachineIcon } from "./Icons";
import { FavButton } from "./FavButton";
import { Countdown } from "./Countdown";

export function ListingCard({ l, fav }: { l: ListingCardData; fav: boolean }) {
  const img = l.images[0]?.url;
  const a = l.saleType === "AUCTION" ? l.auction : null;
  const perKg = pricePerKg(l.priceNet, l.weightKg);
  return (
    <article className="card">
      <Link className="cover" href={`/ogloszenia/${l.id}`} aria-label={l.title} />
      <div className="ph">
        {img ? <img src={img} alt="" loading="lazy" /> : <MachineIcon category={l.category} />}
        <div className="tags">
          {a && <span className="tag auc">Aukcja</span>}
          {l.scrapPrice && <span className="tag scrap">Cena złomu</span>}
          {!a && !l.scrapPrice && isFresh(l.createdAt) && <span className="tag new">Nowe</span>}
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
          {l.scrapPrice && l.weightKg ? (
            <div><dt>Masa</dt><dd>{num(l.weightKg)} kg</dd></div>
          ) : (
            <div><dt>Godz. pracy</dt><dd>{l.hours != null ? `${num(l.hours)} h` : "—"}</dd></div>
          )}
          <div><dt>{l.controlSystem ? "Sterowanie" : "Parametr"}</dt><dd>{l.controlSystem || l.keyParam || "—"}</dd></div>
        </dl>
        {l.condition !== "WORKING" && <span className="cond">{CONDITIONS[l.condition]}</span>}
        <div className="price">
          <div>
            {a && <small>{a.bidCount > 0 ? `aktualna oferta · ${a.bidCount} ${plural(a.bidCount, "oferta", "oferty", "ofert")}` : "cena wywoławcza"}</small>}
            <strong>{pln(l.priceNet)}</strong>
            <small>{l.vatInvoice ? "netto + 23% VAT" : "brutto, bez faktury"}</small>
          </div>
          {a ? (
            <div className="lease">do końca<br /><b><Countdown endsAt={a.endsAt.toISOString()} /></b></div>
          ) : l.scrapPrice && perKg !== null ? (
            <div className="lease">cena za kg<br /><b>{formatPerKg(perKg)}</b></div>
          ) : (
            <div className="lease">leasing od<br /><b>{num(leaseRate(l.priceNet))} zł</b>/mies.</div>
          )}
        </div>
        <div className="loc"><span>{l.city}, {l.voivodeship}</span><span>{ago(l.createdAt)}</span></div>
      </div>
    </article>
  );
}

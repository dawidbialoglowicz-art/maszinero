import Link from "next/link";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/catalog";
import { cardSelect, categoryCounts } from "@/lib/listings";
import { favoriteIds } from "@/lib/favorites";
import { finalizeEndedAuctions } from "@/lib/auctions";
import { SCRAP_MAX_PLN_PER_KG } from "@/lib/scrap";
import { num } from "@/lib/format";
import { ListingCard } from "@/components/ListingCard";
import { MachineIcon } from "@/components/Icons";
import { CategoryOptions, VoivodeshipOptions } from "@/components/Selects";

export const dynamic = "force-dynamic";

export default async function Home() {
  await finalizeEndedAuctions();
  const now = new Date();
  const [auctions, scrap, latest, counts, total, liveAuctions, scrapCount, favs] = await Promise.all([
    db.listing.findMany({ where: { status: "ACTIVE", saleType: "AUCTION", auction: { is: { status: "LIVE", endsAt: { gt: now } } } }, select: cardSelect, orderBy: { auction: { endsAt: "asc" } }, take: 4 }),
    db.listing.findMany({ where: { status: "ACTIVE", scrapPrice: true }, select: cardSelect, orderBy: { createdAt: "desc" }, take: 4 }),
    db.listing.findMany({ where: { status: "ACTIVE", saleType: "FIXED", scrapPrice: false }, select: cardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    categoryCounts(),
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.auction.count({ where: { status: "LIVE", endsAt: { gt: now }, listing: { status: "ACTIVE" } } }),
    db.listing.count({ where: { status: "ACTIVE", scrapPrice: true } }),
    favoriteIds(),
  ]);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Maszyny przemysłowe. Kupuj, licytuj, <em>odzyskuj wartość</em>.</h1>
          <p className="lead">Obrabiarki CNC, prasy, lasery, wtryskarki i wyposażenie hal od zakładów produkcyjnych i dealerów z całej Polski. Ceny netto z fakturą VAT, godziny pracy i sterowanie w każdym ogłoszeniu.</p>
          <form className="console" action="/ogloszenia" role="search">
            <div className="field"><label htmlFor="q">Czego szukasz?</label><input id="q" name="q" placeholder="np. tokarka Fanuc, Trumpf, prasa 100 t" /></div>
            <div className="field"><label htmlFor="kategoria">Kategoria</label><select id="kategoria" name="kategoria"><CategoryOptions /></select></div>
            <div className="field"><label htmlFor="woj">Województwo</label><select id="woj" name="woj"><VoivodeshipOptions /></select></div>
            <div className="field"><label htmlFor="typ">Sposób sprzedaży</label><select id="typ" name="typ"><option value="">Wszystkie</option><option value="ogloszenia">Cena stała</option><option value="aukcje">Aukcje</option></select></div>
            <button className="btn btn-signal" type="submit">Szukaj</button>
          </form>
          <div className="pillars">
            <Link href="/ogloszenia" className="pillar"><b>Maszyny na sprzedaż</b><span className="mono">{num(total)} aktywnych</span></Link>
            <Link href="/aukcje" className="pillar"><b>Aukcje</b><span className="mono">{num(liveAuctions)} trwa teraz</span></Link>
            <Link href="/cena-zlomu" className="pillar hot"><b>Maszyny w cenie złomu</b><span className="mono">{num(scrapCount)} · do {SCRAP_MAX_PLN_PER_KG} zł/kg</span></Link>
          </div>
        </div>
      </section>

      <section className="wrap cats">
        <div className="sec-head"><h2>Kategorie</h2><Link href="/ogloszenia">Wszystkie maszyny →</Link></div>
        <div className="cat-grid">
          {CATEGORIES.map((c) => (
            <Link key={c.id} className="cat" href={`/ogloszenia?kategoria=${c.id}`}>
              <MachineIcon category={c.id} />
              <b>{c.name}</b>
              <small>{num(counts[c.id] ?? 0)}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap strip">
        <div className="sec-head"><h2>Aukcje kończące się najwcześniej</h2><Link href="/aukcje">Wszystkie aukcje →</Link></div>
        <div className="grid">
          {auctions.length ? auctions.map((l) => <ListingCard key={l.id} l={l} fav={favs.has(l.id)} />) : (
            <div className="empty">Teraz nie trwa żadna aukcja. <Link className="link-btn" href="/dodaj">Wystaw maszynę na aukcję</Link></div>
          )}
        </div>
      </section>

      <section className="scrap-home">
        <div className="wrap strip">
          <div className="sec-head">
            <div>
              <h2>Maszyny w cenie złomu</h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>Najwyżej {SCRAP_MAX_PLN_PER_KG} zł za kilogram masy. Sprawdzamy to przy każdym ogłoszeniu.</p>
            </div>
            <Link href="/cena-zlomu">Cały dział →</Link>
          </div>
          <div className="grid">
            {scrap.length ? scrap.map((l) => <ListingCard key={l.id} l={l} fav={favs.has(l.id)} />) : (
              <div className="empty">Brak maszyn w tym dziale. <Link className="link-btn" href="/dodaj">Dodaj pierwszą</Link></div>
            )}
          </div>
        </div>
      </section>

      <section className="wrap strip">
        <div className="sec-head"><h2>Najnowsze ogłoszenia</h2><Link href="/ogloszenia">Zobacz wszystkie →</Link></div>
        <div className="grid">
          {latest.length ? latest.map((l) => <ListingCard key={l.id} l={l} fav={favs.has(l.id)} />) : (
            <div className="empty">Nie ma jeszcze ogłoszeń. <Link className="link-btn" href="/dodaj">Dodaj pierwsze</Link></div>
          )}
        </div>
      </section>

      <section className="trust">
        <div className="wrap">
          <div><span className="k">NIP · KRS · CEIDG</span><h3>Zweryfikowani sprzedawcy</h3><p>Firmy sprawdzamy w rejestrach, zanim dostaną oznaczenie dealera. NIP sprawdzamy już przy rejestracji.</p></div>
          <div><span className="k">auto-licytacja</span><h3>Uczciwe aukcje</h3><p>Licytacja do limitu, cena minimalna i dogrywka 2 minuty po ofercie złożonej w ostatniej chwili.</p></div>
          <div><span className="k">zł / kg</span><h3>Cena złomu to obietnica</h3><p>Do działu złomu trafia tylko maszyna z ceną najwyżej {SCRAP_MAX_PLN_PER_KG} zł za kilogram masy.</p></div>
          <div><span className="k">CE · DTR · UDT</span><h3>Dane, które się liczą</h3><p>Godziny pracy, sterowanie, masa i numer seryjny w ogłoszeniu. Kontakt do sprzedawcy po kliknięciu.</p></div>
        </div>
      </section>

      <section className="sell" id="cennik">
        <div className="wrap">
          <div>
            <h2>Sprzedajesz maszyny z zakładu? Dotrzyj do kupujących z całej Polski.</h2>
            <p>Wystaw maszynę z ceną stałą albo na aukcji. Konto firmowe pokazuje nazwę firmy i NIP, a po weryfikacji dostajesz oznaczenie dealera.</p>
            <Link className="btn btn-signal" href="/dodaj">Sprzedaj maszynę</Link>
          </div>
          <div className="plans">
            <div className="plan"><h3>Start</h3><strong className="mono">0 zł</strong><small>w okresie startowym</small><ul><li>ogłoszenia i aukcje</li><li>do 20 zdjęć</li></ul></div>
            <div className="plan hl"><h3>Firma</h3><strong className="mono">149 zł</strong><small>netto / mies. (wkrótce)</small><ul><li>wyróżnienia</li><li>statystyki</li><li>oznaczenie dealera</li></ul></div>
            <div className="plan"><h3>Dealer</h3><strong className="mono">499 zł</strong><small>netto / mies. (wkrótce)</small><ul><li>bez limitu</li><li>import CSV/XML</li><li>wizytówka firmy</li></ul></div>
          </div>
        </div>
      </section>
    </>
  );
}

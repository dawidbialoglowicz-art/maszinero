import Link from "next/link";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/catalog";
import { cardSelect, categoryCounts } from "@/lib/listings";
import { favoriteIds } from "@/lib/favorites";
import { num } from "@/lib/format";
import { ListingCard } from "@/components/ListingCard";
import { MachineIcon } from "@/components/Icons";
import { CategoryOptions, VoivodeshipOptions } from "@/components/Selects";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [latest, counts, total, dealers, favs] = await Promise.all([
    db.listing.findMany({ where: { status: "ACTIVE" }, select: cardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    categoryCounts(),
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { verified: true } }),
    favoriteIds(),
  ]);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Maszyny budowlane, rolnicze i przemysłowe. <em>Sprawdzone</em> przed sprzedażą.</h1>
          <p className="lead">Ogłoszenia od zweryfikowanych dealerów i firm z całej Polski. Ceny netto z fakturą VAT, motogodziny z licznika i numer seryjny w ogłoszeniu.</p>
          <form className="console" action="/ogloszenia" role="search">
            <div className="field"><label htmlFor="q">Czego szukasz?</label><input id="q" name="q" placeholder="np. koparka CAT 320, JCB 3CX, Claas" /></div>
            <div className="field"><label htmlFor="kategoria">Kategoria</label><select id="kategoria" name="kategoria"><CategoryOptions /></select></div>
            <div className="field"><label htmlFor="woj">Województwo</label><select id="woj" name="woj"><VoivodeshipOptions /></select></div>
            <div className="field"><label htmlFor="cenaDo">Cena do (zł netto)</label><input id="cenaDo" name="cenaDo" className="mono" inputMode="numeric" placeholder="bez limitu" /></div>
            <button className="btn btn-signal" type="submit">Szukaj</button>
          </form>
          <div className="stats">
            <div><strong className="mono">{num(total)}</strong>aktywnych ogłoszeń</div>
            <div><strong className="mono">{num(dealers)}</strong>zweryfikowanych dealerów</div>
            <div><strong className="mono">16</strong>województw</div>
          </div>
        </div>
      </section>

      <section className="wrap cats">
        <div className="sec-head"><h2>Kategorie</h2><Link href="/ogloszenia">Wszystkie ogłoszenia →</Link></div>
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

      <section className="wrap" style={{ paddingBlock: "24px 48px" }}>
        <div className="sec-head"><h2>Najnowsze ogłoszenia</h2><Link href="/ogloszenia">Zobacz wszystkie →</Link></div>
        <div className="grid">
          {latest.length ? latest.map((l) => <ListingCard key={l.id} l={l} fav={favs.has(l.id)} />) : (
            <div className="empty">Nie ma jeszcze ogłoszeń. <Link className="link-btn" href="/dodaj">Dodaj pierwsze</Link></div>
          )}
        </div>
      </section>

      <section className="trust">
        <div className="wrap">
          <div><span className="k">NIP · KRS · CEIDG</span><h3>Zweryfikowani sprzedawcy</h3><p>Każdą firmę sprawdzamy w rejestrach, zanim dostanie oznaczenie dealera.</p></div>
          <div><span className="k">PIN / VIN</span><h3>Numer seryjny w ogłoszeniu</h3><p>Sprzedający podaje numer seryjny, który możesz sprawdzić przed zakupem.</p></div>
          <div><span className="k">48 mies.</span><h3>Orientacyjna rata leasingu</h3><p>Przy każdym ogłoszeniu widzisz szacunkową ratę, żeby szybciej porównać oferty.</p></div>
          <div><span className="k">UDT · CE</span><h3>Dokumenty w porządku</h3><p>Opis maszyny zawiera informacje o dozorze technicznym i deklaracji zgodności.</p></div>
        </div>
      </section>

      <section className="sell" id="cennik">
        <div className="wrap">
          <div>
            <h2>Sprzedajesz maszyny? Dotrzyj do kupujących z całej Polski.</h2>
            <p>Ogłoszenie dodasz w kilka minut. Konto firmowe pokazuje nazwę firmy i NIP, a po weryfikacji dostajesz oznaczenie dealera.</p>
            <Link className="btn btn-signal" href="/dodaj">Dodaj ogłoszenie</Link>
          </div>
          <div className="plans">
            <div className="plan"><h3>Prywatnie</h3><strong className="mono">0 zł</strong><small>1 ogłoszenie / 30 dni</small><ul><li>do 20 zdjęć</li><li>kontakt telefoniczny</li></ul></div>
            <div className="plan hl"><h3>Firma</h3><strong className="mono">149 zł</strong><small>netto / mies.</small><ul><li>do 20 ogłoszeń</li><li>oznaczenie VAT</li><li>wyróżnienia</li></ul></div>
            <div className="plan"><h3>Dealer</h3><strong className="mono">499 zł</strong><small>netto / mies.</small><ul><li>bez limitu</li><li>import CSV/XML</li><li>wizytówka firmy</li></ul></div>
          </div>
        </div>
      </section>
    </>
  );
}

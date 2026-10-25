import Link from "next/link";
import { currentUser } from "@/lib/session";
import { logout } from "@/lib/actions";

export function Logo() {
  return <><span>MASZIN<b>ERO</b></span><small>.pl</small></>;
}

export async function Header() {
  const user = await currentUser();
  return (
    <header className="top">
      <div className="wrap">
        <Link className="logo" href="/"><Logo /></Link>
        <nav className="nav" aria-label="Główna nawigacja">
          <Link href="/ogloszenia">Kup maszynę</Link>
          <Link href="/dodaj">Sprzedaj</Link>
          {user && <Link href="/moje">Moje ogłoszenia</Link>}
          {user && <Link href="/obserwowane">Obserwowane</Link>}
        </nav>
        <div className="act">
          {user ? (
            <form action={logout}>
              <button className="btn btn-ghost" type="submit">Wyloguj</button>
            </form>
          ) : (
            <Link className="btn btn-ghost" href="/logowanie">Zaloguj</Link>
          )}
          <Link className="btn btn-signal" href="/dodaj">+ Dodaj<span className="hide-sm">&nbsp;ogłoszenie</span></Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div><div className="logo"><Logo /></div><p>Platforma ogłoszeń maszyn budowlanych, rolniczych i przemysłowych w Polsce.</p></div>
        <div><h4>Kupujący</h4><ul><li><Link href="/ogloszenia">Wszystkie ogłoszenia</Link></li><li><Link href="/obserwowane">Obserwowane</Link></li></ul></div>
        <div><h4>Sprzedający</h4><ul><li><Link href="/dodaj">Dodaj ogłoszenie</Link></li><li><Link href="/moje">Moje ogłoszenia</Link></li><li><Link href="/#cennik">Cennik</Link></li></ul></div>
        <div><h4>Maszinero</h4><ul><li>Regulamin</li><li>Polityka prywatności</li><li>Kontakt</li></ul></div>
      </div>
    </footer>
  );
}

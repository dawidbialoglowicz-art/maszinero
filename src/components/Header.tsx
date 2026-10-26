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
          <Link href="/ogloszenia">Maszyny</Link>
          <Link href="/aukcje">Aukcje</Link>
          <Link href="/cena-zlomu">W cenie złomu</Link>
          {user && <Link href="/moje">Moje</Link>}
          {user && <Link href="/obserwowane">Obserwowane</Link>}
          {user?.role === "ADMIN" && <Link href="/admin">Panel</Link>}
        </nav>
        <div className="act">
          {user ? (
            <>
              <Link className="btn btn-ghost" href="/konto">Konto</Link>
              <form action={logout}><button className="btn btn-ghost hide-sm" type="submit">Wyloguj</button></form>
            </>
          ) : (
            <Link className="btn btn-ghost" href="/logowanie">Zaloguj</Link>
          )}
          <Link className="btn btn-signal" href="/dodaj">+ Sprzedaj<span className="hide-sm">maszynę</span></Link>
        </div>
      </div>
      <nav className="subnav" aria-label="Działy">
        <Link href="/ogloszenia">Maszyny</Link>
        <Link href="/aukcje">Aukcje</Link>
        <Link href="/cena-zlomu">W cenie złomu</Link>
        {user?.role === "ADMIN" && <Link href="/admin">Panel</Link>}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div>
          <div className="logo"><Logo /></div>
          <p>Ogłoszenia i aukcje maszyn przemysłowych w Polsce. Serwis prowadzi <a href="https://3core.pl" rel="noopener">3core.pl</a>.</p>
        </div>
        <div><h4>Kupujący</h4><ul><li><Link href="/ogloszenia">Maszyny na sprzedaż</Link></li><li><Link href="/aukcje">Aukcje</Link></li><li><Link href="/cena-zlomu">Maszyny w cenie złomu</Link></li><li><Link href="/obserwowane">Obserwowane</Link></li></ul></div>
        <div><h4>Sprzedający</h4><ul><li><Link href="/dodaj">Sprzedaj maszynę</Link></li><li><Link href="/moje">Moje ogłoszenia i aukcje</Link></li><li><Link href="/konto">Konto</Link></li><li><Link href="/#cennik">Cennik</Link></li></ul></div>
        <div><h4>Maszinero</h4><ul><li>Regulamin (w przygotowaniu)</li><li>Polityka prywatności (w przygotowaniu)</li><li><a href="https://3core.pl" rel="noopener">3core.pl</a></li></ul></div>
      </div>
      <div className="wrap legal">© {new Date().getFullYear()} 3core.pl · Maszinero.pl</div>
    </footer>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap auth" style={{ textAlign: "center" }}>
      <div className="page-head"><h1>Nie znaleźliśmy tej strony</h1><p className="muted">Ogłoszenie mogło zostać usunięte lub sprzedane.</p></div>
      <Link className="btn btn-signal" href="/ogloszenia">Przeglądaj ogłoszenia</Link>
    </div>
  );
}

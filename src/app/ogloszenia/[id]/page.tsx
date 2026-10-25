import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { categoryName } from "@/lib/catalog";
import { currentUser } from "@/lib/session";
import { favoriteIds } from "@/lib/favorites";
import { ago, leaseRate, num, pln } from "@/lib/format";
import { Gallery } from "@/components/Gallery";
import { PhoneReveal } from "@/components/PhoneReveal";
import { FavButton } from "@/components/FavButton";

async function getListing(id: string) {
  return db.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      user: { select: { id: true, name: true, companyName: true, accountType: true, verified: true, phone: true, email: true, createdAt: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/ogloszenia/[id]">): Promise<Metadata> {
  const l = await getListing((await params).id);
  if (!l) return {};
  return { title: `${l.title}, ${l.year} – ${pln(l.priceNet)}`, description: l.description.slice(0, 160) };
}

export default async function ListingPage({ params, searchParams }: PageProps<"/ogloszenia/[id]">) {
  const { id } = await params;
  const added = (await searchParams).dodano === "1";
  const [l, me, favs] = await Promise.all([getListing(id), currentUser(), favoriteIds()]);
  if (!l || (l.status !== "ACTIVE" && l.userId !== me?.id)) notFound();
  if (me?.id !== l.userId) await db.listing.update({ where: { id }, data: { views: { increment: 1 } } });

  const seller = l.user.companyName || l.user.name;
  const vat = Math.round(l.priceNet * 0.23);
  const rows: [string, string | null][] = [
    ["Kategoria", categoryName(l.category)],
    ["Marka", l.brand],
    ["Model", l.model],
    ["Rok produkcji", String(l.year)],
    ["Motogodziny", l.hours != null ? `${num(l.hours)} mth` : null],
    ["Przebieg", l.mileageKm != null ? `${num(l.mileageKm)} km` : null],
    ["Parametr główny", l.keyParam],
    ["Numer seryjny", l.serialNumber],
    ["Lokalizacja", `${l.city}, woj. ${l.voivodeship}`],
    ["Dodano", ago(l.createdAt)],
  ];

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Okruszki">
        <Link href="/ogloszenia">Ogłoszenia</Link><span>›</span>
        <Link href={`/ogloszenia?kategoria=${l.category}`}>{categoryName(l.category)}</Link><span>›</span>
        <span>{l.title}</span>
      </nav>
      {added && <p className="alert ok">Ogłoszenie zostało opublikowane.</p>}
      {l.status !== "ACTIVE" && <p className="alert err">To ogłoszenie nie jest widoczne publicznie ({l.status === "SOLD" ? "sprzedane" : "zarchiwizowane"}).</p>}
      <div className="detail">
        <div style={{ display: "grid", gap: 24, minWidth: 0 }}>
          <div style={{ position: "relative" }}>
            <Gallery images={l.images.map((i) => i.url)} title={l.title} category={l.category} />
            <FavButton id={l.id} initial={favs.has(l.id)} />
          </div>
          <section className="panel">
            <h2 style={{ fontSize: 18 }}>Dane techniczne</h2>
            <table className="spec-table"><tbody>
              {rows.filter(([, v]) => v).map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
            </tbody></table>
          </section>
          <section className="panel">
            <h2 style={{ fontSize: 18 }}>Opis</h2>
            <p className="desc" style={{ margin: 0 }}>{l.description}</p>
          </section>
        </div>
        <aside className="side">
          <div className="panel">
            <span className="cat-l">{categoryName(l.category)} · {l.year}</span>
            <h1>{l.title}</h1>
            <div>
              <div className="big-price">{pln(l.priceNet)}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                {l.vatInvoice ? <>netto · <span className="mono">{pln(l.priceNet + vat)}</span> brutto z 23% VAT</> : "cena brutto, sprzedaż bez faktury VAT"}
              </div>
            </div>
            <div className="alert" style={{ background: "var(--bg)" }}>
              Leasing od <b className="mono">{num(leaseRate(l.priceNet))} zł</b>/mies. netto
              <div className="muted" style={{ fontSize: 12 }}>Szacunek: 48 rat, 10% wpłaty. Ostateczną ofertę przygotowuje firma leasingowa.</div>
            </div>
          </div>
          <div className="panel">
            <div className="seller">
              <div className="avatar">{seller.slice(0, 1).toUpperCase()}</div>
              <div>
                <b>{seller}</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  {l.user.accountType === "PRIVATE" ? "Osoba prywatna" : "Firma"} · na Maszinero od {l.user.createdAt.getFullYear()}
                </div>
              </div>
            </div>
            {l.user.verified && <span className="tag ok" style={{ justifySelf: "start" }}>✓ Zweryfikowany dealer</span>}
            {l.user.phone ? <PhoneReveal phone={l.user.phone} /> : null}
            <a className="btn btn-plain" href={`mailto:${l.user.email}?subject=${encodeURIComponent(`Maszinero: ${l.title}`)}`}>Napisz e-mail</a>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>Nigdy nie wpłacaj zaliczki przed obejrzeniem maszyny i sprawdzeniem numeru seryjnego.</p>
          </div>
          {me?.id === l.userId && <Link className="btn btn-plain" href="/moje">Zarządzaj ogłoszeniem</Link>}
        </aside>
      </div>
    </div>
  );
}

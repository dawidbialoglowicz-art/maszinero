import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { categoryName } from "@/lib/catalog";
import { ago, num, pln } from "@/lib/format";
import { MachineIcon } from "@/components/Icons";
import { ListingActions } from "@/components/ListingActions";

export const metadata: Metadata = { title: "Moje ogłoszenia" };

const STATUS = { ACTIVE: ["Aktywne", "ok"], SOLD: ["Sprzedane", "mute"], ARCHIVED: ["Archiwum", "mute"] } as const;

export default async function Page() {
  const user = await requireUser("/moje");
  const listings = await db.listing.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { images: { take: 1, orderBy: { position: "asc" } }, _count: { select: { favorites: true } } },
  });
  return (
    <div className="wrap">
      <div className="page-head bar" style={{ marginBottom: 0 }}>
        <h1>Moje ogłoszenia</h1>
        <Link className="btn btn-signal" href="/dodaj">+ Dodaj ogłoszenie</Link>
      </div>
      <div className="rows">
        {listings.length === 0 && <div className="empty">Nie masz jeszcze ogłoszeń. <Link className="link-btn" href="/dodaj">Dodaj pierwsze</Link></div>}
        {listings.map((l) => (
          <div className="row" key={l.id}>
            <div className="ph">{l.images[0] ? <img src={l.images[0].url} alt="" /> : <MachineIcon category={l.category} />}</div>
            <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Link href={`/ogloszenia/${l.id}`} style={{ fontWeight: 700 }}>{l.title}</Link>
                <span className={`tag ${STATUS[l.status][1]}`}>{STATUS[l.status][0]}</span>
              </div>
              <span className="muted" style={{ fontSize: 13 }}>
                {categoryName(l.category)} · {l.year} · <span className="mono">{pln(l.priceNet)}</span> · dodano {ago(l.createdAt)}
              </span>
              <span className="muted mono" style={{ fontSize: 12 }}>{num(l.views)} wyświetleń · {num(l._count.favorites)} obserwujących</span>
            </div>
            <ListingActions id={l.id} status={l.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

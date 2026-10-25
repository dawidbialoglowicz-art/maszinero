import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { categoryName } from "@/lib/catalog";
import { finalizeEndedAuctions } from "@/lib/auctions";
import { ago, num, pln } from "@/lib/format";
import { MachineIcon } from "@/components/Icons";
import { ListingActions } from "@/components/ListingActions";

export const metadata: Metadata = { title: "Moje ogłoszenia i aukcje" };

const STATUS = { ACTIVE: ["Aktywne", "ok"], SOLD: ["Sprzedane", "mute"], ARCHIVED: ["Archiwum", "mute"] } as const;

export default async function Page() {
  const user = await requireUser("/moje");
  await finalizeEndedAuctions();
  const listings = await db.listing.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      images: { take: 1, orderBy: { position: "asc" } },
      auction: { include: { winner: { select: { name: true, email: true, phone: true, companyName: true } } } },
      _count: { select: { favorites: true } },
    },
  });
  return (
    <div className="wrap">
      <div className="page-head bar" style={{ marginBottom: 0 }}>
        <h1>Moje ogłoszenia i aukcje</h1>
        <Link className="btn btn-signal" href="/dodaj">+ Sprzedaj maszynę</Link>
      </div>
      <div className="rows">
        {listings.length === 0 && <div className="empty">Nie masz jeszcze ogłoszeń. <Link className="link-btn" href="/dodaj">Dodaj pierwsze</Link></div>}
        {listings.map((l) => {
          const a = l.auction;
          return (
            <div className="row" key={l.id}>
              <div className="ph">{l.images[0] ? <img src={l.images[0].url} alt="" /> : <MachineIcon category={l.category} />}</div>
              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Link href={`/ogloszenia/${l.id}`} style={{ fontWeight: 700 }}>{l.title}</Link>
                  {a ? (
                    <span className={`tag ${a.status === "LIVE" ? "auc" : "mute"}`}>
                      {a.status === "LIVE" ? "Aukcja trwa" : a.status === "CANCELLED" ? "Aukcja przerwana" : a.winnerId ? "Aukcja: sprzedane" : "Aukcja: bez sprzedaży"}
                    </span>
                  ) : <span className={`tag ${STATUS[l.status][1]}`}>{STATUS[l.status][0]}</span>}
                  {l.scrapPrice && <span className="tag scrap">Cena złomu</span>}
                </div>
                <span className="muted" style={{ fontSize: 13 }}>
                  {categoryName(l.category)} · {l.year} · <span className="mono">{pln(l.priceNet)}</span>
                  {a && ` · ${a.bidCount} ofert · koniec ${a.endsAt.toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" })}`}
                  {" · "}dodano {ago(l.createdAt)}
                </span>
                {a?.winner && (
                  <span style={{ fontSize: 13 }}>
                    Kupujący: <b>{a.winner.companyName || a.winner.name}</b> · <span className="mono">{a.winner.phone ?? "brak telefonu"}</span> · {a.winner.email}
                  </span>
                )}
                <span className="muted mono" style={{ fontSize: 12 }}>{num(l.views)} wyświetleń · {num(l._count.favorites)} obserwujących</span>
              </div>
              <ListingActions id={l.id} status={l.status} auction={a ? { live: a.status === "LIVE", bids: a.bidCount } : null} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

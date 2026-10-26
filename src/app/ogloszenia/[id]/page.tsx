import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { categoryName, CONDITIONS } from "@/lib/catalog";
import { currentUser } from "@/lib/session";
import { favoriteIds } from "@/lib/favorites";
import { ago, leaseRate, num, pln } from "@/lib/format";
import { formatPerKg, pricePerKg } from "@/lib/scrap";
import { maskName, minNextBid } from "@/lib/auction-rules";
import { finalizeEndedAuctions } from "@/lib/auctions";
import { Gallery } from "@/components/Gallery";
import { ContactReveal } from "@/components/ContactReveal";
import { FavButton } from "@/components/FavButton";
import { BidPanel } from "@/components/BidPanel";

const include = {
  images: { orderBy: { position: "asc" } },
  user: { select: { id: true, name: true, companyName: true, accountType: true, verified: true, createdAt: true } },
  auction: { include: { bids: { orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } } } } } },
} satisfies Prisma.ListingInclude;

const getListing = cache(async (id: string) => (id.length > 40 ? null : db.listing.findUnique({ where: { id }, include })));

/**
 * Ogłoszenie nieaktywne widzi tylko właściciel (i administrator); zakończona aukcja pozostaje widoczna
 * ze swoim wynikiem, chyba że wstrzymała ją moderacja.
 */
function visibleTo(l: NonNullable<Awaited<ReturnType<typeof getListing>>>, me?: { id: string; role: string } | null) {
  return l.status === "ACTIVE" || l.userId === me?.id || me?.role === "ADMIN"
    || (l.status !== "HIDDEN" && l.auction !== null && l.auction.status === "ENDED");
}

export async function generateMetadata({ params }: PageProps<"/ogloszenia/[id]">): Promise<Metadata> {
  const l = await getListing((await params).id);
  const me = await currentUser();
  if (!l || !visibleTo(l, me)) return {};
  return { title: `${l.title}, ${l.year}: ${pln(l.priceNet)}`, description: l.description.slice(0, 160) };
}

export default async function ListingPage({ params, searchParams }: PageProps<"/ogloszenia/[id]">) {
  const { id } = await params;
  const added = (await searchParams).dodano === "1";
  const pre = await getListing(id);
  if (pre?.auction && pre.auction.status === "LIVE" && pre.auction.endsAt <= new Date()) {
    await finalizeEndedAuctions(pre.auction.id);
  }
  const l = pre?.auction?.status === "LIVE" && pre.auction.endsAt <= new Date() ? await getListingFresh(id) : pre;
  const [me, favs] = await Promise.all([currentUser(), favoriteIds()]);
  if (!l || !visibleTo(l, me)) notFound();
  if (me?.id !== l.userId && l.status === "ACTIVE") {
    await db.listing.update({ where: { id }, data: { views: { increment: 1 } } });
  }

  const a = l.auction;
  const seller = l.user.companyName || l.user.name;
  const vat = Math.round(l.priceNet * 0.23);
  const perKg = pricePerKg(l.priceNet, l.weightKg);
  const rows: [string, string | null][] = [
    ["Kategoria", categoryName(l.category)],
    ["Producent", l.brand],
    ["Model", l.model],
    ["Rok produkcji", String(l.year)],
    ["Stan", CONDITIONS[l.condition]],
    ["Godziny pracy", l.hours != null ? `${num(l.hours)} h` : null],
    ["Sterowanie", l.controlSystem],
    ["Parametr główny", l.keyParam],
    ["Masa", l.weightKg ? `${num(l.weightKg)} kg` : null],
    ["Cena za kg", perKg !== null ? formatPerKg(perKg) : null],
    ["Numer seryjny", l.serialNumber],
    ["Lokalizacja", `${l.city}, woj. ${l.voivodeship}`],
    ["Dodano", ago(l.createdAt)],
  ];

  let bidPanel = null;
  if (a) {
    const myProxy = me ? await db.proxyBid.findUnique({ where: { auctionId_userId: { auctionId: a.id, userId: me.id } } }) : null;
    const viewer = !me ? "anon" : me.id === l.userId ? "seller" : a.leaderId === me.id ? "leader" : myProxy ? "outbid" : "new";
    bidPanel = (
      <BidPanel
        auctionId={a.id}
        listingId={l.id}
        currentPrice={a.currentPrice}
        minNext={minNextBid(a)}
        bidCount={a.bidCount}
        endsAt={a.endsAt.toISOString()}
        live={a.status === "LIVE" && l.status === "ACTIVE"}
        reserveSet={a.reservePrice !== null}
        reserveMet={a.reservePrice === null || (a.bidCount > 0 && a.currentPrice >= a.reservePrice)}
        buyerPremiumBp={a.buyerPremiumBp}
        viewer={viewer}
        myMax={myProxy?.maxAmount ?? null}
      />
    );
  }

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Okruszki">
        <Link href={a ? "/aukcje" : "/ogloszenia"}>{a ? "Aukcje" : "Ogłoszenia"}</Link><span>›</span>
        <Link href={`/ogloszenia?kategoria=${l.category}`}>{categoryName(l.category)}</Link><span>›</span>
        <span>{l.title}</span>
      </nav>
      {added && <p className="alert ok">{a ? "Aukcja wystartowała." : "Ogłoszenie zostało opublikowane."}</p>}
      {a?.status === "ENDED" && (
        <p className={`alert ${a.winnerId ? "ok" : "err"}`}>
          {a.winnerId
            ? `Aukcja zakończona sprzedażą za ${pln(a.finalPrice ?? a.currentPrice)} netto${me?.id === a.winnerId ? ". Wygrałeś! Sprzedawca skontaktuje się z Tobą." : "."}`
            : a.bidCount > 0 ? "Aukcja zakończona bez sprzedaży: nie osiągnięto ceny minimalnej." : "Aukcja zakończona bez ofert."}
        </p>
      )}
      {l.status === "HIDDEN" && <p className="alert err">To ogłoszenie jest wstrzymane przez moderację i nie jest widoczne publicznie.</p>}
      {l.status !== "ACTIVE" && l.status !== "HIDDEN" && !a && <p className="alert err">To ogłoszenie nie jest widoczne publicznie ({l.status === "SOLD" ? "sprzedane" : "zarchiwizowane"}).</p>}
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
          {a && (
            <section className="panel">
              <h2 style={{ fontSize: 18 }}>Historia licytacji</h2>
              {a.bids.length === 0 ? <p className="muted" style={{ margin: 0 }}>Nikt jeszcze nie licytował. Cena wywoławcza: {pln(a.startPrice)}.</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table className="spec-table bids"><tbody>
                    {a.bids.map((b) => (
                      <tr key={b.id}>
                        <th scope="row">{maskName(b.user.name)}{b.userId === me?.id ? " (Ty)" : ""}{b.auto ? <span className="muted"> · automatycznie</span> : null}</th>
                        <td>{pln(b.amount)}</td>
                        <td className="muted">{b.createdAt.toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Warsaw" })}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </section>
          )}
        </div>
        <aside className="side">
          <div className="panel">
            <span className="cat-l">{categoryName(l.category)} · {l.year}</span>
            <h1>{l.title}</h1>
            {l.scrapPrice && <span className="tag scrap" style={{ justifySelf: "start" }}>Maszyna w cenie złomu{perKg !== null ? ` · ${formatPerKg(perKg)}` : ""}</span>}
            {!a && (
              <>
                <div>
                  <div className="big-price">{pln(l.priceNet)}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    {l.vatInvoice ? <>netto · <span className="mono">{pln(l.priceNet + vat)}</span> brutto z 23% VAT</> : "cena brutto, sprzedaż bez faktury VAT"}
                  </div>
                </div>
                {!l.scrapPrice && (
                  <div className="alert" style={{ background: "var(--bg)" }}>
                    Leasing od <b className="mono">{num(leaseRate(l.priceNet))} zł</b>/mies. netto
                    <div className="muted" style={{ fontSize: 12 }}>Szacunek: 48 rat, 10% wpłaty. Ostateczną ofertę przygotowuje firma leasingowa.</div>
                  </div>
                )}
              </>
            )}
          </div>
          {bidPanel}
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
            {(l.status === "ACTIVE" || (a?.winnerId && a.winnerId === me?.id)) && <ContactReveal listingId={l.id} title={l.title} />}
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>Nie wpłacaj zaliczki przed obejrzeniem maszyny i sprawdzeniem numeru seryjnego.</p>
          </div>
          {me?.id === l.userId && <Link className="btn btn-plain" href="/moje">Zarządzaj ogłoszeniem</Link>}
        </aside>
      </div>
    </div>
  );
}

// po zamknięciu aukcji czytamy ogłoszenie jeszcze raz, z pominięciem pamięci podręcznej getListing
function getListingFresh(id: string) {
  return db.listing.findUnique({ where: { id }, include });
}

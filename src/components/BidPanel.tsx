"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { bid, type BidState } from "@/lib/actions";
import { Countdown } from "./Countdown";

type Props = {
  auctionId: string;
  listingId: string;
  currentPrice: number;
  minNext: number;
  bidCount: number;
  endsAt: string;
  live: boolean;
  reserveSet: boolean;
  reserveMet: boolean;
  buyerPremiumBp: number;
  viewer: "anon" | "seller" | "leader" | "outbid" | "new";
  myMax: number | null;
};

const zl = (n: number) => `${n.toLocaleString("pl-PL").replace(/ /g, " ")} zł`;

export function BidPanel(p: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<BidState, FormData>(bid, undefined);
  const refresh = useCallback(() => router.refresh(), [router]);

  // podczas licytacji odświeżamy cenę co 15 s, gdy karta jest widoczna
  useEffect(() => {
    if (!p.live) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 15_000);
    return () => clearInterval(t);
  }, [p.live, refresh]);

  return (
    <div className="panel bid">
      <div className="bid-head">
        <span className="tag auc">Aukcja</span>
        <span className="muted">{p.live ? <>koniec za <b><Countdown endsAt={p.endsAt} onEnd={refresh} /></b></> : "aukcja zakończona"}</span>
      </div>
      <div>
        <div className="muted" style={{ fontSize: 13 }}>{p.bidCount > 0 ? `Aktualna oferta · ${p.bidCount} w historii` : "Cena wywoławcza"}</div>
        <div className="big-price">{zl(p.currentPrice)}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>netto
          {p.reserveSet && <> · <span className={p.reserveMet ? "ok-text" : undefined}>{p.reserveMet ? "cena minimalna osiągnięta" : "cena minimalna nieosiągnięta"}</span></>}
          {p.buyerPremiumBp > 0 && <> · opłata aukcyjna {(p.buyerPremiumBp / 100).toString().replace(".", ",")}%</>}
        </div>
      </div>

      {p.live && p.viewer === "seller" && <p className="alert" style={{ background: "var(--bg)", margin: 0 }}>To Twoja aukcja. Nie możesz w niej licytować.</p>}
      {p.live && p.viewer === "leader" && <p className="alert ok" style={{ margin: 0 }}>Prowadzisz. Twój limit: <b className="mono">{zl(p.myMax ?? p.currentPrice)}</b></p>}
      {p.live && p.viewer === "outbid" && <p className="alert err" style={{ margin: 0 }}>Twoja oferta została przebita.</p>}

      {p.live && p.viewer !== "seller" && (
        p.viewer === "anon" ? (
          <Link className="btn btn-signal" href={`/logowanie?next=${encodeURIComponent(`/ogloszenia/${p.listingId}`)}`}>Zaloguj się, aby licytować</Link>
        ) : (
          <form action={action} className="bid-form">
            <input type="hidden" name="auctionId" value={p.auctionId} />
            <input type="hidden" name="listingId" value={p.listingId} />
            <div className="field">
              <label htmlFor="amount">{p.viewer === "leader" ? "Podnieś swój limit (zł netto)" : "Twój limit (zł netto)"}</label>
              <input id="amount" name="amount" className="mono" inputMode="numeric" required placeholder={`min. ${zl(p.viewer === "leader" ? (p.myMax ?? p.currentPrice) + 1 : p.minNext)}`} />
              <span className="hint">System licytuje za Ciebie najmniejszą potrzebną kwotą, aż do Twojego limitu. Oferta jest wiążąca.</span>
            </div>
            <button className="btn btn-signal" disabled={pending}>{pending ? "Składanie oferty…" : "Licytuj"}</button>
            {state?.error && <p className="alert err" role="alert" style={{ margin: 0 }}>{state.error}</p>}
            {state?.ok && <p className="alert ok" role="status" style={{ margin: 0 }}>{state.ok}</p>}
          </form>
        )
      )}
      {p.live && <p className="muted" style={{ fontSize: 12, margin: 0 }}>Oferta w ostatnich 2 minutach przedłuża aukcję o 2 minuty.</p>}
    </div>
  );
}

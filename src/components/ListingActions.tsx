"use client";

import { useState, useTransition } from "react";
import { deleteListing, setListingStatus } from "@/lib/actions";

type Props = { id: string; status: "ACTIVE" | "SOLD" | "ARCHIVED"; auction: { live: boolean; bids: number } | null };

export function ListingActions({ id, status, auction }: Props) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => {
    const r = await fn();
    setError(r.error ?? null);
    setConfirm(false);
  });
  const locked = auction !== null && auction.bids > 0;

  if (confirm) {
    return (
      <div className="acts">
        <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Usunąć na stałe razem ze zdjęciami?</span>
        <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => run(() => deleteListing(id))}>Tak, usuń</button>
        <button className="btn btn-plain btn-sm" onClick={() => setConfirm(false)}>Anuluj</button>
      </div>
    );
  }
  return (
    <div className="acts">
      {auction ? (
        auction.live && !locked && <button className="btn btn-plain btn-sm" disabled={pending} onClick={() => run(() => setListingStatus(id, "ARCHIVED"))}>Przerwij aukcję</button>
      ) : status === "ACTIVE" ? (
        <button className="btn btn-plain btn-sm" disabled={pending} onClick={() => run(() => setListingStatus(id, "SOLD"))}>Oznacz jako sprzedane</button>
      ) : (
        <button className="btn btn-plain btn-sm" disabled={pending} onClick={() => run(() => setListingStatus(id, "ACTIVE"))}>Aktywuj ponownie</button>
      )}
      {!locked && <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => setConfirm(true)}>Usuń</button>}
      {locked && <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Aukcja z ofertami: bez zmian do końca</span>}
      {error && <span className="alert err" role="alert" style={{ padding: "4px 8px" }}>{error}</span>}
    </div>
  );
}

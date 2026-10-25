"use client";

import { useState, useTransition } from "react";
import { deleteListing, setListingStatus } from "@/lib/actions";

export function ListingActions({ id, status }: { id: string; status: "ACTIVE" | "SOLD" | "ARCHIVED" }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); setConfirm(false); });
  if (confirm) {
    return (
      <div className="acts">
        <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Usunąć na stałe?</span>
        <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => run(() => deleteListing(id))}>Tak, usuń</button>
        <button className="btn btn-plain btn-sm" onClick={() => setConfirm(false)}>Anuluj</button>
      </div>
    );
  }
  return (
    <div className="acts">
      {status === "ACTIVE" ? (
        <button className="btn btn-plain btn-sm" disabled={pending} onClick={() => run(() => setListingStatus(id, "SOLD"))}>Oznacz jako sprzedane</button>
      ) : (
        <button className="btn btn-plain btn-sm" disabled={pending} onClick={() => run(() => setListingStatus(id, "ACTIVE"))}>Aktywuj ponownie</button>
      )}
      <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => setConfirm(true)}>Usuń</button>
    </div>
  );
}

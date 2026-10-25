"use client";

import { useState, useTransition } from "react";
import { revealContact } from "@/lib/actions";

export function ContactReveal({ listingId, title }: { listingId: string; title: string }) {
  const [contact, setContact] = useState<{ phone: string | null; email: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  if (contact) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {contact.phone && <a className="btn btn-signal mono" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>}
        <a className="btn btn-plain" href={`mailto:${contact.email}?subject=${encodeURIComponent(`Maszinero: ${title}`)}`}>{contact.email}</a>
      </div>
    );
  }
  return (
    <>
      <button className="btn btn-signal" type="button" disabled={pending} onClick={() => start(async () => {
        const c = await revealContact(listingId);
        if (c) setContact(c); else setFailed(true);
      })}>
        {pending ? "Pobieranie…" : "Pokaż telefon i e-mail"}
      </button>
      {failed && <p className="alert err" style={{ margin: 0 }}>Ogłoszenie nie jest już aktywne.</p>}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { decideAgentAction, setListingHidden, setUserVerified } from "@/lib/admin-actions";

const LABELS = {
  HIDE_LISTING: ["Zostaw wstrzymane", "Przywróć"],
  FLAG_LISTING: ["Wstrzymaj", "W porządku"],
  CHANGE_CATEGORY: ["Zmień kategorię", "Zostaw"],
  VERIFY_COMPANY: ["Nadaj odznakę dealera", "Nie teraz"],
  FLAG_COMPANY: ["Przyjmuję", "Zignoruj"],
} as const;

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => setError((await fn()).error ?? null));
  return { pending, error, run };
}

export function AgentDecision({ id, kind }: { id: string; kind: keyof typeof LABELS }) {
  const { pending, error, run } = useAction();
  const [yes, no] = LABELS[kind];
  return (
    <div className="acts">
      <button className="btn btn-signal btn-sm" disabled={pending} onClick={() => run(() => decideAgentAction(id, true))}>{yes}</button>
      <button className="btn btn-plain btn-sm" disabled={pending} onClick={() => run(() => decideAgentAction(id, false))}>{no}</button>
      {error && <span className="alert err" role="alert" style={{ padding: "4px 8px" }}>{error}</span>}
    </div>
  );
}

export function VerifyToggle({ userId, verified }: { userId: string; verified: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div className="acts">
      <button className={`btn btn-sm ${verified ? "btn-plain" : "btn-signal"}`} disabled={pending} onClick={() => run(() => setUserVerified(userId, !verified))}>
        {verified ? "Odbierz odznakę" : "Nadaj odznakę"}
      </button>
      {error && <span className="alert err" role="alert" style={{ padding: "4px 8px" }}>{error}</span>}
    </div>
  );
}

export function RestoreListing({ listingId }: { listingId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="acts">
      <button className="btn btn-plain btn-sm" disabled={pending} onClick={() => run(() => setListingHidden(listingId, false))}>Przywróć do sprzedaży</button>
      {error && <span className="alert err" role="alert" style={{ padding: "4px 8px" }}>{error}</span>}
    </div>
  );
}

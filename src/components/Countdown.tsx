"use client";

import { useEffect, useSyncExternalStore } from "react";
import { timeLeft } from "@/lib/auction-rules";

// Wspólny zegar dla wszystkich liczników na stronie (jeden interwał zamiast jednego na kartę)
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = Date.now();
function subscribe(cb: () => void) {
  now = Date.now();
  listeners.add(cb);
  if (!timer) timer = setInterval(() => { now = Date.now(); listeners.forEach((l) => l()); }, 1000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) { clearInterval(timer); timer = undefined; }
  };
}

// Na serwerze i przy hydratacji pokazujemy datę zakończenia, w przeglądarce odliczanie.
export function Countdown({ endsAt, onEnd }: { endsAt: string; onEnd?: () => void }) {
  const t = useSyncExternalStore(subscribe, () => now, () => null);
  const end = new Date(endsAt).getTime();
  const ended = t !== null && t >= end;
  useEffect(() => {
    if (ended) onEnd?.();
  }, [ended, onEnd]);
  if (t === null) {
    return <time dateTime={endsAt}>{new Date(endsAt).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" })}</time>;
  }
  return <time dateTime={endsAt} className={end - t < 3_600_000 ? "urgent" : undefined}>{timeLeft(end - t)}</time>;
}

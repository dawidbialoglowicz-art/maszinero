// Reguły licytacji (czyste funkcje, testowane jednostkowo)

/** Minimalne przebicie zależne od aktualnej ceny, jak w domach aukcyjnych maszyn. */
export function bidIncrement(price: number): number {
  if (price < 10_000) return 100;
  if (price < 50_000) return 250;
  if (price < 100_000) return 500;
  if (price < 500_000) return 1_000;
  return 2_500;
}

/** Najniższa oferta, jaką można teraz złożyć. Pierwsza oferta może być równa cenie wywoławczej. */
export function minNextBid(a: { startPrice: number; currentPrice: number; bidCount: number }): number {
  return a.bidCount === 0 ? a.startPrice : a.currentPrice + bidIncrement(a.currentPrice);
}

export type Proxy = { userId: string; maxAmount: number; createdAt: Date };

/**
 * Licytacja z limitem (jak na eBayu): prowadzi najwyższy limit, a przy remisie ten złożony wcześniej.
 * Cena to drugi najwyższy limit plus przebicie, ale nie więcej niż limit prowadzącego.
 * Gdy prowadzący ma limit co najmniej równy cenie minimalnej, cena skacze do ceny minimalnej.
 */
export function resolveProxies(proxies: Proxy[], startPrice: number, reservePrice: number | null): { leaderId: string; price: number } | null {
  if (proxies.length === 0) return null;
  const sorted = [...proxies].sort((a, b) => b.maxAmount - a.maxAmount || a.createdAt.getTime() - b.createdAt.getTime());
  const [leader, second] = sorted;
  let price = second ? Math.min(leader.maxAmount, second.maxAmount + bidIncrement(second.maxAmount)) : startPrice;
  price = Math.max(price, startPrice);
  if (reservePrice && leader.maxAmount >= reservePrice && price < reservePrice) price = reservePrice;
  return { leaderId: leader.userId, price: Math.min(price, leader.maxAmount) };
}

/** Dogrywka: oferta w ostatnich 2 minutach przedłuża aukcję do 2 minut od tej oferty. */
export const SNIPE_WINDOW_MS = 2 * 60 * 1000;
export function extendedEnd(now: Date, endsAt: Date): Date {
  return endsAt.getTime() - now.getTime() < SNIPE_WINDOW_MS ? new Date(now.getTime() + SNIPE_WINDOW_MS) : endsAt;
}

export const AUCTION_DURATIONS_DAYS = [3, 5, 7, 10, 14] as const;

/** "2 dni 4 godz.", "3 godz. 12 min", "45 s" */
export function timeLeft(ms: number): string {
  if (ms <= 0) return "zakończona";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} ${d === 1 ? "dzień" : "dni"} ${h} godz.`;
  if (h > 0) return `${h} godz. ${m} min`;
  if (m > 0) return `${m} min ${s % 60} s`;
  return `${s} s`;
}

/** Imię licytującego w historii: "M***k". */
export function maskName(name: string): string {
  const n = name.trim();
  if (n.length <= 2) return `${n[0] ?? "?"}***`;
  return `${n[0]}***${n[n.length - 1]}`;
}

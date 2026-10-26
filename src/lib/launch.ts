// Okres startowy bez opłat. FREE_UNTIL=RRRR-MM-DD to ostatni bezpłatny dzień (czasu polskiego).
// Bez tej zmiennej serwis jest bezpłatny, a strona mówi ogólnie o pierwszych miesiącach.
export const FREE_MONTHS = 6;

export function parseFreeUntil(value: string | undefined): Date | null {
  const m = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const day = new Date(Date.UTC(y, mo - 1, d));
  if (day.getUTCMonth() !== mo - 1 || day.getUTCDate() !== d) return null;
  // koniec dnia w Polsce: północ następnego dnia minus przesunięcie strefy (zimą 1 h, latem 2 h)
  const nextMidnightUtc = Date.UTC(y, mo - 1, d + 1);
  const offsetH = warsawOffsetHours(new Date(nextMidnightUtc));
  return new Date(nextMidnightUtc - offsetH * 3_600_000);
}

function warsawOffsetHours(at: Date) {
  const local = new Date(at.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 3_600_000);
}

export function freePeriod(now = new Date(), value = process.env.FREE_UNTIL) {
  const end = parseFreeUntil(value);
  const active = end === null || now < end;
  // ostatni bezpłatny dzień do wyświetlenia, np. „30 kwietnia 2027”
  const lastDay = end
    ? new Date(end.getTime() - 1).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" })
    : null;
  const label = lastDay ? `do ${lastDay}` : `przez pierwsze ${FREE_MONTHS} miesięcy`;
  return { active, end, lastDay, label };
}

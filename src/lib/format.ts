const nf = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0, useGrouping: true });

export function num(n: number) {
  // pl-PL pomija separator tysięcy dla liczb 4-cyfrowych; wymuszamy spójny zapis
  return nf.format(n).replace(/ /g, " ").replace(/^(\d)(\d{3})$/, "$1 $2");
}

export function pln(n: number) {
  return `${num(n)} zł`;
}

// Orientacyjna rata leasingu: 48 mies., 10% wpłaty, oprocentowanie ok. 10,5% rocznie
export function leaseRate(priceNet: number) {
  const financed = priceNet * 0.9;
  const months = 48;
  const r = 0.105 / 12;
  return Math.round(((financed * r) / (1 - Math.pow(1 + r, -months))) / 10) * 10;
}

export function ago(d: Date) {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "dziś";
  if (days === 1) return "wczoraj";
  if (days < 30) return `${days} dni temu`;
  return d.toLocaleDateString("pl-PL");
}

export function isFresh(d: Date, days = 3) {
  return Date.now() - d.getTime() < days * 86_400_000;
}

export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 10 || h >= 20) ? few : many;
}

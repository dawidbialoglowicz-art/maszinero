// Dział "Maszyny w cenie złomu": maszyna trafia tam tylko wtedy, gdy jej cena za kilogram
// nie przekracza progu. Dzięki temu nazwa działu jest obietnicą, a nie hasłem reklamowym.
export const SCRAP_MAX_PLN_PER_KG = 2;

/** Cena za kilogram w złotych z dokładnością do grosza. */
export function pricePerKg(priceNet: number, weightKg: number | null | undefined): number | null {
  if (!weightKg || weightKg <= 0) return null;
  return Math.round((priceNet / weightKg) * 100) / 100;
}

export function qualifiesForScrap(priceNet: number, weightKg: number | null | undefined): boolean {
  const perKg = pricePerKg(priceNet, weightKg);
  return perKg !== null && perKg <= SCRAP_MAX_PLN_PER_KG;
}

export function formatPerKg(perKg: number) {
  return `${perKg.toFixed(2).replace(".", ",")} zł/kg`;
}

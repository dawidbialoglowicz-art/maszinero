// Ceny Claude API w USD za milion tokenów (wejście, wyjście). Nieznany model liczymy po cenie Opusa.
const PRICES: Record<string, readonly [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

/** Koszt wywołania w mikrodolarach (1 USD = 1 000 000), zaokrąglony w górę. */
export function costMicroUsd(model: string, inputTokens: number, outputTokens: number): number {
  const [inp, out] = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return Math.ceil(inputTokens * inp + outputTokens * out);
}

/** Kwota w złotych do wyświetlenia w panelu (kurs orientacyjny). */
export function microUsdToPln(micro: number, usdPln = 4) {
  return (micro / 1_000_000) * usdPln;
}

import { z } from "zod";
import { CATEGORIES, categoryName } from "../catalog";

export const ISSUE_TYPES = [
  "spam",
  "oszustwo",
  "zdjecia_niezgodne",
  "brak_zdjec",
  "cena_podejrzana",
  "kontakt_w_opisie",
  "zla_kategoria",
  "zlom_masa",
  "tresc_niedozwolona",
  "inne",
] as const;

export const ISSUE_LABELS: Record<(typeof ISSUE_TYPES)[number], string> = {
  spam: "spam",
  oszustwo: "możliwe oszustwo",
  zdjecia_niezgodne: "zdjęcia nie pasują do opisu",
  brak_zdjec: "brak zdjęć",
  cena_podejrzana: "podejrzana cena",
  kontakt_w_opisie: "dane kontaktowe w opisie",
  zla_kategoria: "zła kategoria",
  zlom_masa: "masa niewiarygodna dla działu złomu",
  tresc_niedozwolona: "treść niedozwolona",
  inne: "inne",
};

const categoryIds = CATEGORIES.map((c) => c.id) as [string, ...string[]];

// Odpowiedź modelu (structured output): werdykt + lista problemów
export const verdictSchema = z.object({
  decision: z.enum(["ok", "review", "hide"]),
  summary: z.string(),
  issues: z.array(z.object({ type: z.enum(ISSUE_TYPES), detail: z.string() })),
  suggestedCategory: z.enum(categoryIds).nullable(),
});

export type Verdict = z.infer<typeof verdictSchema>;

export type PlannedAction = {
  kind: "HIDE_LISTING" | "FLAG_LISTING" | "CHANGE_CATEGORY";
  summary: string;
  reasoning: string;
  payload?: { category: string };
};

type ListingFacts = { category: string; sellerVerified: boolean; bidCount: number };

/**
 * Zamienia werdykt na decyzje do kolejki. Agent sam wstrzymuje tylko oczywisty spam lub oszustwo,
 * i nigdy ogłoszeń zweryfikowanych dealerów ani aukcji z ofertami: te trafiają do sprawdzenia.
 */
export function planModeration(v: Verdict, l: ListingFacts): PlannedAction[] {
  const reasoning = v.issues.length
    ? v.issues.map((i) => `• ${ISSUE_LABELS[i.type]}: ${i.detail}`).join("\n")
    : v.summary;
  const out: PlannedAction[] = [];
  let decision = v.decision;
  if (decision === "hide" && (l.sellerVerified || l.bidCount > 0)) decision = "review";

  if (decision === "hide") out.push({ kind: "HIDE_LISTING", summary: v.summary, reasoning });
  else if (decision === "review") out.push({ kind: "FLAG_LISTING", summary: v.summary, reasoning });

  if (decision !== "hide" && v.suggestedCategory && v.suggestedCategory !== l.category) {
    out.push({
      kind: "CHANGE_CATEGORY",
      summary: `Zmiana kategorii: ${categoryName(l.category)} → ${categoryName(v.suggestedCategory)}`,
      reasoning: v.issues.find((i) => i.type === "zla_kategoria")?.detail ?? v.summary,
      payload: { category: v.suggestedCategory },
    });
  }
  return out;
}

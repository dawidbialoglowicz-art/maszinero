import { describe, expect, it } from "vitest";
import { planModeration, type Verdict } from "@/lib/agent/moderation-rules";
import { assessCompany, companyNameMatches } from "@/lib/agent/nip-rules";
import { costMicroUsd } from "@/lib/agent/cost";

const verdict = (v: Partial<Verdict>): Verdict => ({ decision: "ok", summary: "OK", issues: [], suggestedCategory: null, ...v });
const facts = { category: "tokarki", sellerVerified: false, bidCount: 0 };

describe("planModeration", () => {
  it("poprawne ogłoszenie nie trafia do kolejki", () => {
    expect(planModeration(verdict({}), facts)).toEqual([]);
  });

  it("spam jest wstrzymywany", () => {
    const a = planModeration(verdict({ decision: "hide", summary: "Reklama kryptowalut", issues: [{ type: "spam", detail: "nie maszyna" }] }), facts);
    expect(a).toHaveLength(1);
    expect(a[0].kind).toBe("HIDE_LISTING");
    expect(a[0].reasoning).toContain("spam: nie maszyna");
  });

  it("zweryfikowanego dealera i aukcji z ofertami agent sam nie wstrzymuje", () => {
    expect(planModeration(verdict({ decision: "hide" }), { ...facts, sellerVerified: true })[0].kind).toBe("FLAG_LISTING");
    expect(planModeration(verdict({ decision: "hide" }), { ...facts, bidCount: 3 })[0].kind).toBe("FLAG_LISTING");
  });

  it("proponuje zmianę kategorii, ale nie przy wstrzymanym ogłoszeniu", () => {
    const a = planModeration(verdict({ suggestedCategory: "frezarki" }), facts);
    expect(a).toEqual([expect.objectContaining({ kind: "CHANGE_CATEGORY", payload: { category: "frezarki" } })]);
    expect(planModeration(verdict({ suggestedCategory: "tokarki" }), facts)).toEqual([]);
    expect(planModeration(verdict({ decision: "hide", suggestedCategory: "frezarki" }), facts).map((x) => x.kind)).toEqual(["HIDE_LISTING"]);
  });
});

describe("companyNameMatches", () => {
  it("pomija formę prawną, wielkość liter i polskie znaki", () => {
    expect(companyNameMatches("Maszyny-Pol sp. z o.o.", "MASZYNY-POL SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ")).toBe(true);
    expect(companyNameMatches("Obróbka Łódź", "OBROBKA LODZ S.A.")).toBe(true);
  });

  it("akceptuje JDG z imieniem i nazwiskiem w rejestrze", () => {
    expect(companyNameMatches("CNC-Serwis", "JAN KOWALSKI CNC-SERWIS")).toBe(true);
    expect(companyNameMatches("Jan Kowalski", "JAN KOWALSKI PPUH CNC-SERWIS")).toBe(true);
  });

  it("odrzuca inną firmę", () => {
    expect(companyNameMatches("Tokarex", "FREZEX SP. Z O.O.")).toBe(false);
    expect(companyNameMatches("", "FREZEX")).toBe(false);
  });
});

describe("assessCompany", () => {
  const subject = { name: "TOKAREX SP. Z O.O.", nip: "5260250274", statusVat: "Czynny", workingAddress: "UL. PROSTA 1, 00-001 WARSZAWA" };

  it("czynny podatnik z pasującą nazwą dostaje propozycję odznaki", () => {
    const a = assessCompany("Tokarex", subject.nip, subject);
    expect(a.kind).toBe("VERIFY_COMPANY");
    expect(a.reasoning).toContain("UL. PROSTA 1");
  });

  it("brak w wykazie, inna nazwa albo nieczynny VAT to ostrzeżenie", () => {
    expect(assessCompany("Tokarex", subject.nip, null).kind).toBe("FLAG_COMPANY");
    expect(assessCompany("Frezex", subject.nip, subject).kind).toBe("FLAG_COMPANY");
    expect(assessCompany("Tokarex", subject.nip, { ...subject, statusVat: "Niezarejestrowany" }).kind).toBe("FLAG_COMPANY");
  });
});

describe("costMicroUsd", () => {
  it("liczy koszt według cennika modelu", () => {
    expect(costMicroUsd("claude-opus-5-5", 1_000_000, 0)).toBe(4_000_000);
    expect(costMicroUsd("claude-haiku-5-5", 10_000, 1_000)).toBe(1_500);
    expect(costMicroUsd("nieznany", 1_000, 0)).toBe(4_000);
  });
});

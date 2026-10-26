// Podmiot z Wykazu podatników VAT (Biała lista Ministerstwa Finansów)
export type WlSubject = {
  name: string;
  nip: string;
  statusVat: string | null;
  regon?: string | null;
  krs?: string | null;
  workingAddress?: string | null;
  residenceAddress?: string | null;
  registrationLegalDate?: string | null;
};

// słowa formy prawnej pomijane przy porównywaniu nazw
const LEGAL_WORDS = new Set([
  "sp", "spolka", "z", "o", "oo", "ograniczona", "odpowiedzialnoscia", "sa", "akcyjna", "komandytowa", "komandytowoakcyjna",
  "jawna", "cywilna", "partnerska", "sk", "ska", "spj", "spk", "spzoo", "zoo", "ppuh", "phu", "fhu", "pphu", "firma", "i", "w",
  "przedsiebiorstwo", "handlowo", "uslugowe", "produkcyjno", "handlowe", "uslugowo",
]);

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/sp\.\s*z\s*o\.\s*o\.?/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !LEGAL_WORDS.has(t));
}

/**
 * Czy nazwa podana przy rejestracji odpowiada nazwie z rejestru. Wystarczy, że wszystkie istotne słowa
 * jednej nazwy występują w drugiej (rejestr JDG zawiera też imię i nazwisko właściciela).
 */
export function companyNameMatches(given: string, registry: string): boolean {
  const a = nameTokens(given);
  const b = nameTokens(registry);
  if (a.length === 0 || b.length === 0) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  return a.every((t) => sb.has(t)) || b.every((t) => sa.has(t));
}

export type CompanyAssessment = {
  kind: "VERIFY_COMPANY" | "FLAG_COMPANY";
  summary: string;
  reasoning: string;
};

export function assessCompany(givenName: string, nip: string, s: WlSubject | null): CompanyAssessment {
  if (!s) {
    return {
      kind: "FLAG_COMPANY",
      summary: `NIP ${nip} nie figuruje w wykazie podatników VAT`,
      reasoning: "Firma nie występuje w Białej liście VAT. Może być nowa, wykreślona albo NIP jest błędny. Poproś o dokument rejestrowy przed nadaniem odznaki dealera.",
    };
  }
  const details = [
    `Nazwa w rejestrze: ${s.name}`,
    `Status VAT: ${s.statusVat ?? "brak"}`,
    s.workingAddress || s.residenceAddress ? `Adres: ${s.workingAddress || s.residenceAddress}` : null,
    s.regon ? `REGON: ${s.regon}` : null,
    s.krs ? `KRS: ${s.krs}` : null,
    s.registrationLegalDate ? `Zarejestrowana jako podatnik VAT: ${s.registrationLegalDate}` : null,
  ].filter(Boolean).join("\n");
  const matches = companyNameMatches(givenName, s.name);
  const status = s.statusVat ?? "";
  if (!matches) {
    return {
      kind: "FLAG_COMPANY",
      summary: `Nazwa „${givenName}” nie zgadza się z rejestrem (${s.name})`,
      reasoning: `NIP należy do innej nazwy niż podana przy rejestracji. Możliwa pomyłka albo podszywanie się pod firmę.\n${details}`,
    };
  }
  if (status === "Czynny" || status === "Zwolniony") {
    return {
      kind: "VERIFY_COMPANY",
      summary: `${s.name}: ${status === "Czynny" ? "czynny podatnik VAT" : "zwolniona z VAT"}, nazwa się zgadza`,
      reasoning: `${status === "Zwolniony" ? "Firma jest zwolniona z VAT, więc nie wystawi faktury z VAT. " : ""}Firma potwierdzona w Białej liście VAT.\n${details}`,
    };
  }
  return {
    kind: "FLAG_COMPANY",
    summary: `${s.name}: status VAT „${status || "brak"}”`,
    reasoning: `Firma nie jest czynnym podatnikiem VAT (mogła zostać wykreślona). Sprawdź przed nadaniem odznaki.\n${details}`,
  };
}

import "server-only";
import { db } from "../db";
import { assessCompany, type WlSubject } from "./nip-rules";

const WL_API = "https://wl-api.mf.gov.pl/api/search/nip";

/** Pyta Białą listę VAT (bezpłatne API Ministerstwa Finansów). null = brak podmiotu w wykazie. */
export async function lookupNip(nip: string): Promise<WlSubject | null> {
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
  const res = await fetch(`${WL_API}/${nip}?date=${date}`, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!res.ok) throw new Error(`Biała lista VAT: HTTP ${res.status}`);
  const body = (await res.json()) as { result?: { subject?: WlSubject | null } };
  return body.result?.subject ?? null;
}

/**
 * Sprawdza NIP firmy i dodaje do kolejki propozycję nadania odznaki dealera albo ostrzeżenie.
 * Nie wymaga Claude API (dane z rejestru porównujemy regułami), więc działa też bez klucza.
 */
export async function checkCompany(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { nip: true, companyName: true, verified: true, nipCheckedAt: true } });
  if (!u?.nip || u.verified || u.nipCheckedAt) return null;
  let subject: WlSubject | null;
  try {
    subject = await lookupNip(u.nip);
  } catch (e) {
    console.error("agent: sprawdzenie NIP nie powiodło się", userId, e);
    return null;
  }
  const a = assessCompany(u.companyName ?? "", u.nip, subject);
  await db.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({ where: { id: userId, nipCheckedAt: null }, data: { nipCheckedAt: new Date() } });
    if (claimed.count === 0) return;
    await tx.agentAction.create({ data: { kind: a.kind, summary: a.summary.slice(0, 300), reasoning: a.reasoning, userId, payload: subject ?? undefined } });
  });
  return a;
}

/** Firmy zarejestrowane z NIP-em, których jeszcze nie sprawdzono. */
export async function checkCompaniesBacklog(limit = 25) {
  const users = await db.user.findMany({
    where: { nip: { not: null }, verified: false, nipCheckedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let done = 0;
  for (const { id } of users) if (await checkCompany(id)) done++;
  return done;
}

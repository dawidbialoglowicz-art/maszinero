// Agent na prawdziwym Postgresie z podstawionym Claude API (DATABASE_URL musi wskazywać bazę testową).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Verdict } from "@/lib/agent/moderation-rules";

// zwykła funkcja zamiast vi.fn(): szpieg vitest zgłasza odrzucone obietnice jako nieobsłużone
let calls = 0;
let respond: () => Promise<unknown> = async () => undefined;
const parse = () => { calls++; return respond(); };
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/agent/claude", async (orig) => ({
  ...(await orig<typeof import("@/lib/agent/claude")>()),
  agentEnabled: () => true,
  anthropic: () => ({ beta: { messages: { parse } } }),
}));

const { db } = await import("@/lib/db");
const { moderateListing } = await import("@/lib/agent/moderation");
const { decideAction } = await import("@/lib/agent/decisions");

const run = process.env.DATABASE_URL?.includes("test") ? describe : describe.skip;

let seller: string;
let admin: string;

function reply(v: Verdict) {
  return { model: "claude-opus-5-5", stop_reason: "end_turn", parsed_output: v, usage: { input_tokens: 1000, output_tokens: 100 } };
}

async function newListing(title = "Agent test") {
  return db.listing.create({
    data: { title, category: "tokarki", brand: "DMG", model: "CTX", year: 2015, priceNet: 100_000, voivodeship: "mazowieckie", city: "Warszawa", description: "x".repeat(30), userId: seller },
  });
}

run("agent (baza)", () => {
  beforeAll(async () => {
    await db.user.deleteMany({ where: { email: { endsWith: "@agent.test.maszinero" } } });
    seller = (await db.user.create({ data: { email: "seller@agent.test.maszinero", name: "Sprzedawca", passwordHash: "x" } })).id;
    admin = (await db.user.create({ data: { email: "admin@agent.test.maszinero", name: "Admin", passwordHash: "x", role: "ADMIN" } })).id;
  });
  beforeEach(() => { calls = 0; });
  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { endsWith: "@agent.test.maszinero" } } });
  });

  it("wstrzymuje spam, a odrzucenie decyzji przywraca ogłoszenie", async () => {
    const l = await newListing();
    respond = async () => reply({ decision: "hide", summary: "Reklama", issues: [{ type: "spam", detail: "reklama" }], suggestedCategory: null });
    const actions = await moderateListing(l.id);
    expect(actions?.map((a) => a.kind)).toEqual(["HIDE_LISTING"]);
    expect((await db.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("HIDDEN");

    // drugie wywołanie (np. cron) nie sprawdza ponownie
    expect(await moderateListing(l.id)).toBeNull();
    expect(calls).toBe(1);

    const action = await db.agentAction.findFirstOrThrow({ where: { listingId: l.id } });
    expect(await decideAction(action.id, false, admin)).toEqual({ listingId: l.id });
    expect((await db.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("ACTIVE");
    expect((await decideAction(action.id, true, admin)).error).toBeDefined();
    expect((await db.agentRun.findFirstOrThrow({ where: { subjectId: l.id } })).costMicroUsd).toBe(6_000);
  });

  it("zatwierdzona zmiana kategorii jest wprowadzana", async () => {
    const l = await newListing();
    respond = async () => reply({ decision: "ok", summary: "Frezarka", issues: [], suggestedCategory: "frezarki" });
    await moderateListing(l.id);
    expect((await db.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("ACTIVE");
    const action = await db.agentAction.findFirstOrThrow({ where: { listingId: l.id, kind: "CHANGE_CATEGORY" } });
    await decideAction(action.id, true, admin);
    expect((await db.listing.findUniqueOrThrow({ where: { id: l.id } })).category).toBe("frezarki");
  });

  it("błąd API nie oznacza ogłoszenia jako sprawdzonego", async () => {
    const l = await newListing();
    respond = async () => { throw new Error("overloaded"); };
    expect(await moderateListing(l.id)).toBeNull();
    expect((await db.listing.findUniqueOrThrow({ where: { id: l.id } })).moderatedAt).toBeNull();
    expect((await db.agentRun.findFirstOrThrow({ where: { subjectId: l.id } })).error).toContain("overloaded");
  });
});

import { describe, expect, it } from "vitest";
import { bidIncrement, extendedEnd, maskName, minNextBid, resolveProxies, timeLeft, type Proxy } from "@/lib/auction-rules";

const t = (s: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, s));
const p = (userId: string, maxAmount: number, at = 0): Proxy => ({ userId, maxAmount, createdAt: t(at) });

describe("bidIncrement", () => {
  it.each([[0, 100], [9_999, 100], [10_000, 250], [49_999, 250], [50_000, 500], [100_000, 1_000], [499_999, 1_000], [500_000, 2_500]])(
    "przy %i zł przebicie %i zł",
    (price, inc) => expect(bidIncrement(price)).toBe(inc),
  );
});

describe("minNextBid", () => {
  it("pierwsza oferta może być równa cenie wywoławczej", () => expect(minNextBid({ startPrice: 5000, currentPrice: 5000, bidCount: 0 })).toBe(5000));
  it("kolejna musi przebić o próg", () => expect(minNextBid({ startPrice: 5000, currentPrice: 12000, bidCount: 3 })).toBe(12250));
});

describe("resolveProxies", () => {
  it("brak limitów to brak prowadzącego", () => expect(resolveProxies([], 1000, null)).toBeNull());

  it("jeden licytujący płaci cenę wywoławczą, nie swój limit", () => {
    expect(resolveProxies([p("a", 50_000)], 10_000, null)).toEqual({ leaderId: "a", price: 10_000 });
  });

  it("cena to drugi limit plus przebicie", () => {
    expect(resolveProxies([p("a", 50_000), p("b", 20_000, 1)], 10_000, null)).toEqual({ leaderId: "a", price: 20_250 });
  });

  it("cena nie przekracza limitu prowadzącego", () => {
    expect(resolveProxies([p("a", 20_100), p("b", 20_000, 1)], 10_000, null)).toEqual({ leaderId: "a", price: 20_100 });
  });

  it("przy remisie wygrywa wcześniejszy limit", () => {
    expect(resolveProxies([p("b", 30_000, 5), p("a", 30_000, 1)], 10_000, null)).toEqual({ leaderId: "a", price: 30_000 });
  });

  it("cena skacze do ceny minimalnej, gdy limit prowadzącego ją pokrywa", () => {
    expect(resolveProxies([p("a", 80_000)], 10_000, 60_000)).toEqual({ leaderId: "a", price: 60_000 });
    expect(resolveProxies([p("a", 80_000), p("b", 30_000, 1)], 10_000, 60_000)).toEqual({ leaderId: "a", price: 60_000 });
  });

  it("limit poniżej ceny minimalnej nie podnosi ceny do minimalnej", () => {
    expect(resolveProxies([p("a", 50_000)], 10_000, 60_000)).toEqual({ leaderId: "a", price: 10_000 });
  });

  it("nigdy nie schodzi poniżej ceny wywoławczej", () => {
    expect(resolveProxies([p("a", 9_000), p("b", 8_000, 1)], 10_000, null)!.price).toBeGreaterThanOrEqual(9_000);
  });
});

describe("extendedEnd (dogrywka)", () => {
  const end = t(600);
  it("oferta na długo przed końcem nie zmienia końca", () => expect(extendedEnd(t(0), end)).toEqual(end));
  it("oferta w ostatnich 2 minutach przedłuża do 2 minut od oferty", () => expect(extendedEnd(t(550), end)).toEqual(t(670)));
  it("dokładnie 2 minuty przed końcem nie przedłuża", () => expect(extendedEnd(t(480), end)).toEqual(end));
});

describe("teksty", () => {
  it("timeLeft", () => {
    expect(timeLeft(0)).toBe("zakończona");
    expect(timeLeft(45_000)).toBe("45 s");
    expect(timeLeft(3 * 3_600_000 + 12 * 60_000)).toBe("3 godz. 12 min");
    expect(timeLeft(86_400_000 + 4 * 3_600_000)).toBe("1 dzień 4 godz.");
    expect(timeLeft(2 * 86_400_000)).toBe("2 dni 0 godz.");
  });
  it("maskName ukrywa nazwisko licytującego", () => {
    expect(maskName("Marek Zieliński")).toBe("M***i");
    expect(maskName("Al")).toBe("A***");
  });
});

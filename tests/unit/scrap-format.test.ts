import { describe, expect, it } from "vitest";
import { formatPerKg, pricePerKg, qualifiesForScrap, SCRAP_MAX_PLN_PER_KG } from "@/lib/scrap";
import { leaseRate, num, plural } from "@/lib/format";

describe("cena złomu", () => {
  it("liczy cenę za kg", () => expect(pricePerKg(14_000, 17_000)).toBe(0.82));
  it("bez masy nie ma ceny za kg", () => {
    expect(pricePerKg(1000, null)).toBeNull();
    expect(pricePerKg(1000, 0)).toBeNull();
  });
  it("próg jest włącznie", () => {
    expect(qualifiesForScrap(SCRAP_MAX_PLN_PER_KG * 1000, 1000)).toBe(true);
    expect(qualifiesForScrap(SCRAP_MAX_PLN_PER_KG * 1000 + 10, 1000)).toBe(false);
  });
  it("formatuje z przecinkiem", () => expect(formatPerKg(0.8)).toBe("0,80 zł/kg"));
});

describe("format", () => {
  it("separator tysięcy także dla 4 cyfr", () => {
    expect(num(8200)).toBe("8 200");
    expect(num(1450000)).toBe("1 450 000");
    expect(num(950)).toBe("950");
  });
  it("polska odmiana", () => {
    expect(plural(1, "maszyna", "maszyny", "maszyn")).toBe("maszyna");
    expect(plural(3, "maszyna", "maszyny", "maszyn")).toBe("maszyny");
    expect(plural(5, "maszyna", "maszyny", "maszyn")).toBe("maszyn");
    expect(plural(12, "maszyna", "maszyny", "maszyn")).toBe("maszyn");
    expect(plural(22, "maszyna", "maszyny", "maszyn")).toBe("maszyny");
  });
  it("rata leasingu rośnie z ceną i jest zaokrąglona do 10 zł", () => {
    const r = leaseRate(100_000);
    expect(r % 10).toBe(0);
    expect(leaseRate(200_000)).toBeGreaterThan(r);
  });
});

import { describe, expect, it } from "vitest";
import { freePeriod, parseFreeUntil } from "@/lib/launch";

describe("okres bez opłat", () => {
  it("bez daty serwis jest bezpłatny i mówi o 6 miesiącach", () => {
    const f = freePeriod(new Date("2030-01-01"), undefined);
    expect(f).toMatchObject({ active: true, end: null, label: "przez pierwsze 6 miesięcy" });
  });

  it("odrzuca błędne daty", () => {
    for (const v of ["", "2027-02-30", "30.04.2027", "2027-4-30", "jutro"]) expect(parseFreeUntil(v)).toBeNull();
  });

  it("ostatni dzień jest bezpłatny do północy czasu polskiego (lato, UTC+2)", () => {
    const end = parseFreeUntil("2027-04-30")!;
    expect(end.toISOString()).toBe("2027-04-30T22:00:00.000Z");
    expect(freePeriod(new Date("2027-04-30T21:59:59Z"), "2027-04-30").active).toBe(true);
    expect(freePeriod(new Date("2027-04-30T22:00:00Z"), "2027-04-30").active).toBe(false);
  });

  it("zimą przesunięcie wynosi 1 h", () => {
    expect(parseFreeUntil("2027-01-31")!.toISOString()).toBe("2027-01-31T23:00:00.000Z");
  });

  it("podpis z datą", () => {
    expect(freePeriod(new Date("2027-01-01"), "2027-04-30").label).toBe("do 30 kwietnia 2027");
  });
});

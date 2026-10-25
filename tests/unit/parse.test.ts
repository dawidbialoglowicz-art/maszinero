import { describe, expect, it } from "vitest";
import { isListingBlobUrl, normalizeNip, normalizePhone, parseAmount, parseIntParam, safeNext, sniffImage } from "@/lib/parse";

describe("parseAmount", () => {
  it.each([
    ["245 000", 245000],
    ["245.000", 245000],
    ["245,000", 245000],
    ["1 450 000 zł", 1450000],
    ["245000,50", 245000],
    ["245 000.99", 245000],
    ["  89 900 PLN ", 89900],
    [" 12 400", 12400],
    [1500, 1500],
  ])("%s → %s", (input, out) => expect(parseAmount(input)).toBe(out));

  it.each(["", "abc", "-500", "12a", "99999999999999999999", null, undefined, "1e9"])("odrzuca %s", (input) => {
    expect(parseAmount(input)).toBeUndefined();
  });
});

describe("parseIntParam", () => {
  it("parsuje liczby ze spacjami", () => expect(parseIntParam("12 400")).toBe(12400));
  it("odrzuca ułamki i śmieci", () => {
    expect(parseIntParam("12.5")).toBeUndefined();
    expect(parseIntParam("x")).toBeUndefined();
    expect(parseIntParam("")).toBeUndefined();
  });
  it("pilnuje limitu", () => expect(parseIntParam("2101", 2100)).toBeUndefined());
  it("nie przepuszcza wartości poza zakresem kolumny Int", () => expect(parseIntParam("3000000000")).toBeUndefined());
});

describe("safeNext", () => {
  it.each(["/dodaj", "/ogloszenia?kategoria=tokarki", "/ogloszenia/abc#x"])("przepuszcza %s", (p) => expect(safeNext(p)).toBe(p));
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", "", null, "/\t/evil.com", 42])(
    "blokuje %s",
    (p) => expect(safeNext(p)).toBe("/"),
  );
});

describe("sniffImage", () => {
  const bytes = (...b: number[]) => new Uint8Array(b);
  it("rozpoznaje JPEG", () => expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg"));
  it("rozpoznaje PNG", () => expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png"));
  it("rozpoznaje WebP", () => expect(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp"));
  it("odrzuca HTML udający obraz", () => expect(sniffImage(new TextEncoder().encode("<html><script>"))).toBeNull());
  it("odrzuca pusty plik", () => expect(sniffImage(bytes())).toBeNull());
});

describe("isListingBlobUrl", () => {
  it("akceptuje zdjęcie z Vercel Blob", () =>
    expect(isListingBlobUrl("https://abc123.public.blob.vercel-storage.com/listings/9f2c-x1Y2z3.jpg")).toBe(true));
  it.each([
    "http://abc.public.blob.vercel-storage.com/listings/a.jpg",
    "https://evil.com/listings/a.jpg",
    "https://abc.public.blob.vercel-storage.com.evil.com/listings/a.jpg",
    "https://abc.public.blob.vercel-storage.com/other/a.jpg",
    "https://abc.public.blob.vercel-storage.com/listings/a.svg",
    "https://abc.public.blob.vercel-storage.com/listings/a.jpg?x=1",
    "javascript:alert(1)",
    "",
  ])("odrzuca %s", (u) => expect(isListingBlobUrl(u)).toBe(false));
});

describe("normalizeNip", () => {
  it("akceptuje poprawny NIP w różnych zapisach", () => {
    expect(normalizeNip("526-025-02-74")).toBe("5260250274");
    expect(normalizeNip("PL 5260250274")).toBe("5260250274");
  });
  it("odrzuca złą sumę kontrolną i długość", () => {
    expect(normalizeNip("5260250275")).toBeNull();
    expect(normalizeNip("123")).toBeNull();
    expect(normalizeNip("1234567890")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("akceptuje polskie formaty", () => {
    expect(normalizePhone("+48 600 100 200")).toBe("+48 600 100 200");
    expect(normalizePhone("600-100-200")).toBe("600-100-200");
    expect(normalizePhone("(22) 123 45 67")).toBe("(22) 123 45 67");
  });
  it("odrzuca litery i za krótkie numery", () => {
    expect(normalizePhone("600 abc")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

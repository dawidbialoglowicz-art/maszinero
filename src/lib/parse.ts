// Czyste funkcje parsujące dane od użytkownika (bez zależności od serwera, testowane jednostkowo)

// Górna granica kolumn Int w Postgresie to 2 147 483 647; wartości powyżej odrzucamy
export const MAX_INT = 2_000_000_000;

/**
 * Kwota w złotych wpisana przez człowieka: "245 000", "245.000", "245000,50", "1 450 000 zł".
 * Końcówka ",xx" lub ".xx" (1–2 cyfry) to grosze i jest pomijana; pozostałe kropki, spacje
 * i przecinki traktujemy jako separatory tysięcy.
 */
export function parseAmount(input: unknown): number | undefined {
  if (typeof input !== "string" && typeof input !== "number") return undefined;
  let s = String(input).trim().replace(/\s| |zł|pln/gi, "");
  if (!s || s.startsWith("-")) return undefined;
  s = s.replace(/[.,]\d{1,2}$/, "");
  if (!/^[\d.,]+$/.test(s)) return undefined;
  const digits = s.replace(/[.,]/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n <= MAX_INT ? n : undefined;
}

/** Liczba całkowita z parametru adresu lub pola formularza; śmieci i wartości spoza zakresu dają undefined. */
export function parseIntParam(input: unknown, max = MAX_INT): number | undefined {
  if (typeof input !== "string" && typeof input !== "number") return undefined;
  const s = String(input).replace(/[\s ]/g, "");
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isSafeInteger(n) && n <= max ? n : undefined;
}

/**
 * Bezpieczny adres powrotu po logowaniu: tylko ścieżka w obrębie serwisu.
 * Odrzuca "//evil.com", "/\evil.com" i adresy z protokołem, które przeglądarka potraktowałaby jako zewnętrzne.
 */
export function safeNext(input: unknown): string {
  const s = typeof input === "string" ? input : "";
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("\\") || /[\u0000-\u001f]/.test(s)) return "/";
  try {
    const url = new URL(s, "https://maszinero.invalid");
    if (url.origin !== "https://maszinero.invalid") return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/** Rozpoznaje format po pierwszych bajtach pliku, bo typ MIME podany przez przeglądarkę można podrobić. */
export function sniffImage(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

/** Adres zdjęcia ogłoszenia wgranego bezpośrednio do Vercel Blob przez przeglądarkę. */
export function isListingBlobUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      /^\/listings\/[\w.-]+\.(jpg|png|webp)$/.test(url.pathname) &&
      !url.search && !url.hash
    );
  } catch {
    return false;
  }
}

/** Telefon: cyfry, spacje, myślniki, nawiasy i opcjonalny + na początku; 9–15 cyfr. */
export function normalizePhone(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (!/^\+?[\d\s()-]+$/.test(s)) return null;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? s.replace(/\s+/g, " ") : null;
}

/** NIP: 10 cyfr z poprawną sumą kontrolną (wagi 6,5,7,2,3,4,5,6,7). Zwraca same cyfry albo null. */
export function normalizeNip(input: string): string | null {
  const d = input.replace(/^PL/i, "").replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(d)) return null;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((acc, wi, i) => acc + wi * Number(d[i]), 0);
  return sum % 11 === Number(d[9]) ? d : null;
}

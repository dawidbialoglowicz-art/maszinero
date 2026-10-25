// Scenariusze end-to-end na zbudowanej aplikacji z danymi demo (npm run db:seed z DEMO_PASSWORD).
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo12345";
const photo = path.join(__dirname, "fixtures", "maszyna.jpg");
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

async function login(page: Page, email: string) {
  await page.goto("/logowanie");
  await page.fill("#email", email);
  await page.fill("#password", DEMO_PASSWORD);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/logowanie"));
}

async function register(page: Page, opts: { company?: boolean } = {}) {
  await page.goto("/rejestracja?next=/dodaj");
  if (opts.company) {
    await page.locator(".seg label", { hasText: "Firma" }).click();
    await page.fill("#companyName", "Test Sp. z o.o.");
    await page.fill("#nip", "526-025-02-74");
  }
  await page.fill("#name", "Test Testowy");
  await page.fill("#email", `e2e${uniq()}@test.maszinero`);
  await page.fill("#phone", "+48 500 100 200");
  await page.fill("#password", "haslo12345");
  await page.getByRole("button", { name: "Załóż konto" }).click();
  await page.waitForURL("**/dodaj");
}

async function fillMachine(page: Page, brand: string) {
  await page.selectOption("#category", "tokarki");
  await page.fill("#brand", brand);
  await page.fill("#model", "CTX 310");
  await page.fill("#year", "2015");
  await page.fill("#hours", "12 400");
  await page.fill("#controlSystem", "Siemens 840D");
  await page.selectOption("#voivodeship", "pomorskie");
  await page.fill("#city", "Gdynia");
  await page.fill("#description", "Tokarka CNC w dobrym stanie, serwisowana, do obejrzenia pod prądem.");
}

test("strona główna pokazuje trzy działy i działa wyszukiwarka", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  const pillars = page.locator(".pillars");
  await expect(pillars.getByRole("link", { name: /Maszyny na sprzedaż/ })).toBeVisible();
  await expect(pillars.getByRole("link", { name: /Aukcje/ })).toBeVisible();
  await expect(pillars.getByRole("link", { name: /Maszyny w cenie złomu/ })).toBeVisible();
  await page.fill("#q", "tokarka siemens");
  await page.getByRole("button", { name: "Szukaj" }).click();
  await page.waitForURL(/\/ogloszenia\?/);
  await expect(page.locator(".card h3")).toContainText(["DMG Mori CTX 510 ecoline"]);
  expect(errors).toEqual([]);
});

test("filtry i sortowanie zmieniają wyniki", async ({ page }) => {
  await page.goto("/ogloszenia");
  const all = await page.locator(".card").count();
  await page.selectOption("#f-kat", "frezarki");
  await page.waitForURL(/kategoria=frezarki/);
  await expect(page.locator(".bar h2")).toContainText("Frezarki");
  expect(await page.locator(".card").count()).toBeLessThan(all);
  await page.goto("/ogloszenia?sort=pa");
  const prices = await page.locator(".price strong").allTextContents();
  const nums = prices.map((p) => Number(p.replace(/\D/g, "")));
  expect(nums).toEqual([...nums].sort((a, b) => a - b));
});

test("dział złomu pokazuje tylko maszyny do 2 zł/kg", async ({ page }) => {
  await page.goto("/cena-zlomu");
  const cards = page.locator(".card");
  expect(await cards.count()).toBeGreaterThan(0);
  for (const perKg of await page.locator(".card .lease b").allTextContents()) {
    if (!perKg.includes("zł/kg")) continue;
    expect(Number(perKg.replace(" zł/kg", "").replace(",", "."))).toBeLessThanOrEqual(2);
  }
});

test("rejestracja firmy i dodanie ogłoszenia ze zdjęciem", async ({ page }) => {
  const errors = trackErrors(page);
  await register(page, { company: true });
  await fillMachine(page, `TestBrand${uniq()}`);
  await page.fill("#priceNet", "245 000");
  await page.fill("#weightKg", "5 200");
  await page.setInputFiles("#photos", [photo]);
  await expect(page.locator(".pv img")).toHaveCount(1);
  await page.getByRole("button", { name: "Opublikuj ogłoszenie" }).click();
  await page.waitForURL(/\/ogloszenia\/.+\?dodano=1/);
  await expect(page.getByText("Ogłoszenie zostało opublikowane.")).toBeVisible();
  await expect(page.locator(".spec-table")).toContainText("12 400 h");
  await expect(page.locator(".spec-table")).toContainText("Siemens 840D");
  // zdjęcie wczytało się naprawdę
  const img = page.locator(".gallery .main img");
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("dział złomu odrzuca zbyt drogą maszynę", async ({ page }) => {
  await register(page);
  await fillMachine(page, `Zlom${uniq()}`);
  await page.fill("#priceNet", "50 000");
  await page.fill("#weightKg", "5 000");
  await page.getByLabel(/Dodaj do działu/).check();
  await expect(page.getByText("10,00 zł/kg, za dużo")).toBeVisible();
  await page.getByRole("button", { name: "Opublikuj ogłoszenie" }).click();
  await expect(page.locator(".alert.err")).toContainText("najwyżej 2 zł/kg");
  // formularz zachowuje wpisane dane
  await expect(page.locator("#city")).toHaveValue("Gdynia");
});

test("aukcja: wystawienie, licytacja z limitem i blokada licytowania własnej maszyny", async ({ page, browser }) => {
  await register(page);
  const brand = `Aukcja${uniq()}`;
  await fillMachine(page, brand);
  await page.locator(".seg label", { hasText: "Aukcja" }).click();
  await page.fill("#startPrice", "20 000");
  await page.fill("#reservePrice", "30 000");
  await page.selectOption("#durationDays", "3");
  await page.getByRole("button", { name: "Rozpocznij aukcję" }).click();
  await page.waitForURL(/\/ogloszenia\/.+\?dodano=1/);
  await expect(page.getByText("Aukcja wystartowała.")).toBeVisible();
  await expect(page.getByText("To Twoja aukcja. Nie możesz w niej licytować.")).toBeVisible();
  const url = page.url().split("?")[0];

  const ctx = await browser.newContext();
  const buyer = await ctx.newPage();
  await login(buyer, "demo-kupujacy@maszinero.pl");
  await buyer.goto(url);
  await buyer.fill("#amount", "35 000");
  await buyer.getByRole("button", { name: "Licytuj" }).click();
  await expect(buyer.getByRole("status")).toContainText("Prowadzisz");
  // cena skacze do ceny minimalnej, bo limit ją pokrywa
  await expect(buyer.locator(".bid .big-price")).toHaveText("30 000 zł");
  await expect(buyer.getByText("cena minimalna osiągnięta")).toBeVisible();

  const ctx2 = await browser.newContext();
  const rival = await ctx2.newPage();
  await login(rival, "demo-kupujacy2@maszinero.pl");
  await rival.goto(url);
  await rival.fill("#amount", "31 000");
  await rival.getByRole("button", { name: "Licytuj" }).click();
  await expect(rival.getByRole("status")).toContainText("przebita");
  await expect(rival.locator(".bid .big-price")).toHaveText("31 250 zł");
  await expect(rival.locator(".bids")).toContainText("automatycznie");
  await ctx.close();
  await ctx2.close();
});

test("kontakt do sprzedawcy jest dopiero po kliknięciu", async ({ page }) => {
  await page.goto("/ogloszenia?q=Haas");
  await page.locator(".card .cover").first().click();
  await page.waitForURL(/\/ogloszenia\/.+/);
  expect(await page.content()).not.toContain("demo-zaklad@maszinero.pl");
  await page.getByRole("button", { name: "Pokaż telefon i e-mail" }).click();
  await expect(page.getByText("demo-zaklad@maszinero.pl")).toBeVisible();
});

test("logowanie: złe hasło i ochrona przed przekierowaniem na obcą stronę", async ({ page }) => {
  await page.goto("/logowanie?next=//evil.com");
  await page.fill("#email", "demo-dealer@maszinero.pl");
  await page.fill("#password", "zle-haslo");
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await expect(page.locator(".alert.err")).toContainText("Nieprawidłowy e-mail lub hasło");
  await page.fill("#password", DEMO_PASSWORD);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await page.waitForURL((u) => u.host.startsWith("localhost") && u.pathname === "/");
});

test("strony chronione wymagają logowania", async ({ page }) => {
  for (const p of ["/dodaj", "/moje", "/konto", "/obserwowane"]) {
    await page.goto(p);
    await expect(page).toHaveURL(new RegExp(`/logowanie\\?next=${encodeURIComponent(p)}`));
  }
});

test("telefon: brak poziomego przewijania na kluczowych stronach", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const p of ["/", "/ogloszenia", "/aukcje", "/cena-zlomu", "/logowanie", "/rejestracja"]) {
    await page.goto(p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, p).toBeLessThanOrEqual(0);
  }
});

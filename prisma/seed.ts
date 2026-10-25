// Dane demonstracyjne do testów i prezentacji: npm run db:seed
// Hasło kont demo bierzemy z DEMO_PASSWORD; bez niej generujemy losowe i wypisujemy je w konsoli.
// Na produkcji seed odmawia działania, chyba że ustawisz ALLOW_DEMO_SEED=1.
import { PrismaClient, type Condition } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const db = new PrismaClient();
const day = 86_400_000;
const hour = 3_600_000;

const SELLERS = [
  { email: "demo-dealer@maszinero.pl", name: "Jan Kowalski", companyName: "CNC Trade Wielkopolska Sp. z o.o. (demo)", nip: "7822622168", phone: "+48 601 234 567", accountType: "DEALER" as const, verified: true },
  { email: "demo-zaklad@maszinero.pl", name: "Anna Nowak", companyName: "Zakład Mechaniczny Śląsk (demo)", nip: "6340197391", phone: "+48 602 345 678", accountType: "COMPANY" as const, verified: true },
  { email: "demo-kupujacy@maszinero.pl", name: "Piotr Wiśniewski", phone: "+48 603 456 789", accountType: "PRIVATE" as const, verified: false },
  { email: "demo-kupujacy2@maszinero.pl", name: "Marek Zieliński", phone: "+48 604 567 890", accountType: "COMPANY" as const, verified: false, companyName: "Narzędziownia Zieliński (demo)", nip: "5260250274" },
];

type Row = {
  brand: string; model: string; category: string; year: number; hours: number | null; control: string | null; param: string;
  price: number; weight: number | null; city: string; woj: string; seller: 0 | 1; daysAgo: number;
  condition?: Condition; scrap?: boolean; auction?: { hoursLeft: number; reserve?: number; bids?: number[] };
};

const ROWS: Row[] = [
  { brand: "DMG Mori", model: "CTX 510 ecoline", category: "tokarki", year: 2012, hours: 21400, control: "Siemens 840D", param: "Ø toczenia 465 mm", price: 189000, weight: 6800, city: "Poznań", woj: "wielkopolskie", seller: 0, daysAgo: 1 },
  { brand: "Haas", model: "VF-2SS", category: "frezarki", year: 2016, hours: 9800, control: "Haas NGC", param: "X 762 mm", price: 239000, weight: 3700, city: "Bielsko-Biała", woj: "śląskie", seller: 1, daysAgo: 2 },
  { brand: "Mazak", model: "Variaxis i-600", category: "frezarki", year: 2018, hours: 14100, control: "Mazatrol SmoothX", param: "5 osi", price: 690000, weight: 14500, city: "Wrocław", woj: "dolnośląskie", seller: 0, daysAgo: 0, auction: { hoursLeft: 50, reserve: 720000, bids: [690000, 700000] } },
  { brand: "Trumpf", model: "TruLaser 3030", category: "lasery", year: 2010, hours: 38200, control: "Siemens 840D", param: "laser CO₂ 4 kW", price: 249000, weight: 11500, city: "Rzeszów", woj: "podkarpackie", seller: 0, daysAgo: 3, auction: { hoursLeft: 5, bids: [249000, 252000, 260000] } },
  { brand: "Amada", model: "HFE 100-3", category: "obrobka-blach", year: 2008, hours: null, control: "Amada NC9-EX II", param: "nacisk 100 t, 3 m", price: 98000, weight: 7600, city: "Łódź", woj: "łódzkie", seller: 1, daysAgo: 4 },
  { brand: "Engel", model: "Victory 200/80", category: "wtryskarki", year: 2006, hours: 61000, control: "CC100", param: "siła zamykania 80 t", price: 69000, weight: 5200, city: "Bydgoszcz", woj: "kujawsko-pomorskie", seller: 1, daysAgo: 6 },
  { brand: "Kaeser", model: "SM 15", category: "sprezarki", year: 2015, hours: 18900, control: null, param: "11 kW, 1,5 m³/min", price: 14900, weight: 290, city: "Kraków", woj: "małopolskie", seller: 0, daysAgo: 2 },
  { brand: "Linde", model: "H30D", category: "wozki-widlowe", year: 2019, hours: 4100, control: null, param: "udźwig 3 t", price: 69900, weight: 4300, city: "Gliwice", woj: "śląskie", seller: 1, daysAgo: 1 },
  { brand: "Demag", model: "suwnica dwudźwigarowa 10 t", category: "suwnice", year: 2004, hours: null, control: null, param: "rozpiętość 18 m", price: 59000, weight: 9800, city: "Katowice", woj: "śląskie", seller: 1, daysAgo: 8, auction: { hoursLeft: 120 } },
  { brand: "Homag", model: "Ambition 1440 FC", category: "drewno", year: 2014, hours: 16000, control: "PowerTouch", param: "okleiniarka", price: 159000, weight: 4200, city: "Swarzędz", woj: "wielkopolskie", seller: 0, daysAgo: 5 },
  // dział "Maszyny w cenie złomu" (≤ 2 zł/kg)
  { brand: "TOS", model: "SU 50A", category: "tokarki", year: 1978, hours: null, control: null, param: "rozstaw kłów 3000 mm", price: 6500, weight: 4500, city: "Siedlce", woj: "mazowieckie", seller: 1, daysAgo: 0, condition: "WORKING", scrap: true },
  { brand: "Weingarten", model: "prasa mimośrodowa 160 t", category: "prasy", year: 1985, hours: null, control: null, param: "nacisk 160 t", price: 14000, weight: 17000, city: "Ostrów Wielkopolski", woj: "wielkopolskie", seller: 0, daysAgo: 2, condition: "NEEDS_REPAIR", scrap: true },
  { brand: "Arburg", model: "Allrounder 470C", category: "wtryskarki", year: 1999, hours: 92000, control: "Selogica", param: "siła zamykania 100 t", price: 9500, weight: 5600, city: "Gdańsk", woj: "pomorskie", seller: 1, daysAgo: 3, condition: "FOR_PARTS", scrap: true },
  { brand: "Avia", model: "FNE 50", category: "frezarki", year: 1982, hours: null, control: null, param: "stół 1600 × 400 mm", price: 3000, weight: 2900, city: "Olsztyn", woj: "warmińsko-mazurskie", seller: 0, daysAgo: 1, condition: "WORKING", scrap: true, auction: { hoursLeft: 26, bids: [3000, 3200] } },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
    throw new Error("Seed demo jest zablokowany na produkcji. Ustaw ALLOW_DEMO_SEED=1, jeśli naprawdę tego chcesz.");
  }
  const password = process.env.DEMO_PASSWORD || randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  const users = [];
  for (const s of SELLERS) {
    users.push(await db.user.upsert({ where: { email: s.email }, update: { passwordHash }, create: { ...s, passwordHash } }));
  }
  // licytujący na zmianę: ostatnią ofertę ma kupujący z indeksu (liczba ofert - 1) % 2
  const buyers = [users[2], users[3]];
  await db.listing.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });

  for (const r of ROWS) {
    const createdAt = new Date(Date.now() - r.daysAgo * day);
    const listing = await db.listing.create({
      data: {
        title: `${r.brand} ${r.model}`, brand: r.brand, model: r.model, category: r.category, year: r.year,
        hours: r.hours, controlSystem: r.control, keyParam: r.param, weightKg: r.weight,
        condition: r.condition ?? "WORKING", scrapPrice: r.scrap ?? false,
        priceNet: r.auction?.bids?.at(-1) ?? r.price, vatInvoice: true, city: r.city, voivodeship: r.woj,
        serialNumber: `${r.brand.replace(/\W/g, "").slice(0, 3).toUpperCase()}-${r.year}-${String(r.price).slice(0, 4)}`,
        saleType: r.auction ? "AUCTION" : "FIXED",
        description: `${r.brand} ${r.model}, rok ${r.year}. ${r.scrap ? "Maszyna sprzedawana w cenie złomu. " : ""}Możliwość prezentacji pod prądem po wcześniejszym kontakcie. Pomagamy w załadunku. Faktura VAT 23%.\n\n(Ogłoszenie demonstracyjne.)`,
        userId: users[r.seller].id,
        createdAt,
      },
    });
    if (r.auction) {
      const endsAt = new Date(Date.now() + r.auction.hoursLeft * hour);
      const bids = r.auction.bids ?? [];
      const bidder = (i: number) => buyers[i % 2];
      const maxBy = new Map<string, number>();
      bids.forEach((amount, i) => maxBy.set(bidder(i).id, amount));
      await db.auction.create({
        data: {
          listingId: listing.id, startPrice: r.price, currentPrice: bids.at(-1) ?? r.price, reservePrice: r.auction.reserve ?? null,
          bidCount: bids.length, leaderId: bids.length ? bidder(bids.length - 1).id : null, endsAt, originalEndsAt: endsAt, startsAt: createdAt,
          bids: { create: bids.map((amount, i) => ({ userId: bidder(i).id, amount, createdAt: new Date(createdAt.getTime() + (i + 1) * hour) })) },
          proxyBids: { create: [...maxBy].map(([userId, maxAmount]) => ({ userId, maxAmount })) },
        },
      });
    }
  }
  console.log(`Dodano ${ROWS.length} ogłoszeń demo. Konta: ${SELLERS.map((s) => s.email).join(", ")}. Hasło: ${password}`);
}

main().finally(() => db.$disconnect());

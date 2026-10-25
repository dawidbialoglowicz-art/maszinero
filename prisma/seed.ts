// Dane demonstracyjne: npm run db:seed (hasło kont demo: demo12345)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const day = 86_400_000;

const SELLERS = [
  { email: "demo-dealer@maszinero.pl", name: "Jan Kowalski", companyName: "Maszyny Budowlane Wielkopolska Sp. z o.o.", nip: "7811234567", phone: "+48 601 234 567", accountType: "DEALER" as const, verified: true },
  { email: "demo-agro@maszinero.pl", name: "Anna Nowak", companyName: "AgroTech Warmia", nip: "7391234568", phone: "+48 602 345 678", accountType: "DEALER" as const, verified: true },
  { email: "demo-prywatny@maszinero.pl", name: "Piotr Wiśniewski", phone: "+48 603 456 789", accountType: "PRIVATE" as const, verified: false },
];

const L = [
  ["Caterpillar", "320 GC", "koparki", 2019, 6420, null, "110 kW", 389000, "Poznań", "wielkopolskie", 0, 1],
  ["JCB", "3CX Sitemaster", "koparki", 2017, 7850, null, "55 kW", 219000, "Kraków", "małopolskie", 0, 3],
  ["Volvo", "EC220E", "koparki", 2021, 3100, null, "129 kW", 545000, "Warszawa", "mazowieckie", 0, 2],
  ["John Deere", "6155R", "ciagniki", 2020, 2980, null, "114 kW", 612000, "Olsztyn", "warmińsko-mazurskie", 1, 1],
  ["Ursus", "C-360", "ciagniki", 1985, 9400, null, "38 kW", 24500, "Siedlce", "mazowieckie", 2, 5],
  ["New Holland", "T7.270", "ciagniki", 2018, 5600, null, "199 kW", 398000, "Bydgoszcz", "kujawsko-pomorskie", 1, 6],
  ["Claas", "Lexion 760", "maszyny-rolnicze", 2016, 2450, null, "390 kW", 829000, "Szczecin", "zachodniopomorskie", 1, 4],
  ["Linde", "H30D", "wozki-widlowe", 2019, 4100, null, "udźwig 3 t", 69900, "Łódź", "łódzkie", 0, 2],
  ["Toyota", "8FBE16T", "wozki-widlowe", 2015, 9800, null, "udźwig 1,6 t", 32000, "Wrocław", "dolnośląskie", 2, 7],
  ["Liebherr", "LTM 1060-3.1", "dzwigi", 2014, 11200, null, "60 t", 1450000, "Katowice", "śląskie", 0, 3],
  ["DMG Mori", "CMX 600 V", "obrabiarki", 2020, 6100, null, "oś X 600 mm", 420000, "Rzeszów", "podkarpackie", 0, 2],
  ["Haas", "VF-2", "obrabiarki", 2012, 15400, null, "oś X 762 mm", 139000, "Bielsko-Biała", "śląskie", 2, 8],
  ["Komatsu", "WA320-8", "ladowarki", 2020, 4300, null, "125 kW", 465000, "Lublin", "lubelskie", 0, 1],
  ["Manitou", "MLT 737-130", "ladowarki", 2018, 5200, null, "udźwig 3,7 t", 209000, "Białystok", "podlaskie", 1, 4],
  ["Mercedes-Benz", "Arocs 3345 wywrotka", "pojazdy-uzytkowe", 2017, null, 412000, "330 kW", 259000, "Gdańsk", "pomorskie", 0, 5],
  ["Bobcat", "E35z", "koparki", 2022, 860, null, "18 kW", 189000, "Opole", "opolskie", 0, 0],
] as const;

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 12);
  const users = [];
  for (const s of SELLERS) {
    users.push(await db.user.upsert({ where: { email: s.email }, update: {}, create: { ...s, passwordHash } }));
  }
  await db.listing.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  for (const [brand, model, category, year, hours, km, keyParam, price, city, woj, seller, daysAgo] of L) {
    const privateSale = seller === 2;
    await db.listing.create({
      data: {
        title: `${brand} ${model}`, brand, model, category, year, hours, mileageKm: km, keyParam,
        priceNet: price, vatInvoice: !privateSale, city, voivodeship: woj,
        serialNumber: privateSale ? null : `${brand.slice(0, 3).toUpperCase()}${year}${String(price).slice(0, 4)}`,
        description: `${brand} ${model}, rok ${year}. Maszyna sprawna, gotowa do pracy, serwisowana regularnie. Możliwość oględzin i jazdy próbnej po wcześniejszym kontakcie. ${privateSale ? "Sprzedaż prywatna." : "Wystawiamy fakturę VAT 23%. Pomagamy w organizacji transportu i leasingu."}\n\n(Ogłoszenie demonstracyjne.)`,
        userId: users[seller].id,
        createdAt: new Date(Date.now() - daysAgo * day),
      },
    });
  }
  console.log(`Dodano ${L.length} ogłoszeń demo.`);
}

main().finally(() => db.$disconnect());

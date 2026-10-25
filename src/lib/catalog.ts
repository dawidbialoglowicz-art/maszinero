export const CATEGORIES = [
  { id: "koparki", name: "Koparki", icon: "kop" },
  { id: "ladowarki", name: "Ładowarki", icon: "lad" },
  { id: "ciagniki", name: "Ciągniki rolnicze", icon: "cia" },
  { id: "maszyny-rolnicze", name: "Kombajny i maszyny rolnicze", icon: "agr" },
  { id: "wozki-widlowe", name: "Wózki widłowe", icon: "wozek" },
  { id: "dzwigi", name: "Dźwigi i żurawie", icon: "dzwig" },
  { id: "obrabiarki", name: "Obrabiarki CNC", icon: "cnc" },
  { id: "pojazdy-uzytkowe", name: "Pojazdy użytkowe", icon: "kom" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const VOIVODESHIPS = [
  "dolnośląskie", "kujawsko-pomorskie", "lubelskie", "lubuskie", "łódzkie", "małopolskie",
  "mazowieckie", "opolskie", "podkarpackie", "podlaskie", "pomorskie", "śląskie",
  "świętokrzyskie", "warmińsko-mazurskie", "wielkopolskie", "zachodniopomorskie",
] as const;

export function category(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}

export function categoryName(id: string) {
  return category(id)?.name ?? id;
}

export const CATEGORIES = [
  { id: "tokarki", name: "Tokarki", icon: "lathe" },
  { id: "frezarki", name: "Frezarki i centra obróbcze", icon: "mill" },
  { id: "obrobka-blach", name: "Prasy krawędziowe i gilotyny", icon: "brake" },
  { id: "lasery", name: "Wycinarki laserowe i plazmowe", icon: "laser" },
  { id: "szlifierki", name: "Szlifierki", icon: "grinder" },
  { id: "prasy", name: "Prasy hydrauliczne i mimośrodowe", icon: "press" },
  { id: "wtryskarki", name: "Wtryskarki i tworzywa", icon: "inject" },
  { id: "drewno", name: "Maszyny do drewna", icon: "saw" },
  { id: "spawalnictwo", name: "Spawalnictwo", icon: "weld" },
  { id: "sprezarki", name: "Sprężarki i kompresory", icon: "compressor" },
  { id: "wozki-widlowe", name: "Wózki widłowe i magazyn", icon: "forklift" },
  { id: "suwnice", name: "Suwnice i dźwignice", icon: "crane" },
  { id: "inne", name: "Inne maszyny przemysłowe", icon: "gear" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const VOIVODESHIPS = [
  "dolnośląskie", "kujawsko-pomorskie", "lubelskie", "lubuskie", "łódzkie", "małopolskie",
  "mazowieckie", "opolskie", "podkarpackie", "podlaskie", "pomorskie", "śląskie",
  "świętokrzyskie", "warmińsko-mazurskie", "wielkopolskie", "zachodniopomorskie",
] as const;

export const CONDITIONS = {
  WORKING: "Sprawna, gotowa do pracy",
  NEEDS_REPAIR: "Sprawna, wymaga naprawy",
  DAMAGED: "Uszkodzona",
  FOR_PARTS: "Na części",
} as const;

export type ConditionKey = keyof typeof CONDITIONS;

export function category(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}

export function categoryName(id: string) {
  return category(id)?.name ?? id;
}

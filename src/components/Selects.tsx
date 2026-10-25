import { CATEGORIES, VOIVODESHIPS } from "@/lib/catalog";

export function CategoryOptions({ all = "Wszystkie kategorie" }: { all?: string }) {
  return (
    <>
      <option value="">{all}</option>
      {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </>
  );
}

export function VoivodeshipOptions({ all = "Cała Polska" }: { all?: string }) {
  return (
    <>
      <option value="">{all}</option>
      {VOIVODESHIPS.map((w) => <option key={w} value={w}>{w}</option>)}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CategoryOptions, VoivodeshipOptions } from "./Selects";
import type { Filters } from "@/lib/listings";

const YEARS = [2024, 2022, 2020, 2018, 2015, 2010, 2000];
const HOURS = [1000, 3000, 6000, 10000];

// Formularz GET: działa bez JS, a z JS odświeża wyniki po każdej zmianie
export function FilterForm({ f }: { f: Filters }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = [f.kategoria, f.woj, f.cenaOd, f.cenaDo, f.rokOd, f.mthDo, f.dealer || undefined, f.vat || undefined].filter((v) => v !== undefined).length;
  const go = () => {
    const fd = new FormData(ref.current!);
    const q = new URLSearchParams();
    fd.forEach((v, k) => { if (typeof v === "string" && v.trim()) q.set(k, v.trim()); });
    router.push(`/ogloszenia${q.size ? `?${q}` : ""}`, { scroll: false });
  };
  return (
    <>
    <button type="button" className="btn btn-plain filters-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? "Ukryj filtry" : `Filtry${active ? ` (${active})` : ""}`}
    </button>
    <form ref={ref} className={`filters${open ? " open" : ""}`} action="/ogloszenia" aria-label="Filtry" onChange={(e) => {
      // pola tekstowe (cena) wysyłamy dopiero po opuszczeniu pola
      const t = e.target as unknown as HTMLInputElement;
      if (t.tagName !== "INPUT" || t.type === "checkbox") go();
    }} onSubmit={(e) => { e.preventDefault(); go(); }}>
      <h3>Filtry</h3>
      {f.q && <input type="hidden" name="q" value={f.q} />}
      <input type="hidden" name="sort" value={f.sort === "new" ? "" : f.sort} />
      <div className="field"><label htmlFor="f-kat">Kategoria</label><select id="f-kat" name="kategoria" defaultValue={f.kategoria ?? ""}><CategoryOptions /></select></div>
      <div className="field"><label htmlFor="f-woj">Województwo</label><select id="f-woj" name="woj" defaultValue={f.woj ?? ""}><VoivodeshipOptions /></select></div>
      <div className="field"><span className="lbl">Cena netto (zł)</span>
        <div className="range">
          <input id="f-od" name="cenaOd" className="mono" inputMode="numeric" placeholder="od" aria-label="Cena od" defaultValue={f.cenaOd ?? ""} onBlur={go} />
          <input id="f-do" name="cenaDo" className="mono" inputMode="numeric" placeholder="do" aria-label="Cena do" defaultValue={f.cenaDo ?? ""} onBlur={go} />
        </div>
      </div>
      <div className="field"><label htmlFor="f-rok">Rok produkcji od</label>
        <select id="f-rok" name="rokOd" defaultValue={f.rokOd ?? ""}><option value="">dowolny</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
      <div className="field"><label htmlFor="f-mth">Motogodziny do</label>
        <select id="f-mth" name="mthDo" defaultValue={f.mthDo ?? ""}><option value="">dowolne</option>{HOURS.map((h) => <option key={h} value={h}>{h.toLocaleString("pl-PL")} mth</option>)}</select></div>
      <label className="chk"><input type="checkbox" name="dealer" value="1" defaultChecked={f.dealer} /> Tylko zweryfikowani dealerzy</label>
      <label className="chk"><input type="checkbox" name="vat" value="1" defaultChecked={f.vat} /> Faktura VAT 23%</label>
      <noscript><button className="btn btn-signal" type="submit">Filtruj</button></noscript>
      <Link className="link-btn" href="/ogloszenia">Wyczyść filtry</Link>
    </form>
    </>
  );
}

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  return (
    <select aria-label="Sortowanie" defaultValue={value} onChange={(e) => {
      const q = new URLSearchParams(location.search);
      if (e.target.value === "new") q.delete("sort"); else q.set("sort", e.target.value);
      q.delete("strona");
      router.push(`/ogloszenia${q.size ? `?${q}` : ""}`, { scroll: false });
    }}>
      <option value="new">Najnowsze</option>
      <option value="pa">Cena: od najniższej</option>
      <option value="pd">Cena: od najwyższej</option>
      <option value="y">Rok: najnowsze</option>
      <option value="h">Najmniej motogodzin</option>
    </select>
  );
}

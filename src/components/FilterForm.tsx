"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CategoryOptions, VoivodeshipOptions } from "./Selects";
import { CONDITIONS } from "@/lib/catalog";
import type { Filters, SortKey } from "@/lib/listings";

const YEARS = [2024, 2022, 2020, 2018, 2015, 2010, 2005, 2000, 1990];
const HOURS = [5000, 10000, 20000, 40000];

/** Parametry nadawane przez dział (np. /aukcje ustawia typ), więc nie pokazujemy ich w formularzu. */
export type Fixed = Partial<Pick<Filters, "typ" | "zlom">>;

function toUrl(base: string, fd: FormData) {
  const q = new URLSearchParams();
  fd.forEach((v, k) => { if (typeof v === "string" && v.trim()) q.set(k, v.trim()); });
  return `${base}${q.size ? `?${q}` : ""}`;
}

// Formularz GET: działa bez JS, a z JS odświeża wyniki po każdej zmianie
export function FilterForm({ f, base, fixed }: { f: Filters; base: string; fixed: Fixed }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = [f.kategoria, f.woj, f.stan, f.cenaOd, f.cenaDo, f.rokOd, f.godzDo, f.dealer || undefined, f.vat || undefined, fixed.typ ? undefined : f.typ, fixed.zlom ? undefined : f.zlom || undefined]
    .filter((v) => v !== undefined).length;
  const go = () => router.push(toUrl(base, new FormData(ref.current!)), { scroll: false });

  return (
    <>
      <button type="button" className="btn btn-plain filters-toggle" aria-expanded={open} aria-controls="filtry" onClick={() => setOpen(!open)}>
        {open ? "Ukryj filtry" : `Filtry${active ? ` (${active})` : ""}`}
      </button>
      <form
        id="filtry"
        ref={ref}
        className={`filters${open ? " open" : ""}`}
        action={base}
        aria-label="Filtry"
        onChange={(e) => {
          // pola tekstowe (cena) wysyłamy dopiero po opuszczeniu pola albo Enterze
          const t = e.target as unknown as HTMLInputElement;
          if (t.tagName !== "INPUT" || t.type === "checkbox") go();
        }}
        onSubmit={(e) => { e.preventDefault(); go(); }}
      >
        <h3>Filtry</h3>
        {f.q && <input type="hidden" name="q" value={f.q} />}
        <input type="hidden" name="sort" value={f.sort} />
        {!fixed.typ && (
          <div className="field"><label htmlFor="f-typ">Sposób sprzedaży</label>
            <select id="f-typ" name="typ" defaultValue={f.typ ?? ""}><option value="">Ogłoszenia i aukcje</option><option value="ogloszenia">Cena stała</option><option value="aukcje">Aukcje</option></select></div>
        )}
        <div className="field"><label htmlFor="f-kat">Kategoria</label><select id="f-kat" name="kategoria" defaultValue={f.kategoria ?? ""}><CategoryOptions /></select></div>
        <div className="field"><label htmlFor="f-woj">Województwo</label><select id="f-woj" name="woj" defaultValue={f.woj ?? ""}><VoivodeshipOptions /></select></div>
        <div className="field"><label htmlFor="f-stan">Stan</label>
          <select id="f-stan" name="stan" defaultValue={f.stan ?? ""}><option value="">Dowolny</option>{Object.entries(CONDITIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><span className="lbl">Cena netto (zł)</span>
          <div className="range">
            <input id="f-od" name="cenaOd" className="mono" inputMode="numeric" placeholder="od" aria-label="Cena od" defaultValue={f.cenaOd ?? ""} onBlur={(e) => { if (e.target.value !== e.target.defaultValue) go(); }} />
            <input id="f-do" name="cenaDo" className="mono" inputMode="numeric" placeholder="do" aria-label="Cena do" defaultValue={f.cenaDo ?? ""} onBlur={(e) => { if (e.target.value !== e.target.defaultValue) go(); }} />
          </div>
        </div>
        <div className="field"><label htmlFor="f-rok">Rok produkcji od</label>
          <select id="f-rok" name="rokOd" defaultValue={f.rokOd ?? ""}><option value="">dowolny</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
        <div className="field"><label htmlFor="f-godz">Godziny pracy do</label>
          <select id="f-godz" name="godzDo" defaultValue={f.godzDo ?? ""}><option value="">dowolne</option>{HOURS.map((h) => <option key={h} value={h}>{h.toLocaleString("pl-PL")} h</option>)}</select></div>
        {!fixed.zlom && <label className="chk"><input type="checkbox" name="zlom" value="1" defaultChecked={f.zlom} /> Tylko w cenie złomu</label>}
        <label className="chk"><input type="checkbox" name="dealer" value="1" defaultChecked={f.dealer} /> Tylko zweryfikowani dealerzy</label>
        <label className="chk"><input type="checkbox" name="vat" value="1" defaultChecked={f.vat} /> Faktura VAT 23%</label>
        <noscript><button className="btn btn-signal" type="submit">Filtruj</button></noscript>
        <Link className="link-btn" href={base}>Wyczyść filtry</Link>
      </form>
    </>
  );
}

export function SortSelect({ value, base, options }: { value: SortKey; base: string; options: [SortKey, string][] }) {
  const router = useRouter();
  return (
    <select aria-label="Sortowanie" defaultValue={value} onChange={(e) => {
      const q = new URLSearchParams(location.search);
      q.set("sort", e.target.value);
      q.delete("strona");
      router.push(`${base}?${q}`, { scroll: false });
    }}>
      {options.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { createListing } from "@/lib/actions";
import { CategoryOptions, VoivodeshipOptions } from "./Selects";

export function ListingForm() {
  const [state, action, pending] = useActionState(createListing, undefined);
  const v = state?.fields ?? {};
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  const key = JSON.stringify(v);

  return (
    <form action={action} className="form-card" key={key}>
      {state?.error && <p className="alert err" role="alert">{state.error}</p>}
      <fieldset>
        <legend>Maszyna</legend>
        <div className="cols">
          <div className="field"><label htmlFor="category">Kategoria</label><select id="category" name="category" required defaultValue={v.category ?? ""}><CategoryOptions all="Wybierz kategorię" /></select></div>
          <div className="field"><label htmlFor="brand">Marka</label><input id="brand" name="brand" required defaultValue={v.brand} placeholder="np. Caterpillar" /></div>
          <div className="field"><label htmlFor="model">Model</label><input id="model" name="model" required defaultValue={v.model} placeholder="np. 320 GC" /></div>
        </div>
        <div className="cols">
          <div className="field"><label htmlFor="year">Rok produkcji</label><input id="year" name="year" className="mono" inputMode="numeric" required defaultValue={v.year} placeholder="2019" /></div>
          <div className="field"><label htmlFor="hours">Motogodziny</label><input id="hours" name="hours" className="mono" inputMode="numeric" defaultValue={v.hours} placeholder="np. 6420" /></div>
          <div className="field"><label htmlFor="mileageKm">Przebieg (km)</label><input id="mileageKm" name="mileageKm" className="mono" inputMode="numeric" defaultValue={v.mileageKm} placeholder="tylko pojazdy" /></div>
        </div>
        <div className="cols">
          <div className="field"><label htmlFor="keyParam">Parametr główny</label><input id="keyParam" name="keyParam" defaultValue={v.keyParam} placeholder="np. 110 kW, udźwig 3 t" /></div>
          <div className="field"><label htmlFor="serialNumber">Numer seryjny (PIN/VIN)</label><input id="serialNumber" name="serialNumber" className="mono" defaultValue={v.serialNumber} /><span className="hint">Zwiększa zaufanie kupujących.</span></div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Cena i lokalizacja</legend>
        <div className="cols">
          <div className="field"><label htmlFor="priceNet">Cena (zł)</label><input id="priceNet" name="priceNet" className="mono" inputMode="numeric" required defaultValue={v.priceNet} placeholder="389 000" /></div>
          <div className="field"><label htmlFor="voivodeship">Województwo</label><select id="voivodeship" name="voivodeship" required defaultValue={v.voivodeship ?? ""}><VoivodeshipOptions all="Wybierz" /></select></div>
          <div className="field"><label htmlFor="city">Miejscowość</label><input id="city" name="city" required defaultValue={v.city} /></div>
        </div>
        <label className="chk"><input type="checkbox" name="vatInvoice" defaultChecked={state ? v.vatInvoice === "on" : true} /> Wystawiam fakturę VAT (cena podana netto)</label>
      </fieldset>
      <fieldset>
        <legend>Opis i zdjęcia</legend>
        <div className="field"><label htmlFor="description">Opis</label><textarea id="description" name="description" required minLength={30} defaultValue={v.description} placeholder="Stan techniczny, wyposażenie, historia serwisowa, dokumenty (UDT, CE), możliwość transportu…" /></div>
        <div className="field">
          <label htmlFor="images">Zdjęcia</label>
          <input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} />
          <span className="hint">Do 20 zdjęć, JPG, PNG lub WebP, maks. 8 MB każde. Pierwsze będzie zdjęciem głównym.</span>
        </div>
        {previews.length > 0 && <div className="previews">{previews.map((p) => <img key={p} src={p} alt="" />)}</div>}
      </fieldset>
      <button className="btn btn-signal" disabled={pending} style={{ justifySelf: "start", padding: "12px 24px" }}>{pending ? "Publikowanie…" : "Opublikuj ogłoszenie"}</button>
    </form>
  );
}

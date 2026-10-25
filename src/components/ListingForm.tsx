"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { createListing } from "@/lib/actions";
import { CONDITIONS } from "@/lib/catalog";
import { AUCTION_DURATIONS_DAYS } from "@/lib/auction-rules";
import { parseAmount, parseIntParam } from "@/lib/parse";
import { formatPerKg, pricePerKg, SCRAP_MAX_PLN_PER_KG } from "@/lib/scrap";
import { CategoryOptions, VoivodeshipOptions } from "./Selects";

const MAX_IMAGES = 20;
const MAX_EDGE = 2000;

type Photo = { id: string; file: File; url: string };

/** Zmniejsza zdjęcie z telefonu (często 5–10 MB) do JPEG o dłuższym boku 2000 px i obraca wg EXIF. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85));
}

export function ListingForm({ directUpload }: { directUpload: boolean }) {
  const [state, action, pending] = useActionState(createListing, undefined);
  const v = state?.fields ?? {};
  const [saleType, setSaleType] = useState<"FIXED" | "AUCTION">(v.saleType === "AUCTION" ? "AUCTION" : "FIXED");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [price, setPrice] = useState(v.priceNet ?? v.startPrice ?? "");
  const [weight, setWeight] = useState(v.weightKg ?? "");
  const perKg = useMemo(() => {
    const p = parseAmount(price);
    const w = parseIntParam(weight);
    return p !== undefined && w ? pricePerKg(p, w) : null;
  }, [price, weight]);

  // podglądy zwalniamy przy usunięciu zdjęcia i przy opuszczeniu strony
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);
  function removePhoto(id: string) {
    setPhotos((ps) => {
      const gone = ps.find((x) => x.id === id);
      if (gone) { URL.revokeObjectURL(gone.url); previewUrls.current.delete(gone.url); }
      return ps.filter((x) => x.id !== id);
    });
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const room = MAX_IMAGES - photos.length;
    const added = incoming.slice(0, Math.max(0, room)).map((file) => {
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      return { id: crypto.randomUUID(), file, url };
    });
    setPhotos((prev) => [...prev, ...added]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const fd = new FormData(e.currentTarget);
    try {
      for (const [i, p] of photos.entries()) {
        setBusy(`Przygotowanie zdjęć ${i + 1}/${photos.length}…`);
        let blob: Blob;
        try {
          blob = await shrink(p.file);
        } catch {
          throw new Error(`Nie udało się odczytać pliku ${p.file.name}. Użyj zdjęcia JPG, PNG lub WebP.`);
        }
        if (directUpload) {
          const res = await upload(`listings/${crypto.randomUUID()}.jpg`, blob, { access: "public", handleUploadUrl: "/api/upload", contentType: "image/jpeg" });
          fd.append("imageUrls", res.url);
        } else {
          fd.append("images", new File([blob], `${i + 1}.jpg`, { type: "image/jpeg" }));
        }
      }
    } catch (err) {
      setBusy(null);
      setLocalError(err instanceof Error ? err.message : "Nie udało się wgrać zdjęć");
      return;
    }
    setBusy(null);
    startTransition(() => action(fd));
  }

  const error = localError ?? state?.error;
  const working = pending || busy !== null;

  return (
    <form onSubmit={onSubmit} className="form-card" noValidate={false}>
      {error && <p className="alert err" role="alert">{error}</p>}
      <div className="seg" role="radiogroup" aria-label="Sposób sprzedaży">
        <label><input type="radio" name="saleType" value="FIXED" checked={saleType === "FIXED"} onChange={() => setSaleType("FIXED")} /> Cena stała</label>
        <label><input type="radio" name="saleType" value="AUCTION" checked={saleType === "AUCTION"} onChange={() => setSaleType("AUCTION")} /> Aukcja</label>
      </div>
      <fieldset>
        <legend>Maszyna</legend>
        <div className="cols">
          <div className="field"><label htmlFor="category">Kategoria</label><select id="category" name="category" required defaultValue={v.category ?? ""}><CategoryOptions all="Wybierz kategorię" /></select></div>
          <div className="field"><label htmlFor="brand">Producent</label><input id="brand" name="brand" required maxLength={60} defaultValue={v.brand} placeholder="np. DMG Mori, Trumpf, Engel" /></div>
          <div className="field"><label htmlFor="model">Model</label><input id="model" name="model" required maxLength={80} defaultValue={v.model} placeholder="np. CTX 510 ecoline" /></div>
        </div>
        <div className="cols">
          <div className="field"><label htmlFor="year">Rok produkcji</label><input id="year" name="year" className="mono" inputMode="numeric" required defaultValue={v.year} placeholder="2016" /></div>
          <div className="field"><label htmlFor="condition">Stan</label>
            <select id="condition" name="condition" required defaultValue={v.condition ?? "WORKING"}>
              {Object.entries(CONDITIONS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select></div>
          <div className="field"><label htmlFor="hours">Godziny pracy</label><input id="hours" name="hours" className="mono" inputMode="numeric" defaultValue={v.hours} placeholder="np. 12 400" /></div>
        </div>
        <div className="cols">
          <div className="field"><label htmlFor="controlSystem">Sterowanie</label><input id="controlSystem" name="controlSystem" maxLength={60} defaultValue={v.controlSystem} placeholder="np. Fanuc 0i-TF, Heidenhain TNC 640" /></div>
          <div className="field"><label htmlFor="keyParam">Parametr główny</label><input id="keyParam" name="keyParam" maxLength={60} defaultValue={v.keyParam} placeholder="np. nacisk 135 t, laser 6 kW" /></div>
          <div className="field"><label htmlFor="weightKg">Masa (kg)</label><input id="weightKg" name="weightKg" className="mono" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="np. 4 800" /></div>
        </div>
        <div className="field"><label htmlFor="serialNumber">Numer seryjny</label><input id="serialNumber" name="serialNumber" className="mono" maxLength={40} defaultValue={v.serialNumber} /><span className="hint">Zwiększa zaufanie kupujących.</span></div>
      </fieldset>

      <fieldset>
        <legend>{saleType === "AUCTION" ? "Aukcja" : "Cena"} i lokalizacja</legend>
        {saleType === "FIXED" ? (
          <div className="cols">
            <div className="field"><label htmlFor="priceNet">Cena (zł)</label><input id="priceNet" name="priceNet" className="mono" inputMode="numeric" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="np. 189 000" /></div>
          </div>
        ) : (
          <div className="cols">
            <div className="field"><label htmlFor="startPrice">Cena wywoławcza (zł)</label><input id="startPrice" name="startPrice" className="mono" inputMode="numeric" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="np. 50 000" /></div>
            <div className="field"><label htmlFor="reservePrice">Cena minimalna (zł)</label><input id="reservePrice" name="reservePrice" className="mono" inputMode="numeric" defaultValue={v.reservePrice} placeholder="opcjonalnie" /><span className="hint">Niewidoczna dla kupujących. Poniżej niej nie musisz sprzedać.</span></div>
            <div className="field"><label htmlFor="durationDays">Czas trwania</label>
              <select id="durationDays" name="durationDays" defaultValue={v.durationDays ?? "7"}>
                {AUCTION_DURATIONS_DAYS.map((d) => <option key={d} value={d}>{d} dni</option>)}
              </select></div>
          </div>
        )}
        <div className="cols">
          <div className="field"><label htmlFor="voivodeship">Województwo</label><select id="voivodeship" name="voivodeship" required defaultValue={v.voivodeship ?? ""}><VoivodeshipOptions all="Wybierz" /></select></div>
          <div className="field"><label htmlFor="city">Miejscowość</label><input id="city" name="city" required maxLength={60} defaultValue={v.city} /></div>
        </div>
        <label className="chk"><input type="checkbox" name="vatInvoice" defaultChecked={state ? v.vatInvoice === "on" : true} /> Wystawiam fakturę VAT (cena podana netto)</label>
        <label className="chk"><input type="checkbox" name="scrapPrice" defaultChecked={v.scrapPrice === "on"} /> Dodaj do działu „Maszyny w cenie złomu”</label>
        <span className="hint" style={{ marginTop: -8 }}>
          Wymaga podania masy. Cena {saleType === "AUCTION" ? "wywoławcza " : ""}może wynosić najwyżej {SCRAP_MAX_PLN_PER_KG} zł/kg
          {perKg !== null && <> · Twoja: <b className="mono">{formatPerKg(perKg)}</b>{perKg <= SCRAP_MAX_PLN_PER_KG ? " ✓" : ", za dużo"}</>}
        </span>
      </fieldset>

      <fieldset>
        <legend>Opis i zdjęcia</legend>
        <div className="field"><label htmlFor="description">Opis</label><textarea id="description" name="description" required minLength={30} maxLength={8000} defaultValue={v.description} placeholder="Stan techniczny, wyposażenie (oprzyrządowanie, uchwyty, narzędzia), historia serwisowa, dokumenty (CE, DTR), możliwość prezentacji pod prądem, załadunek…" /></div>
        <div className="field">
          <label htmlFor="photos">Zdjęcia ({photos.length}/{MAX_IMAGES})</label>
          <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={photos.length >= MAX_IMAGES} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <span className="hint">Pierwsze zdjęcie będzie główne. Duże zdjęcia zmniejszamy automatycznie.</span>
        </div>
        {photos.length > 0 && (
          <div className="previews">
            {photos.map((p, i) => (
              <figure key={p.id} className="pv">
                <img src={p.url} alt={`Zdjęcie ${i + 1}`} />
                <figcaption>
                  {i === 0 ? <span className="tag ok">Główne</span> : <button type="button" className="link-btn" onClick={() => setPhotos((ps) => [p, ...ps.filter((x) => x.id !== p.id)])}>Ustaw jako główne</button>}
                  <button type="button" className="link-btn" aria-label={`Usuń zdjęcie ${i + 1}`} onClick={() => removePhoto(p.id)}>Usuń</button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </fieldset>
      {saleType === "AUCTION" && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Aukcja startuje od razu po publikacji. Po pierwszej ofercie nie można jej przerwać ani usunąć.</p>}
      <button className="btn btn-signal" disabled={working} style={{ justifySelf: "start", padding: "12px 24px" }}>
        {busy ?? (pending ? "Publikowanie…" : saleType === "AUCTION" ? "Rozpocznij aukcję" : "Opublikuj ogłoszenie")}
      </button>
    </form>
  );
}

// Sprite z sylwetkami maszyn; użycie: <svg><use href="#i-kop" /></svg>
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="i-kop" viewBox="0 0 64 44"><path d="M4 32h34v6H4zM10 22h16v10H10zM20 16h6v6M26 18l14-12 10 6-6 10" /><path d="M44 22l-6 8h10z" /></symbol>
      <symbol id="i-cia" viewBox="0 0 64 44"><circle cx="16" cy="32" r="9" /><circle cx="50" cy="35" r="6" /><path d="M8 24h20l4-14h14v16h8l2 9M28 10v14M46 26v-8" /></symbol>
      <symbol id="i-wozek" viewBox="0 0 64 44"><circle cx="20" cy="36" r="5" /><circle cx="42" cy="36" r="5" /><path d="M14 31V18h18l6 13M32 18V8M50 4v32M50 36h10M24 18V12h8" /></symbol>
      <symbol id="i-dzwig" viewBox="0 0 64 44"><path d="M6 38h28v-8H6zM12 30v-8h12v8M22 22L56 4M56 4v18M52 22h8" /><circle cx="12" cy="40" r="2" /><circle cx="28" cy="40" r="2" /></symbol>
      <symbol id="i-cnc" viewBox="0 0 64 44"><path d="M6 6h52v32H6zM6 30h52M14 14h22v12H14zM44 12h8M44 18h8M44 24h8M18 38v4M46 38v4" /></symbol>
      <symbol id="i-lad" viewBox="0 0 64 44"><circle cx="16" cy="34" r="7" /><circle cx="46" cy="34" r="7" /><path d="M10 26h28V14h10v12M38 20h4l14-10 4 14-10 2" /></symbol>
      <symbol id="i-kom" viewBox="0 0 64 44"><circle cx="14" cy="36" r="5" /><circle cx="46" cy="36" r="5" /><path d="M4 30V14h32l10 8h12v8H4M36 14V6h10v8" /></symbol>
      <symbol id="i-agr" viewBox="0 0 64 44"><path d="M4 34h56M8 34V22h30v12M38 26h18v8M14 22V12h16v10M48 26l8-10" /><circle cx="16" cy="38" r="4" /><circle cx="48" cy="38" r="4" /></symbol>
      <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.3 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" /></symbol>
    </svg>
  );
}

export function MachineIcon({ category }: { category: string }) {
  const icon = {
    koparki: "kop", ladowarki: "lad", ciagniki: "cia", "maszyny-rolnicze": "agr",
    "wozki-widlowe": "wozek", dzwigi: "dzwig", obrabiarki: "cnc", "pojazdy-uzytkowe": "kom",
  }[category] ?? "kop";
  return <svg viewBox="0 0 64 44" aria-hidden="true"><use href={`#i-${icon}`} /></svg>;
}

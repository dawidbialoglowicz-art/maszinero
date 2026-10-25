import { category } from "@/lib/catalog";

// Sprite z sylwetkami maszyn; użycie: <MachineIcon category="tokarki" />
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="i-lathe" viewBox="0 0 64 44"><path d="M4 34h56M8 34V14h14v20M22 20h6v8h-6M28 24h18M46 18h10v16H46zM12 34v6M52 34v6" /></symbol>
      <symbol id="i-mill" viewBox="0 0 64 44"><path d="M6 6h52v32H6zM6 30h52M14 14h22v12H14zM44 12h8M44 18h8M44 24h8M18 38v4M46 38v4" /></symbol>
      <symbol id="i-brake" viewBox="0 0 64 44"><path d="M6 6h52v8H6zM12 14v10M52 14v10M22 14h20v8l-10 8-10-8zM6 32h52v6H6zM10 38v4M54 38v4" /></symbol>
      <symbol id="i-laser" viewBox="0 0 64 44"><path d="M4 32h56v8H4zM8 8h48v6H8zM10 14v18M54 14v18M28 14h8v8h-8zM32 22v6M24 32v-2M40 32v-2" /></symbol>
      <symbol id="i-grinder" viewBox="0 0 64 44"><circle cx="32" cy="14" r="9" /><circle cx="32" cy="14" r="2" /><path d="M6 36h52v4H6zM12 36V26h40v10M20 26v-4M44 26v-4" /></symbol>
      <symbol id="i-press" viewBox="0 0 64 44"><path d="M14 4h36v8H14zM18 12v24M46 12v24M28 12v6h8v-6M24 18h16v5H24zM10 36h44v4H10zM22 32h20" /></symbol>
      <symbol id="i-inject" viewBox="0 0 64 44"><path d="M4 30h56v6H4zM8 30V18h32v12M40 22h16v8M20 18l-4-10h12l-4 10M8 36v4M56 36v4" /></symbol>
      <symbol id="i-saw" viewBox="0 0 64 44"><path d="M6 26h52v4H6zM12 30v10M52 30v10M23 26a9 9 0 0 1 18 0" /><path d="M32 17v-3M38.4 19.6l2-2M25.6 19.6l-2-2" /></symbol>
      <symbol id="i-weld" viewBox="0 0 64 44"><path d="M6 14h24v22H6zM10 20h10M10 26h16M30 24c8 0 12-10 20-10M50 14l6-6M54 4l4 4M10 36v4M26 36v4" /></symbol>
      <symbol id="i-compressor" viewBox="0 0 64 44"><path d="M10 22h38a7 7 0 0 1 0 14H10a7 7 0 0 1 0-14zM18 22v-8h18v8M22 14V8h10v6M14 36v4M46 36v4" /></symbol>
      <symbol id="i-forklift" viewBox="0 0 64 44"><circle cx="20" cy="36" r="5" /><circle cx="42" cy="36" r="5" /><path d="M14 31V18h18l6 13M32 18V8M50 4v32M50 36h10M24 18V12h8" /></symbol>
      <symbol id="i-crane" viewBox="0 0 64 44"><path d="M4 8h56M8 8v32M56 8v32M4 40h8M52 40h8M26 8v4h12v-4M32 12v14M27 26h10l-2 6h-6z" /></symbol>
      <symbol id="i-gear" viewBox="0 0 64 44"><circle cx="32" cy="22" r="7" /><path d="M32 6v6M32 32v6M16 22h6M42 22h6M20.7 10.7l4.2 4.2M39.1 29.1l4.2 4.2M20.7 33.3l4.2-4.2M39.1 14.9l4.2-4.2" /></symbol>
      <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.3 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" /></symbol>
      <symbol id="i-gavel" viewBox="0 0 24 24"><path d="M14 4l6 6M11 7l6 6M12.5 5.5l-4 4 6 6 4-4M10 12l-7 7 2 2 7-7M4 22h9" /></symbol>
    </svg>
  );
}

export function MachineIcon({ category: id }: { category: string }) {
  const icon = category(id)?.icon ?? "gear";
  return <svg viewBox="0 0 64 44" aria-hidden="true"><use href={`#i-${icon}`} /></svg>;
}

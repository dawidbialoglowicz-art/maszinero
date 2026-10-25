import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_UPLOAD_DIR } from "@/lib/storage";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Lokalne zdjęcia (bez Vercel Blob). W produkcji zdjęcia mają adresy blob.vercel-storage.com.
export async function GET(_: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const parts = (await ctx.params).path;
  const file = path.join(LOCAL_UPLOAD_DIR, ...parts);
  const type = TYPES[path.extname(file)];
  if (!type || !file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return new Response(null, { status: 404 });
  try {
    return new Response(await readFile(file), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}

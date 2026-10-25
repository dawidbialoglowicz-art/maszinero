import "server-only";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function isAllowedImage(file: File) {
  return ALLOWED.has(file.type) && file.size > 0 && file.size <= MAX_IMAGE_BYTES;
}

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Vercel Blob w produkcji, lokalnie katalog uploads/ serwowany przez /uploads/[...path]
export async function saveImage(file: File): Promise<string> {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new Error("Nieobsługiwany format zdjęcia");
  const name = `listings/${randomUUID()}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, file, { access: "public", contentType: file.type });
    return blob.url;
  }
  await mkdir(path.join(LOCAL_UPLOAD_DIR, "listings"), { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

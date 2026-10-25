import "server-only";
import { del, put } from "@vercel/blob";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sniffImage, type ImageType } from "./parse";

const EXT: Record<ImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const IMAGE_TYPES = Object.keys(EXT) as ImageType[];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGES = 20;

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");

/** W produkcji zdjęcia trafiają z przeglądarki prosto do Vercel Blob (limit 4,5 MB na żądanie do funkcji). */
export function directUploadEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Zapis zdjęcia przesłanego w formularzu (tryb lokalny). Zwraca null, gdy plik nie jest obsługiwanym obrazem. */
export async function saveImage(file: File): Promise<string | null> {
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return null;
  const name = `listings/${randomUUID()}.${EXT[type]}`;
  if (directUploadEnabled()) {
    const blob = await put(name, Buffer.from(bytes), { access: "public", contentType: type });
    return blob.url;
  }
  await mkdir(path.join(LOCAL_UPLOAD_DIR, "listings"), { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), bytes);
  return `/uploads/${name}`;
}

/** Usuwa pliki zdjęć po skasowaniu ogłoszenia. Błędy tylko logujemy: rekord w bazie jest już usunięty. */
export async function deleteImages(urls: string[]) {
  const blobs = urls.filter((u) => u.startsWith("https://"));
  const local = urls.filter((u) => u.startsWith("/uploads/listings/"));
  try {
    if (blobs.length && directUploadEnabled()) await del(blobs);
    await Promise.all(
      local.map((u) => {
        const file = path.join(LOCAL_UPLOAD_DIR, u.slice("/uploads/".length));
        return file.startsWith(LOCAL_UPLOAD_DIR + path.sep) ? unlink(file).catch(() => {}) : undefined;
      }),
    );
  } catch (e) {
    console.error("Nie udało się usunąć zdjęć", e);
  }
}

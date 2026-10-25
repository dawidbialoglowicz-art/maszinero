import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentUser } from "@/lib/session";
import { directUploadEnabled, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/storage";

// Wydaje przeglądarce jednorazowy token do wgrania zdjęcia prosto do Vercel Blob.
// Tylko dla zalogowanych, tylko obrazy do 8 MB i tylko do katalogu listings/.
export async function POST(request: Request) {
  if (!directUploadEnabled()) return Response.json({ error: "Wgrywanie bezpośrednie jest wyłączone" }, { status: 404 });
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie" }, { status: 400 });
  }
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await currentUser();
        if (!user) throw new Error("Zaloguj się, aby dodać zdjęcia");
        if (!/^listings\/[\w.-]+\.(jpg|png|webp)$/.test(pathname)) throw new Error("Nieprawidłowa nazwa pliku");
        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
          tokenPayload: user.id,
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Błąd wgrywania" }, { status: 400 });
  }
}

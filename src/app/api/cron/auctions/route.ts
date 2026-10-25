import { finalizeEndedAuctions } from "@/lib/auctions";

// Vercel Cron (vercel.json) zamyka aukcje po czasie. Strony robią to też leniwie przy wyświetlaniu.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const closed = await finalizeEndedAuctions();
  return Response.json({ closed });
}

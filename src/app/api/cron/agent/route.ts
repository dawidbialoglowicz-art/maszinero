import { moderateBacklog } from "@/lib/agent/moderation";
import { checkCompaniesBacklog } from "@/lib/agent/nip";
import { createDailyReport } from "@/lib/agent/report";

export const maxDuration = 300;

// Vercel Cron (vercel.json), raz dziennie rano: nadrabia moderację i sprawdzanie NIP, potem pisze raport.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const moderated = await moderateBacklog();
  const companies = await checkCompaniesBacklog();
  const report = await createDailyReport();
  return Response.json({ moderated, companies, report: report.id });
}

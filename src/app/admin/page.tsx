import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ago } from "@/lib/format";
import { microUsdToPln } from "@/lib/agent/cost";
import { AGENT_MODEL, agentEnabled } from "@/lib/agent/claude";
import { MachineIcon } from "@/components/Icons";
import { AgentDecision, RestoreListing, VerifyToggle } from "@/components/AdminButtons";

export const metadata: Metadata = { title: "Panel administratora", robots: { index: false } };

const KIND = {
  HIDE_LISTING: ["Wstrzymane przez agenta", "err"],
  FLAG_LISTING: ["Do sprawdzenia", "auc"],
  CHANGE_CATEGORY: ["Kategoria", "mute"],
  VERIFY_COMPANY: ["Firma potwierdzona", "ok"],
  FLAG_COMPANY: ["Problem z firmą", "auc"],
} as const;

// Raport zapisujemy w prostym markdownie: **pogrubienie** i punkty "- "
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  );
}

function ReportBody({ body }: { body: string }) {
  return (
    <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
      {body.split("\n").filter((l) => l.trim()).map((line, i) =>
        /^\s*[-•*] /.test(line)
          ? <div key={i} style={{ paddingLeft: 14 }}>• {inline(line.replace(/^\s*[-•*] /, ""))}</div>
          : <div key={i}>{inline(line)}</div>,
      )}
    </div>
  );
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const fmtPln = (micro: number) => `${microUsdToPln(micro).toFixed(2).replace(".", ",")} zł`;

export default async function AdminPage() {
  await requireAdmin();
  const [pending, decided, report, hidden, companies, cost] = await Promise.all([
    db.agentAction.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        listing: { select: { id: true, title: true, category: true, status: true, images: { take: 1, orderBy: { position: "asc" } } } },
        user: { select: { name: true, email: true, companyName: true, nip: true } },
      },
    }),
    db.agentAction.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { decidedAt: "desc" },
      take: 10,
      select: { id: true, kind: true, status: true, summary: true, decidedAt: true, decidedBy: { select: { name: true } } },
    }),
    db.agentReport.findFirst({ orderBy: { createdAt: "desc" } }),
    db.listing.findMany({ where: { status: "HIDDEN" }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true, updatedAt: true } }),
    db.user.findMany({
      where: { nip: { not: null } },
      orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
      take: 30,
      select: { id: true, name: true, email: true, companyName: true, nip: true, verified: true, nipCheckedAt: true, createdAt: true },
    }),
    db.agentRun.aggregate({ where: { createdAt: { gte: daysAgo(30) } }, _sum: { costMicroUsd: true }, _count: true }),
  ]);

  return (
    <div className="wrap" style={{ paddingBottom: 48 }}>
      <div className="page-head">
        <h1>Panel administratora</h1>
        <p className="muted" style={{ margin: 0 }}>
          Agent: {agentEnabled() ? <span className="ok-text">włączony ({AGENT_MODEL})</span> : <b>wyłączony, brak ANTHROPIC_API_KEY (działa tylko sprawdzanie NIP)</b>}
          {" · "}koszt w 30 dni: <span className="mono">{fmtPln(cost._sum.costMicroUsd ?? 0)}</span> ({cost._count} wywołań)
        </p>
      </div>

      <section style={{ display: "grid", gap: 10 }}>
        <h2>Kolejka decyzji ({pending.length})</h2>
        <div className="rows" style={{ paddingBottom: 24 }}>
          {pending.length === 0 && <div className="empty">Nic nie czeka na decyzję.</div>}
          {pending.map((a) => (
            <div className="row" key={a.id}>
              <div className="ph">
                {a.listing?.images[0] ? <img src={a.listing.images[0].url} alt="" /> : <MachineIcon category={a.listing?.category ?? "inne"} />}
              </div>
              <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className={`tag ${KIND[a.kind][1]}`}>{KIND[a.kind][0]}</span>
                  {a.listing && <Link href={`/ogloszenia/${a.listing.id}`} style={{ fontWeight: 700 }}>{a.listing.title}</Link>}
                  {!a.listing && a.user && <b>{a.user.companyName || a.user.name}</b>}
                  <span className="muted" style={{ fontSize: 12 }}>{ago(a.createdAt)}</span>
                </div>
                <span style={{ fontSize: 14 }}>{a.summary}</span>
                <span className="muted" style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{a.reasoning}</span>
                {a.user && <span className="muted mono" style={{ fontSize: 12 }}>{a.user.email}{a.user.nip ? ` · NIP ${a.user.nip}` : ""}</span>}
              </div>
              <AgentDecision id={a.id} kind={a.kind} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Poranny raport</h2>
        {report ? (
          <>
            <span className="muted" style={{ fontSize: 12 }}>{report.createdAt.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}</span>
            <ReportBody body={report.body} />
          </>
        ) : <p className="muted" style={{ margin: 0 }}>Pierwszy raport pojawi się po porannym uruchomieniu agenta.</p>}
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2>Wstrzymane ogłoszenia ({hidden.length})</h2>
        <div className="rows" style={{ paddingBottom: 24 }}>
          {hidden.length === 0 && <div className="empty">Brak wstrzymanych ogłoszeń.</div>}
          {hidden.map((l) => (
            <div className="row" key={l.id} style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
              <div><Link href={`/ogloszenia/${l.id}`} style={{ fontWeight: 700 }}>{l.title}</Link> <span className="muted" style={{ fontSize: 12 }}>{ago(l.updatedAt)}</span></div>
              <RestoreListing listingId={l.id} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2>Firmy</h2>
        <div className="rows" style={{ paddingBottom: 24 }}>
          {companies.length === 0 && <div className="empty">Brak kont firmowych.</div>}
          {companies.map((u) => (
            <div className="row" key={u.id} style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
              <div style={{ display: "grid", gap: 2 }}>
                <span><b>{u.companyName || u.name}</b> {u.verified && <span className="tag ok">✓ Dealer</span>}</span>
                <span className="muted mono" style={{ fontSize: 12 }}>
                  NIP {u.nip} · {u.email} · konto {ago(u.createdAt)} · {u.nipCheckedAt ? `NIP sprawdzony ${ago(u.nipCheckedAt)}` : "NIP niesprawdzony"}
                </span>
              </div>
              <VerifyToggle userId={u.id} verified={u.verified} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2>Ostatnie decyzje</h2>
        <div className="rows">
          {decided.length === 0 && <div className="empty">Jeszcze nic nie zdecydowano.</div>}
          {decided.map((a) => (
            <div className="row" key={a.id} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
              <span style={{ fontSize: 14 }}>
                <span className={`tag ${a.status === "APPROVED" ? "ok" : "mute"}`}>{a.status === "APPROVED" ? "Zatwierdzone" : "Odrzucone"}</span>{" "}
                {KIND[a.kind][0]}: {a.summary} <span className="muted" style={{ fontSize: 12 }}>· {a.decidedBy?.name ?? "?"}, {a.decidedAt ? ago(a.decidedAt) : ""}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

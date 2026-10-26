import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { directUploadEnabled } from "@/lib/storage";
import { ListingForm } from "@/components/ListingForm";
import { freePeriod } from "@/lib/launch";

export const metadata: Metadata = { title: "Dodaj ogłoszenie lub aukcję" };

export default async function Page() {
  await requireUser("/dodaj");
  const free = freePeriod();
  return (
    <div className="wrap" style={{ maxWidth: 860, paddingBottom: 48 }}>
      <div className="page-head"><h1>Sprzedaj maszynę</h1><p className="muted" style={{ margin: 0 }}>Wystaw ją z ceną stałą albo na aukcji. Im więcej danych technicznych i zdjęć, tym szybciej znajdziesz kupca.</p></div>
      {free.active && <p className="alert ok" style={{ marginBottom: 16 }}>Wystawienie ogłoszenia i aukcji jest bezpłatne {free.label}.</p>}
      <ListingForm directUpload={directUploadEnabled()} />
    </div>
  );
}

import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { ListingForm } from "@/components/ListingForm";

export const metadata: Metadata = { title: "Dodaj ogłoszenie" };

export default async function Page() {
  await requireUser("/dodaj");
  return (
    <div className="wrap" style={{ maxWidth: 860, paddingBottom: 48 }}>
      <div className="page-head"><h1>Dodaj ogłoszenie</h1><p className="muted" style={{ margin: 0 }}>Im więcej danych technicznych i zdjęć, tym szybciej znajdziesz kupca.</p></div>
      <ListingForm />
    </div>
  );
}

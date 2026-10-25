import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = { title: "Moje konto" };

export default async function Page() {
  const user = await requireUser("/konto");
  return (
    <div className="wrap auth">
      <div className="page-head">
        <h1>Moje konto</h1>
        <p className="muted" style={{ margin: 0 }}>{user.email}{user.companyName ? ` · ${user.companyName}` : ""}{user.verified ? " · ✓ zweryfikowany dealer" : ""}</p>
      </div>
      <ProfileForm name={user.name} phone={user.phone ?? ""} />
      <p className="muted" style={{ fontSize: 14 }}><Link className="link-btn" href="/moje">Moje ogłoszenia i aukcje</Link> · <Link className="link-btn" href="/obserwowane">Obserwowane</Link></p>
    </div>
  );
}

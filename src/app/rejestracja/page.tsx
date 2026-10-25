import type { Metadata } from "next";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Załóż konto" };

export default async function Page({ searchParams }: PageProps<"/rejestracja">) {
  const next = (await searchParams).next;
  return (
    <div className="wrap auth">
      <div className="page-head"><h1>Załóż konto</h1><p className="muted" style={{ margin: 0 }}>Konto jest potrzebne, aby dodawać ogłoszenia i obserwować maszyny.</p></div>
      <RegisterForm next={typeof next === "string" ? next : "/"} />
    </div>
  );
}

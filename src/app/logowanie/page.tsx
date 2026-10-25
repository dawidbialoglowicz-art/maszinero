import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Logowanie" };

export default async function Page({ searchParams }: PageProps<"/logowanie">) {
  const next = (await searchParams).next;
  return (
    <div className="wrap auth">
      <div className="page-head"><h1>Zaloguj się</h1></div>
      <LoginForm next={typeof next === "string" ? next : "/"} />
    </div>
  );
}

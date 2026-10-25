"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="form-card">
      {state?.error && <p className="alert err" role="alert">{state.error}</p>}
      {state?.fields?.saved && <p className="alert ok" role="status">Zapisano.</p>}
      <div className="field"><label htmlFor="name">Imię i nazwisko</label><input id="name" name="name" required defaultValue={state?.fields?.name ?? name} /></div>
      <div className="field"><label htmlFor="phone">Telefon</label><input id="phone" name="phone" type="tel" defaultValue={state?.fields?.phone ?? phone} placeholder="+48 600 000 000" /><span className="hint">Wymagany do licytowania. Kupującym pokazujemy go dopiero po kliknięciu.</span></div>
      <button className="btn btn-signal" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Zapisywanie…" : "Zapisz"}</button>
    </form>
  );
}

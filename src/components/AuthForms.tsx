"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register } from "@/lib/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="form-card">
      {state?.error && <p className="alert err" role="alert">{state.error}</p>}
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} /></div>
      <div className="field"><label htmlFor="password">Hasło</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <button className="btn btn-signal" disabled={pending}>{pending ? "Logowanie…" : "Zaloguj się"}</button>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>Nie masz konta? <Link className="link-btn" href={`/rejestracja?next=${encodeURIComponent(next)}`}>Załóż konto</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  const v = state?.fields ?? {};
  const [type, setType] = useState(v.accountType ?? "PRIVATE");
  return (
    <form action={action} className="form-card">
      {state?.error && <p className="alert err" role="alert">{state.error}</p>}
      <input type="hidden" name="next" value={next} />
      <div className="seg" role="radiogroup" aria-label="Rodzaj konta">
        <label><input type="radio" name="accountType" value="PRIVATE" checked={type === "PRIVATE"} onChange={() => setType("PRIVATE")} /> Osoba prywatna</label>
        <label><input type="radio" name="accountType" value="COMPANY" checked={type === "COMPANY"} onChange={() => setType("COMPANY")} /> Firma</label>
      </div>
      <div className="field"><label htmlFor="name">Imię i nazwisko</label><input id="name" name="name" autoComplete="name" required defaultValue={v.name} /></div>
      {type === "COMPANY" && (
        <div className="cols">
          <div className="field"><label htmlFor="companyName">Nazwa firmy</label><input id="companyName" name="companyName" autoComplete="organization" required defaultValue={v.companyName} /></div>
          <div className="field"><label htmlFor="nip">NIP</label><input id="nip" name="nip" className="mono" inputMode="numeric" required defaultValue={v.nip} placeholder="1234567890" /></div>
        </div>
      )}
      <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} /></div>
      <div className="field"><label htmlFor="phone">Telefon</label><input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} placeholder="+48 600 000 000" /><span className="hint">Pokazujemy go kupującym w Twoich ogłoszeniach.</span></div>
      <div className="field"><label htmlFor="password">Hasło</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /><span className="hint">Co najmniej 8 znaków.</span></div>
      <button className="btn btn-signal" disabled={pending}>{pending ? "Zakładanie konta…" : "Załóż konto"}</button>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>Masz już konto? <Link className="link-btn" href={`/logowanie?next=${encodeURIComponent(next)}`}>Zaloguj się</Link></p>
    </form>
  );
}

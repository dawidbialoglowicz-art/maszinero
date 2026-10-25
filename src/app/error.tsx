"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap auth" style={{ textAlign: "center" }}>
      <div className="page-head"><h1>Coś poszło nie tak</h1><p className="muted">Nie udało się wczytać tej strony. Spróbuj ponownie za chwilę.</p></div>
      <button className="btn btn-signal" onClick={reset}>Spróbuj ponownie</button>
    </div>
  );
}

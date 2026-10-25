"use client";

import { useState } from "react";

export function PhoneReveal({ phone }: { phone: string }) {
  const [shown, setShown] = useState(false);
  if (shown) return <a className="btn btn-signal mono" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>;
  return (
    <button className="btn btn-signal" type="button" onClick={() => setShown(true)}>
      Pokaż numer {phone.slice(0, 3)} ••• •••
    </button>
  );
}

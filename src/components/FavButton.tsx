"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/lib/actions";

export function FavButton({ id, initial }: { id: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="fav"
      type="button"
      aria-pressed={on}
      aria-label={on ? "Usuń z obserwowanych" : "Dodaj do obserwowanych"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleFavorite(id);
          if (!res.ok) router.push(`/logowanie?next=${encodeURIComponent(location.pathname)}`);
          else setOn(!!res.favorite);
        })
      }
    >
      <svg viewBox="0 0 24 24"><use href="#i-heart" /></svg>
    </button>
  );
}

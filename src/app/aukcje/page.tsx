import type { Metadata } from "next";
import Link from "next/link";
import { ListingBrowser } from "@/components/ListingBrowser";

export const metadata: Metadata = { title: "Aukcje maszyn przemysłowych" };

export default async function Page({ searchParams }: PageProps<"/aukcje">) {
  return (
    <ListingBrowser
      searchParams={await searchParams}
      base="/aukcje"
      fixed={{ typ: "aukcje" }}
      defaultSort="end"
      sorts={["end", "new", "pa", "pd", "y", "h"]}
      intro={
        <section className="band auc-band">
          <div className="wrap">
            <h1>Aukcje maszyn przemysłowych</h1>
            <p>Licytujesz do ustalonego limitu, a system podbija za Ciebie najmniejszą potrzebną kwotą. Oferta w ostatnich 2 minutach przedłuża aukcję, więc nikt nie wygra „na ostatnią sekundę”.</p>
          </div>
        </section>
      }
      empty={<>Teraz nie trwa żadna aukcja w tych filtrach. <Link className="link-btn" href="/dodaj">Wystaw maszynę na aukcję</Link></>}
    />
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ListingBrowser } from "@/components/ListingBrowser";
import { SCRAP_MAX_PLN_PER_KG } from "@/lib/scrap";

export const metadata: Metadata = {
  title: "Maszyny w cenie złomu",
  description: `Maszyny przemysłowe sprzedawane za najwyżej ${SCRAP_MAX_PLN_PER_KG} zł za kilogram: do remontu, na części albo do dalszej pracy.`,
};

export default async function Page({ searchParams }: PageProps<"/cena-zlomu">) {
  return (
    <ListingBrowser
      searchParams={await searchParams}
      base="/cena-zlomu"
      fixed={{ zlom: true }}
      defaultSort="pa"
      intro={
        <section className="band scrap-band">
          <div className="wrap">
            <h1>Maszyny w cenie złomu</h1>
            <p>Każda maszyna w tym dziale kosztuje najwyżej <b className="mono">{SCRAP_MAX_PLN_PER_KG},00 zł/kg</b> masy. Pilnujemy tego przy dodawaniu ogłoszenia, więc nie trafią tu zwykłe oferty. Wiele z tych maszyn nadal pracuje, a inne są na części albo do remontu.</p>
          </div>
        </section>
      }
      empty={<>Brak maszyn w cenie złomu dla tych filtrów. <Link className="link-btn" href="/dodaj">Sprzedaj maszynę w cenie złomu</Link></>}
    />
  );
}

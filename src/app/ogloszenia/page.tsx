import type { Metadata } from "next";
import { ListingBrowser } from "@/components/ListingBrowser";

export const metadata: Metadata = { title: "Maszyny przemysłowe na sprzedaż" };

export default async function Page({ searchParams }: PageProps<"/ogloszenia">) {
  return <ListingBrowser searchParams={await searchParams} base="/ogloszenia" />;
}

import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { Footer, Header } from "@/components/Header";
import { IconSprite } from "@/components/Icons";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin", "latin-ext"], axes: ["wdth"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin", "latin-ext"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin", "latin-ext"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Maszinero – maszyny budowlane, rolnicze i przemysłowe", template: "%s | Maszinero" },
  description: "Ogłoszenia maszyn używanych i nowych od zweryfikowanych dealerów z całej Polski. Koparki, ciągniki, ładowarki, wózki widłowe, dźwigi i obrabiarki CNC.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${archivo.variable} ${publicSans.variable} ${plexMono.variable}`}>
      <body>
        <IconSprite />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

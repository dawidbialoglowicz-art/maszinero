# Maszinero.pl

Ogłoszenia i aukcje maszyn przemysłowych w Polsce. Serwis prowadzi [3core.pl](https://3core.pl).

**Trzy działy:**
1. **Maszyny na sprzedaż**: ogłoszenia z ceną stałą (obrabiarki CNC, prasy, lasery, wtryskarki, sprężarki, wózki, suwnice i inne).
2. **Aukcje**: licytacja z limitem (system podbija za licytującego), ukryta cena minimalna, dogrywka 2 minuty po ofercie w ostatniej chwili.
3. **Maszyny w cenie złomu**: tylko maszyny z ceną najwyżej 2 zł za kilogram masy. Próg pilnuje serwer przy dodawaniu ogłoszenia (`src/lib/scrap.ts`).

**Stack:** Next.js 16 (App Router, Server Actions), React 19, PostgreSQL + Prisma 6, sesja JWT w ciasteczku (bcrypt), zdjęcia w Vercel Blob.

## Co działa

- Wyszukiwarka i filtry: kategoria, województwo, sposób sprzedaży, stan, cena, rok, godziny pracy, tylko dealerzy, VAT, tylko cena złomu. Do tego sortowanie i stronicowanie.
- Strona maszyny: galeria, dane techniczne (godziny pracy, sterowanie, masa, cena za kg, numer seryjny), cena netto i brutto, szacunkowa rata leasingu. Kontakt do sprzedawcy pobierany dopiero po kliknięciu.
- Aukcje: panel licytacji z odliczaniem, historia ofert z ukrytymi nazwiskami, automatyczne odświeżanie. Po zakończeniu sprzedawca widzi dane kupującego, a zwycięzca kontakt do sprzedawcy.
- Konta: osoba prywatna albo firma (NIP ze sprawdzeniem sumy kontrolnej). Limit 8 nieudanych logowań na 15 minut.
- Dodawanie ogłoszeń i aukcji: do 20 zdjęć, zmniejszanych w przeglądarce do 2000 px. Na Vercelu trafiają prosto do Vercel Blob, z pominięciem limitu 4,5 MB na żądanie.
- Moje ogłoszenia i aukcje, obserwowane, konto (telefon jest wymagany do licytowania).
- SEO: sitemap.xml, robots.txt, metadane. Nagłówki bezpieczeństwa.

## Uruchomienie lokalne

```bash
cp .env.example .env        # uzupełnij DATABASE_URL, DIRECT_URL i SESSION_SECRET
npm install
npm run db:migrate          # tworzy tabele
DEMO_PASSWORD=demo12345 npm run db:seed   # opcjonalnie: dane demo (4 konta, 14 maszyn, 4 aukcje)
npm run dev                 # http://localhost:3000
```

Bez `BLOB_READ_WRITE_TOKEN` zdjęcia zapisują się lokalnie w katalogu `uploads/`.

## Testy

```bash
npm run lint && npm run typecheck
DATABASE_URL=postgresql://…/maszinero_test npm test   # 81 testów jednostkowych + 9 testów licytacji na bazie
npm run build && npm run db:seed && npm run test:e2e  # 10 scenariuszy end-to-end w Playwright
```

Testy licytacji uruchamiają się tylko wtedy, gdy nazwa bazy w `DATABASE_URL` zawiera „test”, bo czyszczą swoje dane. Obejmują też równoczesne oferty 12 licytujących. CI na GitHubie (`.github/workflows/ci.yml`) uruchamia całość przy każdym PR.

## Wdrożenie (Vercel + Neon + domena z Hostingera)

1. **Baza danych.** Załóż darmowe konto na [neon.tech](https://neon.tech) i utwórz projekt w regionie Frankfurt (`eu-central-1`). Skopiuj dwa adresy: *pooled* (do `DATABASE_URL`) i *direct* (do `DIRECT_URL`).
2. **Vercel.** Na [vercel.com](https://vercel.com) zaloguj się przez GitHub, wybierz *Add New → Project* i zaimportuj repozytorium `maszinero`.
3. **Zmienne środowiskowe** (*Settings → Environment Variables*):
   - `DATABASE_URL`, `DIRECT_URL`: adresy z Neon,
   - `SESSION_SECRET`: losowy ciąg min. 32 znaki (`openssl rand -base64 32`),
   - `CRON_SECRET`: drugi losowy ciąg (zabezpiecza zadanie zamykające aukcje),
   - `SITE_URL`: `https://maszinero.pl`.
4. **Zdjęcia.** *Storage → Create → Blob*. Vercel sam doda `BLOB_READ_WRITE_TOKEN`.
5. **Deploy.** Build sam uruchamia migracje bazy (`prisma migrate deploy`). Uwaga: podglądy PR-ów też je uruchamiają, więc dla podglądów ustaw osobną bazę (w Neon gałąź `preview`).
6. **Dane demo na produkcji.** Seed jest tam zablokowany. Jeśli chcesz pokazać serwis z przykładami, uruchom go ze swojego komputera: `ALLOW_DEMO_SEED=1 DEMO_PASSWORD=<silne hasło> DATABASE_URL=<z Neon> npm run db:seed`. Przed startem usuń konta `demo-*@maszinero.pl`.
7. **Domena maszinero.pl.** W Vercelu: *Settings → Domains → Add* i wpisz `maszinero.pl` oraz `www.maszinero.pl`. Potem w panelu Hostingera (*Domeny → maszinero.pl → DNS / Nameservers*):
   - usuń istniejące rekordy **A** i **CNAME** dla `@` i `www`,
   - dodaj rekord **A**: nazwa `@`, wartość `76.76.21.21`,
   - dodaj rekord **CNAME**: nazwa `www`, wartość `cname.vercel-dns.com`.

   Jeśli Vercel przy dodawaniu domeny pokaże inne wartości, użyj tych z Vercela. Propagacja DNS trwa od kilku minut do kilku godzin, a certyfikat HTTPS Vercel wystawi automatycznie.

Aukcje zamykają się same przy wyświetlaniu stron. Dodatkowo raz na dobę robi to Vercel Cron (`vercel.json`). Na płatnym planie Vercela możesz ustawić częstszy harmonogram.

## Administracja i agent AI

Panel `/admin` widzą tylko konta z rolą administratora: `UPDATE "User" SET role = 'ADMIN' WHERE email = '…';`

Agent (`src/lib/agent/`) pomaga prowadzić serwis i **niczego ważnego nie robi sam**: każda propozycja trafia do kolejki decyzji w panelu.

- **Moderacja ogłoszeń.** Po dodaniu ogłoszenia agent (Claude API) ocenia w tle treść i zdjęcia: spam, oszustwa, zdjęcia niepasujące do opisu, podejrzane ceny, kontakt w opisie, złą kategorię, zawyżoną masę w dziale złomu. Ogłoszenie publikuje się od razu; oczywisty spam agent wstrzymuje (status `HIDDEN`) do Twojej decyzji. Ogłoszeń zweryfikowanych dealerów i aukcji z ofertami sam nie wstrzymuje.
- **Weryfikacja firm.** Po rejestracji z NIP-em sprawdza firmę w Białej liście VAT (bezpłatne API Ministerstwa Finansów) i proponuje odznakę dealera albo ostrzega (brak w wykazie, inna nazwa, nieczynny VAT). Działa bez klucza Claude API.
- **Poranny raport.** Codziennie o 5:00 UTC (Vercel Cron `/api/cron/agent`) agent nadrabia niesprawdzone ogłoszenia i firmy i zapisuje raport z uwagami w panelu.
- **Koszty.** Każde wywołanie Claude API trafia do dziennika (`AgentRun`), a panel pokazuje koszt z ostatnich 30 dni. Ustaw też miesięczny limit wydatków w [console.anthropic.com](https://console.anthropic.com).

Konfiguracja na Vercelu: `ANTHROPIC_API_KEY` (bez niego działa tylko sprawdzanie NIP) i opcjonalnie `AGENT_MODEL` (domyślnie `claude-opus-5-5`; tańsze: `claude-sonnet-5-5`, `claude-haiku-5-5`). Zdjęcia muszą być dostępne pod publicznym adresem (Vercel Blob), żeby agent mógł je obejrzeć.

## Co dalej

- Aukcje prowadzone przez 3core.pl jako dom aukcyjny: model danych jest gotowy (`mode`, `buyerPremiumBp`, `depositAmount`), brakuje panelu i płatności wadium.
- Powiadomienia e-mail (przebicie oferty, koniec aukcji, wygrana), np. przez Resend.
- Agent: asystent sprzedawcy (opis ze zdjęć, import ofert dealerów), czat dla kupujących, pilnowanie aukcji, raport e-mailem.
- Płatności za pakiety (Przelewy24 / Stripe). Cennik na stronie jest na razie informacyjny.
- Edycja ogłoszeń, reset hasła, regulamin i polityka prywatności (RODO). Treść prawna musi przygotować lub sprawdzić prawnik.
- Wynajem powierzchni przemysłowych jako osobny dział (`/hale`).

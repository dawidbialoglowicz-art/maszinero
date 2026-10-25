# Maszinero.pl

Platforma ogłoszeń maszyn budowlanych, rolniczych i przemysłowych w Polsce.

**Stack:** Next.js 16 (App Router, Server Actions), PostgreSQL + Prisma, logowanie e-mail/hasło (sesja JWT w ciasteczku), zdjęcia w Vercel Blob.

## Co działa

- Strona główna z wyszukiwarką, kategoriami i najnowszymi ogłoszeniami
- Lista ogłoszeń z filtrami (kategoria, województwo, cena, rok, motogodziny, dealer, VAT), sortowaniem i stronicowaniem
- Strona ogłoszenia: galeria, dane techniczne, cena netto/brutto, szacunkowa rata leasingu, kontakt ze sprzedającym
- Rejestracja (osoba prywatna / firma z NIP) i logowanie
- Dodawanie ogłoszeń ze zdjęciami (do 20, JPG/PNG/WebP, maks. 8 MB)
- „Moje ogłoszenia”: wyświetlenia, obserwujący, oznaczanie jako sprzedane, usuwanie
- Obserwowane ogłoszenia

## Uruchomienie lokalne

```bash
cp .env.example .env        # uzupełnij DATABASE_URL i SESSION_SECRET
npm install
npm run db:migrate          # tworzy tabele
npm run db:seed             # opcjonalnie: 16 ogłoszeń demo (hasło kont demo: demo12345)
npm run dev                 # http://localhost:3000
```

Bez `BLOB_READ_WRITE_TOKEN` zdjęcia zapisują się lokalnie w katalogu `uploads/`.

## Wdrożenie (Vercel + baza Neon + domena z Hostingera)

1. **Baza danych.** Załóż darmowe konto na [neon.tech](https://neon.tech), utwórz projekt w regionie Frankfurt (`eu-central-1`) i skopiuj connection string (`postgresql://...`).
2. **Vercel.** Na [vercel.com](https://vercel.com) zaloguj się przez GitHub, wybierz *Add New → Project* i zaimportuj repozytorium `maszinero`.
3. **Zmienne środowiskowe** (w Vercelu: *Settings → Environment Variables*):
   - `DATABASE_URL`: connection string z Neon
   - `SESSION_SECRET`: losowy ciąg min. 32 znaki (np. wynik `openssl rand -base64 32`)
4. **Zdjęcia.** W projekcie Vercel: *Storage → Create → Blob*. Vercel sam doda `BLOB_READ_WRITE_TOKEN`.
5. **Deploy.** Build sam uruchamia migracje bazy (`prisma migrate deploy`). Dane demo możesz wgrać lokalnie: `DATABASE_URL="<z Neon>" npm run db:seed`.
6. **Domena maszinero.pl.** W Vercelu: *Settings → Domains → Add* i wpisz `maszinero.pl` oraz `www.maszinero.pl`. Potem w panelu Hostingera (*Domeny → maszinero.pl → DNS / Nameservers*):
   - usuń istniejące rekordy **A** i **CNAME** dla `@` i `www`,
   - dodaj rekord **A**: nazwa `@`, wartość `76.76.21.21`,
   - dodaj rekord **CNAME**: nazwa `www`, wartość `cname.vercel-dns.com`.

   Dokładne wartości Vercel pokaże przy dodawaniu domeny; jeśli różnią się od powyższych, użyj tych z Vercela. Propagacja DNS trwa zwykle od kilku minut do kilku godzin, a certyfikat HTTPS Vercel wystawi automatycznie.

## Co dalej

- Weryfikacja dealerów (dziś pole `verified` ustawia się ręcznie w bazie)
- Płatności za pakiety (np. Przelewy24 / Stripe)
- Wiadomości między kupującym a sprzedającym w serwisie
- Edycja ogłoszeń, reset hasła e-mailem, regulamin i polityka prywatności (RODO)

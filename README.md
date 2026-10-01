# Iloczyn — arena matematyczna

Responsywna aplikacja Next.js PWA w języku polskim. Prowadzący zakłada konkurs, przekazuje adres i sześciocyfrowy kod, czeka na komplet uczestników i rozpoczyna grę na wszystkich urządzeniach. Widzi postęp i pobiera wyniki CSV. Uczestnicy otrzymują niezależne zestawy: 10 mnożeń i 10 dzieleń bez reszty. Błędna odpowiedź pozostawia to samo pytanie; dopiero poprawna daje punkt i przechodzi dalej. Pierwszy do 20 punktów zatrzymuje pozostałych w swojej grupie. Każda grupa ma osobnego zwycięzcę; nie ma automatycznego turnieju eliminacyjnego.

## Lokalnie

Wymagany Node.js 20.9 lub nowszy.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Bez kluczy Supabase działa demo w pamięci procesu (bez trwałości i bez współdzielenia między instancjami). Otwórz osobne profile przeglądarki lub inne urządzenia pod adresem IP komputera. Jeden profil przechowuje jedną sesję. PWA wymaga HTTPS lub localhost. Wersja demo na Vercel służy wyłącznie prezentacji interfejsu; nie nadaje się do rzeczywistego konkursu, ponieważ instancje nie współdzielą pamięci.

## Supabase i pierwszy import do Vercel

1. Utwórz projekt Supabase. W SQL Editor uruchom `supabase/schema.sql`.
2. W Vercel wybierz Add New → Project → import `tadek24/matematyka`, framework Next.js, katalog główny repozytorium. Nie zmieniaj standardowych poleceń budowania.
3. Ustaw zmienne serwerowe:
   - `SUPABASE_URL`: URL projektu Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: klucz service_role z Supabase. Nigdy nie używaj prefiksu NEXT_PUBLIC dla tego klucza.
   - `ADMIN_PASSWORD`: silne hasło, minimum zalecane 20 losowych znaków. Przekaż je tylko prowadzącym.
   - `DEMO_MODE=false`.
4. Wykonaj Deploy. Po zmianie zmiennych wykonaj ponowne wdrożenie.
5. Przeprowadź próbę na trzech urządzeniach: prowadzący i dwóch uczestników. Sprawdź wspólny start, błędną odpowiedź, zwycięstwo, ukrycie aplikacji i eksport CSV. Dla grup czteroosobowych wybierz grupę 4 i liczbę uczestników podzielną przez 4.

Kod nie wykonuje importu ani wdrożenia do Vercel. Do integracji nie trzeba konfigurować Supabase Auth ani włączać publicznego odczytu bazy. Dla realnych zawodów ustaw ograniczenia żądań do `/api/contest` w Vercel Firewall (szczególnie create/join) oraz budżety i alerty usług. Hasło administratora jest wspólne; nie jest to wielokontowa platforma szkolna.

## Architektura i bezpieczeństwo

Stan gry i odpowiedzi pozostają na serwerze. Klient dostaje wyłącznie bieżące działanie, nigdy oczekiwany wynik ani token innej osoby. Tokeny sesji mają 256 bitów losowości; w bazie przechowywane są ich skróty. Kod konkursu pozwala dołączyć tylko przed startem; nie udziela dostępu do istniejących sesji. Mutacje wymagają tokenu i są kontrolowane przez serwer. RLS blokuje publiczny dostęp do tabeli. Funkcja zapisu jest dostępna wyłącznie service_role.

Wspólny stan w PostgreSQL używa atomowego compare-and-swap z wersją i ponowieniem na konflikcie. Zapobiega utracie punktów, podwójnemu rozliczeniu pytania i dwóm zwycięzcom w grupie. Odpowiedź zawiera indeks pytania. Jeden request, który pierwszy zapisze 20. punkt, wygrywa. Nie decyduje czas zegara klienta. Podgląd na urządzeniach aktualizuje się przez polling co sekundę, zgodny z bezstanowym hostingiem Vercel. Przy dużej liczbie uczestników uwzględnij koszty odczytów i zapisu bazy.

Poziomy: Rozgrzewka — czynniki 2–10, iloczyn do 100; Zawody — 2–20, do 400; Mistrzostwo — 2–50 z iloczynem do 1000. Dzielenie odwraca poprawne mnożenie; wszystkie operandy i wyniki są całkowite i nie przekraczają 1000. W obrębie danego rodzaju działań nie ma powtórzeń w zestawie.

## Opuszczenie aplikacji i połączenie

`visibilitychange` i `pagehide` zgłaszają rezygnację z wynikiem 0 poprzez request keepalive. Po powrocie aplikacja ponawia lokalnie zapisany sygnał rezygnacji. Serwer kończy udział również po ponad 20 sekundach bez heartbeat; sprawdzenie następuje przy kolejnym żądaniu któregokolwiek urządzenia. Drugi uczestnik może grać dalej. Wyłączenie telefonu, awaria sieci lub zablokowanie ekranu mogą więc spowodować dyskwalifikację.

Przeglądarka nie zapewnia niezawodnego wykrywania każdego opuszczenia ani odporności na celową modyfikację klienta. Uczestnik może wyłączyć zdarzenia w narzędziach deweloperskich; nadzór prowadzącego nadal jest konieczny. Serwer chroni przyznawanie punktów, lecz nie zastępuje nadzoru zawodów. Administrator może przełączać aplikacje bez dyskwalifikacji.

## Instalacja PWA

Android/Chrome: menu → Zainstaluj aplikację albo przycisk Zainstaluj, jeśli przeglądarka go udostępnia. iPhone/Safari: Udostępnij → Do ekranu początkowego. Manifest zawiera ikony PNG 192 i 512, a service worker pokazuje ekran braku połączenia. Quiz wymaga internetu; API i odpowiedzi nie są cache'owane. Nie wchodź do menu instalacji podczas aktywnego konkursu.

## Wyniki i utrzymanie

Wyniki zapisują się automatycznie w Supabase wraz ze stanem konkursu. Eksport CSV jest dostępny prowadzącemu; ponowne wejście do panelu na tym samym profilu odtwarza sesję z localStorage. Zapisany token administratora traktuj jak hasło. Bez niego panelu nie można odzyskać przez sam kod. Kolejny konkurs zakłada się po zakończeniu aktualnego.

Nie ma publicznej historii nazwisk ani listowania konkursów. Ustal okres retencji i usuwaj niepotrzebne rekordy w Supabase, np. po 30 dniach: `delete from public.contest_rooms where created_at < now() - interval '30 days';`. Zrób eksport przed usuwaniem. Imiona uczestników są danymi, które organizator powinien chronić.

## Weryfikacja

```sh
npm test
npm run typecheck
npm run build
```

Testy obejmują poprawność i zakres arytmetyki, bilans zestawu, błędne odpowiedzi, ponowne zgłoszenie, zatrzymanie własnej grupy, timeout oraz brak wycieku odpowiedzi i tokenów. Konfigurację z prawdziwym Supabase i zachowanie instalacji na telefonach trzeba zweryfikować po podłączeniu usług. Dokumentacja platform: [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

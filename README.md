# CASTILLA Shop

Next.js-Shop mit Postgres-Datenbank (Neon oder Supabase), Foto-Speicher (Vercel Blob oder Supabase Storage) und Verwaltung unter `/admin`. Gehostet auf Vercel.

## Was drin ist

- Startseite, Shop mit Kategorien, Filter und Sortierung, Produktseiten, Suche, Warenkorb und Kasse
- Bestellungen landen in der Datenbank, der Lagerbestand sinkt automatisch. Wird eine Bestellung storniert, gehen die Artikel zurück ins Lager.
- Verwaltung mit Passwort: Produkte mit zwei Fotos, Bestellungen mit Status, Startbild, Drop-Countdown, Banner, Versandtext, Newsletter-Liste

## Auf Vercel bringen

1. **GitHub:** Neues Repository anlegen (z. B. `castilla-shop`) und alle Dateien aus diesem Ordner hochladen.
2. **Vercel:** *Add New → Project*, das Repository importieren und auf *Deploy* klicken.
3. **Datenbank verbinden:** Im Vercel-Projekt den Reiter *Storage* öffnen → *Create Database* → **Neon** → Region Frankfurt → mit dem Projekt verbinden (Prefix-Feld leer lassen). Vercel setzt `DATABASE_URL` automatisch.
   *Alternativ Supabase:* funktioniert genauso, Vercel setzt dann `POSTGRES_URL`, `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY`.
4. **Foto-Speicher verbinden:** Wieder *Storage* → *Create* → **Blob** → mit dem Projekt verbinden. Vercel setzt `BLOB_READ_WRITE_TOKEN`. (Bei Supabase nicht nötig, dort landen die Fotos im Bucket `produkte`.)
5. **Tabellen anlegen:** Bei der Datenbank *Open in Neon* (bzw. Supabase) → *SQL Editor*, den kompletten Inhalt von `db/schema.sql` einfügen und ausführen.
6. **Admin-Zugang:** In Vercel unter *Settings → Environment Variables* zwei Variablen anlegen:
   - `ADMIN_PASSWORD`: dein Passwort für die Verwaltung
   - `AUTH_SECRET`: eine zufällige Zeichenkette mit mindestens 32 Zeichen (z. B. auf https://generate-secret.vercel.app/32 erzeugen)
7. **Neu deployen:** *Deployments* → beim letzten Deployment *Redeploy*.
8. Die Verwaltung erreichst du unter `deine-domain.de/admin`.

Eigene Domain: *Settings → Domains*.

## Provisionslinks (Creator-Programm)

- In der Verwaltung pro Produkt eine Provision in % eintragen. Wer ein solches Produkt kauft, bekommt automatisch einen persönlichen Link (`/r/…`) auf der Bestellbestätigung und per E-Mail.
- Kauft jemand über den Link, wird die Provision vorgemerkt. Freigegeben wird sie erst, wenn die Bestellung als „versendet“ markiert ist und die eingestellte Frist (Standard 21 Tage) vorbei ist. Stornierte oder retournierte Bestellungen bekommen keine Provision.
- Schutz vor Missbrauch: Käufe über den eigenen Link (gleiche E-Mail oder gleiche Lieferadresse) zählen nicht, Klicks werden pro Besucher und Tag nur einmal gezählt, Bots werden ignoriert, Creators lassen sich deaktivieren.
- Creators sehen Klicks, Käufe und Provision im Partnerbereich (`/partner?t=…`) und hinterlegen dort ihre Auszahlungsdaten. Ausgezahlt wird manuell, danach in der Verwaltung „als ausgezahlt markieren“.

## E-Mails (Bestellbestätigung)

E-Mails werden über [Resend](https://resend.com) verschickt. In Vercel unter *Environment Variables* eintragen:
- `RESEND_API_KEY`: API-Schlüssel aus Resend
- `MAIL_FROM`: Absender, z. B. `CASTILLA <bestellung@deine-domain.de>` (die Domain muss in Resend bestätigt sein)
- `ADMIN_EMAIL` (optional): an diese Adresse geht bei jeder Bestellung eine Benachrichtigung

Ohne diese Werte läuft der Shop normal weiter, es werden nur keine E-Mails verschickt.

## Sicherheit

- Der Shop greift nur serverseitig auf die Datenbank zu. Bei Supabase ist zusätzlich Row Level Security aktiv, damit die öffentliche Supabase-Schnittstelle nicht an Kundendaten kommt.
- Zugangsdaten wie `SUPABASE_SERVICE_ROLE_KEY` oder `BLOB_READ_WRITE_TOKEN` dürfen nie öffentlich landen. Sie werden nur auf dem Server genutzt.

## Lokal starten (optional)

```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run db:setup             # Tabellen anlegen (statt SQL Editor)
npm run dev
```

## Vor dem echten Verkauf

- Impressum, Datenschutzerklärung, AGB und Widerrufsbelehrung ergänzen (in Deutschland Pflicht)
- Online-Zahlung anbinden (z. B. Stripe). Aktuell wird auf Rechnung bestellt.
- Bestellbestätigung per E-Mail (z. B. über Resend)

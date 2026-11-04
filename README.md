# CASTILLA Shop

Next.js-Shop mit Supabase (Postgres-Datenbank und Foto-Speicher) und Verwaltung unter `/admin`. Gehostet auf Vercel.

## Was drin ist

- Startseite, Shop mit Kategorien, Filter und Sortierung, Produktseiten, Suche, Warenkorb und Kasse
- Bestellungen landen in der Datenbank, der Lagerbestand sinkt automatisch. Wird eine Bestellung storniert, gehen die Artikel zurück ins Lager.
- Verwaltung mit Passwort: Produkte mit zwei Fotos, Bestellungen mit Status, Startbild, Drop-Countdown, Banner, Versandtext, Newsletter-Liste
 
## Auf Vercel bringen

1. **GitHub:** Neues Repository anlegen (z. B. `castilla-shop`) und alle Dateien aus diesem Ordner hochladen.
2. **Vercel:** *Add New → Project*, das Repository importieren und auf *Deploy* klicken.
3. **Supabase verbinden:** Im Vercel-Projekt den Reiter *Storage* öffnen → *Create Database* → **Supabase** → Region **Frankfurt (eu-central-1)** wählen → mit dem Projekt verbinden. Vercel setzt `POSTGRES_URL`, `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` automatisch.
   *Du hast schon ein Supabase-Projekt?* Dann trage die drei Werte unter *Settings → Environment Variables* selbst ein (siehe `.env.example`). `POSTGRES_URL` findest du in Supabase unter *Connect → Transaction pooler*.
4. **Tabellen anlegen:** In Supabase den *SQL Editor* öffnen, den kompletten Inhalt von `db/schema.sql` einfügen und auf *Run* klicken. Das legt die Tabellen, die Beispielprodukte und den Foto-Bucket `produkte` an.
5. **Admin-Zugang:** In Vercel unter *Settings → Environment Variables* zwei Variablen anlegen:
   - `ADMIN_PASSWORD`: dein Passwort für die Verwaltung
   - `AUTH_SECRET`: eine zufällige Zeichenkette mit mindestens 32 Zeichen (z. B. auf https://generate-secret.vercel.app/32 erzeugen)
6. **Neu deployen:** *Deployments* → beim letzten Deployment *Redeploy*.
7. Die Verwaltung erreichst du unter `deine-domain.de/admin`.

Eigene Domain: *Settings → Domains*.

## Sicherheit

- Die Tabellen haben Row Level Security aktiviert. Über Supabases öffentliche Schnittstelle (anon key) kommt niemand an Bestellungen oder Kundendaten. Der Shop greift nur serverseitig zu.
- Der `SUPABASE_SERVICE_ROLE_KEY` darf nie im Browser-Code oder öffentlich landen. Er wird hier nur auf dem Server für Foto-Uploads genutzt.

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

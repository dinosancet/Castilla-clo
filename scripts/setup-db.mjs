// Legt Tabellen, Beispieldaten und den Foto-Bucket an.
// Aufruf: DATABASE_URL=... npm run db:setup   (am besten die "Direct connection" bzw. POSTGRES_URL_NON_POOLING)
import { readFileSync } from "node:fs";
import postgres from "postgres";

const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!raw) {
  console.error("Keine Datenbank-URL gefunden. Setze DATABASE_URL (Supabase > Connect).");
  process.exit(1);
}
const u = new URL(raw);
const local = ["localhost", "127.0.0.1"].includes(u.hostname);
u.search = "";
const sql = postgres(u.toString(), { ssl: local ? false : "require", prepare: false, max: 1, onnotice: () => {} });
await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
await sql.end();
console.log("Fertig: Tabellen und Beispieldaten sind angelegt.");

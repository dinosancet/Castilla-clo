import postgres from "postgres";

let client: postgres.Sql | null = null;

/** Connection string set by the Vercel integration (Neon: DATABASE_URL, Supabase: POSTGRES_URL) or by hand. */
export function connectionString() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) throw new Error("POSTGRES_URL bzw. DATABASE_URL ist nicht gesetzt.");
  return raw;
}

/** Strip query parameters some clients don't understand (e.g. "supa=base-pooler.x") and pick SSL. */
export function clientOptions(raw: string) {
  const u = new URL(raw);
  const local = ["localhost", "127.0.0.1"].includes(u.hostname);
  u.search = "";
  return { url: u.toString(), ssl: local ? false : ("require" as const) };
}

/** Tagged-template SQL client. Values are always sent as parameters. */
export function sql() {
  if (!client) {
    const { url, ssl } = clientOptions(connectionString());
    // prepare:false is required for poolers in transaction mode (Supabase port 6543, Neon "-pooler").
    client = postgres(url, { ssl, prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} });
  }
  return client;
}

export type Row = Record<string, any>;

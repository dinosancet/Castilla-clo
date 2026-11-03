import postgres from "postgres";

let client: postgres.Sql | null = null;

/** Connection string from the Vercel–Supabase integration (POSTGRES_URL) or set by hand (DATABASE_URL). */
export function connectionString() {
  const raw = process.env.POSTGRES_URL || process.env.DATABASE_URL;
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
    // prepare:false is required for Supabase's transaction pooler (port 6543).
    client = postgres(url, { ssl, prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
  }
  return client;
}

export type Row = Record<string, any>;

import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sql } from "./db";
import { ready } from "./migrate";
import { toOrder } from "./data";
import type { Order } from "./catalog";

export const CUSTOMER_COOKIE = "castilla_kunde";
const CODE_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_15_MIN = 5;

export type CustomerProfile = { id: string; email: string; name: string; street: string; zip: string; city: string; createdAt: string };

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  return new TextEncoder().encode(s);
}
const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${process.env.AUTH_SECRET}|${email}|${code}`).digest("hex");
export const normEmail = (e: string) => e.trim().toLowerCase();

/** Creates a 6-digit login code. Returns null when too many codes were requested recently. */
export async function createLoginCode(email: string) {
  await ready();
  const db = sql();
  const [{ n }] = await db`SELECT count(*)::int AS n FROM login_codes WHERE email = ${email} AND created_at > now() - interval '15 minutes'`;
  if (n >= MAX_CODES_PER_15_MIN) return null;
  await db`DELETE FROM login_codes WHERE expires_at < now() - interval '1 day'`;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db`
    INSERT INTO login_codes (id, email, code_hash, expires_at)
    VALUES (${randomBytes(12).toString("hex")}, ${email}, ${hashCode(email, code)}, now() + make_interval(mins => ${CODE_MINUTES}))`;
  return code;
}

/** Checks a code (newest valid one for that e-mail). On success the code is used up. */
export async function verifyLoginCode(email: string, code: string): Promise<"ok" | "wrong" | "expired" | "locked"> {
  await ready();
  const db = sql();
  const [row] = await db`
    SELECT id, code_hash, attempts FROM login_codes
    WHERE email = ${email} AND expires_at > now() ORDER BY created_at DESC LIMIT 1`;
  if (!row) return "expired";
  if (row.attempts >= MAX_ATTEMPTS) return "locked";
  const a = Buffer.from(row.code_hash, "hex");
  const b = Buffer.from(hashCode(email, code.replace(/\D/g, "")), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db`UPDATE login_codes SET attempts = attempts + 1 WHERE id = ${row.id}`;
    return row.attempts + 1 >= MAX_ATTEMPTS ? "locked" : "wrong";
  }
  await db`DELETE FROM login_codes WHERE email = ${email}`;
  return "ok";
}

/** Creates the customer record on first login and prefills it from the latest order. */
export async function upsertCustomer(email: string) {
  const db = sql();
  const [last] = await db`SELECT customer FROM orders WHERE lower(customer->>'email') = ${email} ORDER BY created_at DESC LIMIT 1`;
  const c = (last?.customer ?? {}) as Record<string, string>;
  await db`
    INSERT INTO customers (id, email, name, street, zip, city, last_login_at)
    VALUES (${randomBytes(8).toString("hex")}, ${email}, ${c.name ?? ""}, ${c.street ?? ""}, ${c.zip ?? ""}, ${c.city ?? ""}, now())
    ON CONFLICT (email) DO UPDATE SET last_login_at = now()`;
}

export async function createSessionToken(email: string) {
  return new SignJWT({ role: "kunde", email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(key());
}

export const sessionCookie = (token: string) => ({
  name: CUSTOMER_COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});

/** E-mail of the logged-in customer, or null. */
export async function currentEmail(): Promise<string | null> {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.role === "kunde" && typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function getProfile(email: string): Promise<CustomerProfile | null> {
  await ready();
  const [r] = await sql()`SELECT * FROM customers WHERE email = ${email}`;
  return r ? { id: r.id, email: r.email, name: r.name, street: r.street, zip: r.zip, city: r.city, createdAt: new Date(r.created_at).toISOString() } : null;
}

export async function ordersOf(email: string): Promise<Order[]> {
  await ready();
  const rows = await sql()`SELECT * FROM orders WHERE lower(customer->>'email') = ${email} ORDER BY created_at DESC`;
  return rows.map(toOrder);
}

export async function creatorTokenOf(email: string): Promise<string | null> {
  await ready();
  const [r] = await sql()`SELECT token FROM creators WHERE email = ${email}`;
  return r?.token ?? null;
}

export type CustomerRow = {
  email: string; name: string; hasAccount: boolean; lastLoginAt: string | null; createdAt: string | null;
  orders: number; spentCents: number; lastOrderAt: string | null; address: string;
  newsletter: boolean; creatorId: string | null;
};

/** Customer file for the admin: everyone who ordered, has an account, or both — merged by e-mail. */
export async function getCustomerFile(): Promise<CustomerRow[]> {
  await ready();
  const rows = await sql()`
    WITH o AS (
      SELECT lower(customer->>'email') AS email, count(*)::int AS n,
        COALESCE(sum(total_cents) FILTER (WHERE status NOT IN ('storniert','retourniert')), 0)::int AS spent,
        max(created_at) AS last_at, min(created_at) AS first_at,
        (array_agg(customer ORDER BY created_at DESC))[1] AS latest
      FROM orders GROUP BY 1
    )
    SELECT COALESCE(c.email, o.email) AS email,
      COALESCE(NULLIF(c.name, ''), o.latest->>'name', '') AS name,
      c.id IS NOT NULL AS has_account, c.last_login_at, COALESCE(c.created_at, o.first_at) AS created_at,
      COALESCE(o.n, 0) AS n, COALESCE(o.spent, 0) AS spent, o.last_at,
      COALESCE(NULLIF(c.street, ''), o.latest->>'street', '') AS street,
      COALESCE(NULLIF(c.zip, ''), o.latest->>'zip', '') AS zip,
      COALESCE(NULLIF(c.city, ''), o.latest->>'city', '') AS city,
      EXISTS (SELECT 1 FROM newsletter nl WHERE nl.email = COALESCE(c.email, o.email) AND nl.confirmed_at IS NOT NULL) AS newsletter,
      cr.id AS creator_id
    FROM customers c FULL OUTER JOIN o ON o.email = c.email
    LEFT JOIN creators cr ON cr.email = COALESCE(c.email, o.email)
    ORDER BY COALESCE(o.last_at, c.created_at) DESC NULLS LAST`;
  return rows.map((r) => ({
    email: r.email, name: r.name, hasAccount: r.has_account,
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    orders: r.n, spentCents: r.spent, lastOrderAt: r.last_at ? new Date(r.last_at).toISOString() : null,
    address: [r.street, [r.zip, r.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    newsletter: r.newsletter, creatorId: r.creator_id ?? null,
  }));
}

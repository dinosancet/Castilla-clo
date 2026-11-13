import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql, type Row } from "./db";
import { ready } from "./migrate";
import { getSettings } from "./data";
import type { Commission, Creator, CreatorLink, Customer, OrderItem } from "./catalog";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function randomCode(len = 8) {
  return Array.from(randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Anonymous visitor fingerprint for click de-duplication. Changes daily, raw IP is never stored. */
export function visitorHash(ip: string, ua: string) {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|preview|whatsapp|telegram|discord|curl|wget|python|headless/i;
export const isBot = (ua: string) => !ua || BOTS.test(ua);

const norm = (s: string) => s.toLowerCase().replace(/str(asse|aße|\.)/g, "str").replace(/[^a-z0-9]/g, "");

export type BuyerLink = { code: string; productId: string; productName: string };

/**
 * Called after an order was saved.
 * 1) If the buyer came through a creator link, books a commission for the promoted product —
 *    unless it looks like a self-referral (same e-mail or same shipping address as the creator).
 * 2) Creates the buyer's own links for every product with commission > 0.
 */
export async function afterOrder(orderId: string, items: OrderItem[], customer: Customer, refCode: string | null) {
  await ready();
  const db = sql();
  const email = customer.email.trim().toLowerCase();

  if (refCode) {
    const [link] = await db`
      SELECT l.code, l.product_id, c.id AS creator_id, c.email, c.active, p.commission_percent
      FROM affiliate_links l JOIN creators c ON c.id = l.creator_id LEFT JOIN products p ON p.id = l.product_id
      WHERE l.code = ${refCode}`;
    if (link && link.active && link.email !== email) {
      const ownAddresses = await db`
        SELECT customer->>'street' AS street, customer->>'zip' AS zip FROM orders
        WHERE lower(customer->>'email') = ${link.email}`;
      const sameAddress = ownAddresses.some((a) => norm(a.street ?? "") === norm(customer.street) && norm(a.zip ?? "") === norm(customer.zip));
      const pct = Number(link.commission_percent ?? 0);
      const base = items.filter((i) => i.productId === link.product_id).reduce((a, i) => a + i.priceCents * i.qty, 0);
      const amount = Math.round((base * pct) / 100);
      if (!sameAddress && amount > 0) {
        await db`UPDATE orders SET ref_code = ${refCode} WHERE id = ${orderId}`;
        await db`
          INSERT INTO commissions (id, order_id, creator_id, code, amount_cents)
          VALUES (${randomCode(12)}, ${orderId}, ${link.creator_id}, ${refCode}, ${amount})
          ON CONFLICT (order_id) DO NOTHING`;
      }
    }
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const eligible = await db`SELECT id, name FROM products WHERE id = ANY(${productIds}) AND commission_percent > 0`;
  if (!eligible.length) return { token: null as string | null, links: [] as BuyerLink[] };

  const [creator] = await db`
    INSERT INTO creators (id, email, name, token) VALUES (${randomCode(10)}, ${email}, ${customer.name.trim()}, ${randomBytes(24).toString("hex")})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, token, active`;
  if (!creator.active) return { token: null, links: [] };
  for (const p of eligible) {
    await db`
      INSERT INTO affiliate_links (code, creator_id, product_id) VALUES (${randomCode()}, ${creator.id}, ${p.id})
      ON CONFLICT (creator_id, product_id) DO NOTHING`;
  }
  const links = await db`
    SELECT l.code, l.product_id, p.name FROM affiliate_links l JOIN products p ON p.id = l.product_id
    WHERE l.creator_id = ${creator.id} AND l.product_id = ANY(${eligible.map((p) => p.id as string)})`;
  return { token: creator.token as string, links: links.map((l) => ({ code: l.code, productId: l.product_id, productName: l.name })) };
}

/** Links a buyer received for the products of one order (shown on the order confirmation page). */
export async function linksForOrder(email: string, productIds: string[]) {
  await ready();
  const rows = await sql()`
    SELECT l.code, l.product_id, p.name, c.token FROM creators c
    JOIN affiliate_links l ON l.creator_id = c.id JOIN products p ON p.id = l.product_id
    WHERE c.email = ${email.toLowerCase()} AND c.active AND l.product_id = ANY(${productIds})`;
  return { token: (rows[0]?.token as string) ?? null, links: rows.map((r) => ({ code: r.code, productId: r.product_id, productName: r.name })) as BuyerLink[] };
}

/** SQL fragment: commissions with their derived status. */
function commissionRows(holdDays: number, creatorId: string | null) {
  const db = sql();
  return db`
    SELECT cm.*, o.status AS order_status, o.shipped_at,
      COALESCE(p.name, l.product_id) AS product_name,
      CASE
        WHEN cm.paid_at IS NOT NULL THEN 'ausgezahlt'
        WHEN o.status IN ('storniert','retourniert') THEN 'storniert'
        WHEN o.status = 'versendet' AND o.shipped_at + make_interval(days => ${holdDays}) <= now() THEN 'freigegeben'
        ELSE 'vorgemerkt'
      END AS cstatus,
      CASE WHEN o.shipped_at IS NOT NULL THEN o.shipped_at + make_interval(days => ${holdDays}) END AS release_at
    FROM commissions cm
    JOIN orders o ON o.id = cm.order_id
    JOIN affiliate_links l ON l.code = cm.code
    LEFT JOIN products p ON p.id = l.product_id
    ${creatorId ? db`WHERE cm.creator_id = ${creatorId}` : db``}
    ORDER BY cm.created_at DESC`;
}

const toCommission = (r: Row): Commission => ({
  id: r.id, orderId: r.order_id, creatorId: r.creator_id, code: r.code, productName: r.product_name,
  amountCents: Number(r.amount_cents), status: r.cstatus, createdAt: new Date(r.created_at).toISOString(),
  releaseAt: r.release_at ? new Date(r.release_at).toISOString() : null,
});

async function linkStats(creatorId: string | null): Promise<CreatorLink[]> {
  const db = sql();
  const rows = await db`
    SELECT l.code, l.creator_id, l.product_id, COALESCE(p.name, l.product_id) AS product_name,
      (SELECT count(*) FROM link_clicks k WHERE k.code = l.code)::int AS clicks,
      (SELECT count(*) FROM commissions cm JOIN orders o ON o.id = cm.order_id
        WHERE cm.code = l.code AND o.status NOT IN ('storniert','retourniert'))::int AS sales,
      (SELECT COALESCE(sum(cm.amount_cents), 0) FROM commissions cm JOIN orders o ON o.id = cm.order_id
        WHERE cm.code = l.code AND o.status NOT IN ('storniert','retourniert'))::int AS earned
    FROM affiliate_links l LEFT JOIN products p ON p.id = l.product_id
    ${creatorId ? db`WHERE l.creator_id = ${creatorId}` : db``}
    ORDER BY l.created_at DESC`;
  return rows.map((r) => ({ code: r.code, creatorId: r.creator_id, productId: r.product_id, productName: r.product_name, clicks: r.clicks, sales: r.sales, earnedCents: r.earned }));
}

function summarize(c: Row, links: CreatorLink[], commissions: Commission[]): Creator {
  const sum = (st: string) => commissions.filter((x) => x.status === st).reduce((a, x) => a + x.amountCents, 0);
  return {
    id: c.id, email: c.email, name: c.name, token: c.token, active: c.active, payout: c.payout ?? "",
    createdAt: new Date(c.created_at).toISOString(),
    links: links.length,
    clicks: links.reduce((a, l) => a + l.clicks, 0),
    sales: commissions.filter((x) => x.status !== "storniert").length,
    pendingCents: sum("vorgemerkt"), releasedCents: sum("freigegeben"), paidCents: sum("ausgezahlt"),
  };
}

/** Everything the admin dashboard needs about creators. */
export async function getAffiliateOverview() {
  await ready();
  const { commissionHoldDays } = await getSettings();
  const [creatorRows, links, commRows] = await Promise.all([
    sql()`SELECT * FROM creators ORDER BY created_at DESC`,
    linkStats(null),
    commissionRows(commissionHoldDays, null),
  ]);
  const commissions = commRows.map(toCommission);
  const creators = creatorRows.map((c) =>
    summarize(c, links.filter((l) => l.creatorId === c.id), commissions.filter((x) => x.creatorId === c.id)),
  );
  return { creators, links, commissions };
}

/** The creator's own view, by secret token. */
export async function getPartner(token: string) {
  await ready();
  const [c] = await sql()`SELECT * FROM creators WHERE token = ${token}`;
  if (!c) return null;
  const { commissionHoldDays, refCookieDays } = await getSettings();
  const [links, commRows] = await Promise.all([linkStats(c.id), commissionRows(commissionHoldDays, c.id)]);
  const commissions = commRows.map(toCommission);
  return { creator: summarize(c, links, commissions), links, commissions, holdDays: commissionHoldDays, cookieDays: refCookieDays };
}

/** Marks every released commission of a creator as paid. Returns the paid amount. */
export async function markPaid(creatorId: string) {
  await ready();
  const { commissionHoldDays } = await getSettings();
  const rows = await sql()`
    UPDATE commissions cm SET paid_at = now()
    FROM orders o
    WHERE cm.order_id = o.id AND cm.creator_id = ${creatorId} AND cm.paid_at IS NULL
      AND o.status = 'versendet' AND o.shipped_at + make_interval(days => ${commissionHoldDays}) <= now()
    RETURNING cm.amount_cents`;
  return rows.reduce((a, r) => a + Number(r.amount_cents), 0);
}

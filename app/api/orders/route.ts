import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { toProduct } from "@/lib/data";
import { ready } from "@/lib/migrate";
import { sizesOf, stockOf, type OrderItem } from "@/lib/catalog";

const OrderInput = z.object({
  items: z
    .array(z.object({ id: z.string().min(1).max(80), size: z.string().min(1).max(30), qty: z.number().int().min(1).max(20) }))
    .min(1)
    .max(30),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160),
    street: z.string().trim().min(3).max(160),
    zip: z.string().trim().min(3).max(12),
    city: z.string().trim().min(2).max(80),
  }),
});

function orderId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
}

export async function POST(req: Request) {
  const parsed = OrderInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte prüfe deine Angaben." }, { status: 400 });
  const { items, customer } = parsed.data;

  await ready();
  const ids = [...new Set(items.map((i) => i.id))];
  const rows = await sql()`SELECT * FROM products WHERE id = ANY(${ids})`;
  const products = new Map(rows.map((r) => [r.id as string, toProduct(r)]));

  const orderItems: OrderItem[] = [];
  const perSize = new Map<string, { productId: string; size: string; qty: number }>();
  for (const i of items) {
    const p = products.get(i.id);
    if (!p) return NextResponse.json({ error: "Ein Artikel in deinem Warenkorb ist nicht mehr verfügbar." }, { status: 409 });
    if (!sizesOf(p).includes(i.size)) return NextResponse.json({ error: `Die Größe ${i.size} gibt es für ${p.name} nicht.` }, { status: 409 });
    orderItems.push({ productId: p.id, name: p.name, size: i.size, qty: i.qty, priceCents: p.priceCents });
    const key = `${p.id}\u0000${i.size}`;
    const prev = perSize.get(key);
    perSize.set(key, { productId: p.id, size: i.size, qty: (prev?.qty ?? 0) + i.qty });
  }
  for (const { productId, size, qty } of perSize.values()) {
    const p = products.get(productId)!;
    const left = stockOf(p, size);
    if (left < qty) {
      return NextResponse.json(
        { error: left > 0 ? `Von ${p.name} in ${size} sind nur noch ${left} Stück verfügbar.` : `${p.name} ist in ${size} ausverkauft.` },
        { status: 409 },
      );
    }
  }

  const id = orderId();
  const total = orderItems.reduce((sum, i) => sum + i.qty * i.priceCents, 0);
  const db = sql();
  const agg = db.json([...perSize.values()].map((x) => ({ product_id: x.productId, size: x.size, qty: x.qty })));

  // One atomic statement: reduce the stock of every ordered size and create the order.
  // If any size no longer has enough stock, the division by zero aborts the whole statement.
  try {
    await db`
      WITH agg AS (
        SELECT product_id, size, qty FROM jsonb_to_recordset(${agg}) AS r(product_id text, size text, qty int)
      ),
      per AS (
        SELECT product_id, jsonb_object_agg(size, qty) AS dec, SUM(qty)::int AS total FROM agg GROUP BY product_id
      ),
      upd AS (
        UPDATE products p SET
          size_stock = p.size_stock || (
            SELECT jsonb_object_agg(k, COALESCE((p.size_stock->>k)::int, 0) - v::int) FROM jsonb_each_text(per.dec) AS e(k, v)
          ),
          stock = GREATEST(p.stock - per.total, 0),
          updated_at = now()
        FROM per
        WHERE p.id = per.product_id
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_each_text(per.dec) AS d(k, v) WHERE COALESCE((p.size_stock->>d.k)::int, 0) < d.v::int
          )
        RETURNING p.id
      ),
      chk AS MATERIALIZED (
        SELECT 1 / (CASE WHEN (SELECT count(*) FROM upd) = (SELECT count(*) FROM per) THEN 1 ELSE 0 END) AS ok
      )
      INSERT INTO orders (id, status, items, total_cents, customer)
      SELECT ${id}, 'neu', ${db.json(orderItems as any)}, ${total}, ${db.json(customer)} FROM chk WHERE chk.ok = 1
    `;
  } catch (err: any) {
    if (err?.code === "22012") {
      return NextResponse.json({ error: "Ein Artikel wurde gerade ausverkauft. Bitte passe deinen Warenkorb an." }, { status: 409 });
    }
    console.error("order failed", err);
    return NextResponse.json({ error: "Die Bestellung konnte nicht gespeichert werden. Versuche es gleich noch einmal." }, { status: 500 });
  }

  return NextResponse.json({ id });
}

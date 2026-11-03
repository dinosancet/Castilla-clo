import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { toProduct } from "@/lib/data";
import { sizesOf, type OrderItem } from "@/lib/catalog";

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

  const ids = [...new Set(items.map((i) => i.id))];
  const rows = await sql()`SELECT * FROM products WHERE id = ANY(${ids})`;
  const products = new Map(rows.map((r) => [r.id as string, toProduct(r)]));

  const orderItems: OrderItem[] = [];
  const perProduct = new Map<string, number>();
  for (const i of items) {
    const p = products.get(i.id);
    if (!p) return NextResponse.json({ error: "Ein Artikel in deinem Warenkorb ist nicht mehr verfügbar." }, { status: 409 });
    if (!sizesOf(p).includes(i.size)) return NextResponse.json({ error: `Die Größe ${i.size} gibt es für ${p.name} nicht.` }, { status: 409 });
    orderItems.push({ productId: p.id, name: p.name, size: i.size, qty: i.qty, priceCents: p.priceCents });
    perProduct.set(p.id, (perProduct.get(p.id) ?? 0) + i.qty);
  }
  for (const [id, qty] of perProduct) {
    const p = products.get(id)!;
    if (p.stock < qty) {
      return NextResponse.json(
        { error: p.stock > 0 ? `Von ${p.name} sind nur noch ${p.stock} Stück verfügbar.` : `${p.name} ist ausverkauft.` },
        { status: 409 },
      );
    }
  }

  const id = orderId();
  const total = orderItems.reduce((sum, i) => sum + i.qty * i.priceCents, 0);
  const db = sql();
  const agg = db.json([...perProduct].map(([product_id, qty]) => ({ product_id, qty })));

  // One atomic statement: reduce stock for every product and create the order.
  // If any product no longer has enough stock, the division by zero aborts the whole statement.
  try {
    await db`
      WITH agg AS (
        SELECT product_id, qty FROM jsonb_to_recordset(${agg}) AS r(product_id text, qty int)
      ),
      upd AS (
        UPDATE products p SET stock = p.stock - agg.qty, updated_at = now()
        FROM agg WHERE p.id = agg.product_id AND p.stock >= agg.qty
        RETURNING p.id
      ),
      chk AS MATERIALIZED (
        SELECT 1 / (CASE WHEN (SELECT count(*) FROM upd) = (SELECT count(*) FROM agg) THEN 1 ELSE 0 END) AS ok
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

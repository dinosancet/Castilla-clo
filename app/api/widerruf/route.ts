import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { getSettings } from "@/lib/data";
import { sendWithdrawalReceipt } from "@/lib/mail";
import type { Withdrawal } from "@/lib/catalog";

// Electronic withdrawal function (§ 356a BGB). Works without login.
export async function POST(req: Request) {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().toLowerCase().email().max(160),
      orderRef: z.string().trim().min(3).max(40),
      items: z.string().trim().max(1000).default(""),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte gib Name, E-Mail-Adresse und Bestellnummer an." }, { status: 400 });
  const d = parsed.data;
  await ready();
  const db = sql();
  const ref = d.orderRef.toUpperCase().replace(/^NR\.?\s*/, "");
  const [order] = await db`SELECT id FROM orders WHERE upper(id) = ${ref} AND lower(customer->>'email') = ${d.email}`;
  const id = randomBytes(8).toString("hex");
  const [row] = await db`
    INSERT INTO withdrawals (id, name, email, order_ref, order_id, items)
    VALUES (${id}, ${d.name}, ${d.email}, ${ref}, ${order?.id ?? null}, ${d.items})
    RETURNING created_at`;
  const w: Withdrawal = {
    id, createdAt: new Date(row.created_at).toISOString(), name: d.name, email: d.email,
    orderRef: ref, orderId: order?.id ?? null, items: d.items, handled: false,
  };
  let mailed = false;
  try {
    mailed = await sendWithdrawalReceipt(w, await getSettings());
  } catch (err) {
    console.error("withdrawal mail failed", err);
  }
  return NextResponse.json({ ok: true, createdAt: w.createdAt, orderRef: ref, items: d.items, name: d.name, email: d.email, mailed });
}

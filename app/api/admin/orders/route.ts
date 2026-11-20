import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { badRequest, requireAdmin } from "@/lib/admin";
import { getOrder } from "@/lib/data";
import { sendShippingNotice } from "@/lib/mail";

// PATCH /api/admin/orders?id=...
export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Bestell-ID fehlt.");
  const parsed = z.object({ status: z.enum(["neu", "bezahlt", "versendet", "storniert", "retourniert"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Unbekannter Status.");
  const { status } = parsed.data;
  await ready();

  if (status === "storniert" || status === "retourniert") {
    // Close the order once and put every item back into the stock of its size, in one statement.
    // Any commission for this order is voided automatically (it is derived from the order status).
    await sql()`
      WITH o AS (
        UPDATE orders SET status = ${status} WHERE id = ${id} AND status NOT IN ('storniert','retourniert') RETURNING items
      ),
      it AS (
        SELECT e->>'productId' AS pid, e->>'size' AS sz, SUM((e->>'qty')::int) AS q
        FROM o, jsonb_array_elements(o.items) e GROUP BY 1, 2
      ),
      per AS (
        SELECT pid, jsonb_object_agg(sz, q) AS inc, SUM(q)::int AS total FROM it GROUP BY pid
      )
      UPDATE products p SET
        size_stock = p.size_stock || (
          SELECT jsonb_object_agg(k, COALESCE((p.size_stock->>k)::int, 0) + v::int) FROM jsonb_each_text(per.inc) AS e(k, v)
        ),
        stock = p.stock + per.total,
        updated_at = now()
      FROM per WHERE p.id = per.pid`;
    return NextResponse.json({ ok: true });
  }

  const rows = await sql()`
    WITH before AS (SELECT shipped_at FROM orders WHERE id = ${id})
    UPDATE orders SET status = ${status},
      shipped_at = CASE WHEN ${status} = 'versendet' THEN COALESCE(orders.shipped_at, now()) ELSE orders.shipped_at END
    WHERE id = ${id} AND status NOT IN ('storniert','retourniert')
    RETURNING (SELECT shipped_at FROM before) IS NULL AS first_shipping`;
  if (!rows.length) return NextResponse.json({ error: "Stornierte oder retournierte Bestellungen lassen sich nicht mehr ändern." }, { status: 409 });
  // Tell the customer once, the first time the order is marked as shipped.
  if (status === "versendet" && rows[0].first_shipping) {
    try {
      const order = await getOrder(id);
      if (order) await sendShippingNotice(order);
    } catch (err) {
      console.error("shipping mail failed", err);
    }
  }
  return NextResponse.json({ ok: true });
}

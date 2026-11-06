import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { badRequest, requireAdmin } from "@/lib/admin";

// PATCH /api/admin/orders?id=...
export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Bestell-ID fehlt.");
  const parsed = z.object({ status: z.enum(["neu", "bezahlt", "versendet", "storniert"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Unbekannter Status.");
  const { status } = parsed.data;
  await ready();

  if (status === "storniert") {
    // Cancel once and put every item back into the stock of its size, in one statement.
    await sql()`
      WITH o AS (
        UPDATE orders SET status = 'storniert' WHERE id = ${id} AND status <> 'storniert' RETURNING items
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

  const rows = await sql()`UPDATE orders SET status = ${status} WHERE id = ${id} AND status <> 'storniert' RETURNING id`;
  if (!rows.length) return NextResponse.json({ error: "Stornierte Bestellungen lassen sich nicht mehr ändern." }, { status: 409 });
  return NextResponse.json({ ok: true });
}

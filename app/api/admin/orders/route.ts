import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
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

  if (status === "storniert") {
    // Cancel once and put the items back into stock, in one statement.
    await sql()`
      WITH o AS (
        UPDATE orders SET status = 'storniert' WHERE id = ${id} AND status <> 'storniert' RETURNING items
      ),
      it AS (
        SELECT e->>'productId' AS pid, SUM((e->>'qty')::int) AS q
        FROM o, jsonb_array_elements(o.items) e GROUP BY 1
      )
      UPDATE products p SET stock = p.stock + it.q, updated_at = now() FROM it WHERE p.id = it.pid`;
    return NextResponse.json({ ok: true });
  }

  const rows = await sql()`UPDATE orders SET status = ${status} WHERE id = ${id} AND status <> 'storniert' RETURNING id`;
  if (!rows.length) return NextResponse.json({ error: "Stornierte Bestellungen lassen sich nicht mehr ändern." }, { status: 409 });
  return NextResponse.json({ ok: true });
}

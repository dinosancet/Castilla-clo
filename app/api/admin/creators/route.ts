import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { markPaid } from "@/lib/affiliate";
import { badRequest, requireAdmin } from "@/lib/admin";

// PATCH /api/admin/creators?id=...  { active: boolean }  or  { action: "markPaid" }
export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Creator-ID fehlt.");
  const body = await req.json().catch(() => null);
  await ready();
  if (body?.action === "markPaid") {
    const paidCents = await markPaid(id);
    return NextResponse.json({ ok: true, paidCents });
  }
  const parsed = z.object({ active: z.boolean() }).safeParse(body);
  if (!parsed.success) return badRequest("Ungültige Anfrage.");
  await sql()`UPDATE creators SET active = ${parsed.data.active} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

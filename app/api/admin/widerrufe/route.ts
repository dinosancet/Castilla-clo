import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { badRequest, requireAdmin } from "@/lib/admin";

// PATCH /api/admin/widerrufe?id=...  { handled: boolean }
export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  const parsed = z.object({ handled: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return badRequest("Ungültige Anfrage.");
  await ready();
  await sql()`UPDATE withdrawals SET handled_at = ${parsed.data.handled ? sql()`now()` : null} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

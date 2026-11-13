import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";

// Creators save their payout details (PayPal e-mail or IBAN) with their secret token.
export async function POST(req: Request) {
  const parsed = z.object({ token: z.string().min(20).max(100), payout: z.string().trim().max(300) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte prüfe deine Angaben." }, { status: 400 });
  await ready();
  const rows = await sql()`UPDATE creators SET payout = ${parsed.data.payout} WHERE token = ${parsed.data.token} RETURNING id`;
  if (!rows.length) return NextResponse.json({ error: "Partnerbereich nicht gefunden." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

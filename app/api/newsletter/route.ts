import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(160) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  await sql()`INSERT INTO newsletter (email) VALUES (${parsed.data.email}) ON CONFLICT (email) DO NOTHING`;
  return NextResponse.json({ ok: true });
}

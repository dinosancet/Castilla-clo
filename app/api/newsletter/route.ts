import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { mailConfigured, sendNewsletterConfirm } from "@/lib/mail";

// Double opt-in: the address is only active after the link in the confirmation e-mail was clicked.
export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(160) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  if (!mailConfigured()) return NextResponse.json({ error: "Die Newsletter-Anmeldung ist gerade nicht möglich. Bitte versuche es später erneut." }, { status: 503 });
  await ready();
  const email = parsed.data.email;
  const [row] = await sql()`
    INSERT INTO newsletter (email, token) VALUES (${email}, ${randomBytes(20).toString("hex")})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING token, confirmed_at`;
  if (!row.confirmed_at) await sendNewsletterConfirm(email, row.token);
  // Same answer either way, so the form does not reveal who is subscribed.
  return NextResponse.json({ ok: true });
}

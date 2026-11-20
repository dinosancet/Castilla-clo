import { NextResponse } from "next/server";
import { z } from "zod";
import { createLoginCode, normEmail } from "@/lib/customer";
import { mailConfigured, sendLoginCode } from "@/lib/mail";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().email().max(160) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  if (!mailConfigured()) return NextResponse.json({ error: "Die Anmeldung ist noch nicht freigeschaltet. Bitte versuche es später erneut." }, { status: 503 });
  const email = normEmail(parsed.data.email);
  const code = await createLoginCode(email);
  if (!code) return NextResponse.json({ error: "Zu viele Versuche. Bitte warte 15 Minuten und versuche es dann erneut." }, { status: 429 });
  const ok = await sendLoginCode(email, code);
  if (!ok) return NextResponse.json({ error: "Die E-Mail konnte nicht verschickt werden. Versuche es gleich noch einmal." }, { status: 502 });
  return NextResponse.json({ ok: true });
}

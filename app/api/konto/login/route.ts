import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, normEmail, sessionCookie, upsertCustomer, verifyLoginCode } from "@/lib/customer";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().email().max(160), code: z.string().trim().min(6).max(12) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte gib den 6-stelligen Code ein." }, { status: 400 });
  const email = normEmail(parsed.data.email);
  const result = await verifyLoginCode(email, parsed.data.code);
  if (result !== "ok") {
    const text = {
      wrong: "Der Code stimmt nicht.",
      expired: "Der Code ist abgelaufen. Fordere einen neuen an.",
      locked: "Zu viele falsche Eingaben. Fordere einen neuen Code an.",
    }[result];
    return NextResponse.json({ error: text }, { status: 401 });
  }
  await upsertCustomer(email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(await createSessionToken(email)));
  return res;
}

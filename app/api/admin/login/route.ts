import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/auth";

const hash = (s: string) => createHash("sha256").update(s).digest();

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: "ADMIN_PASSWORD ist in Vercel noch nicht gesetzt." }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  const given = typeof body.password === "string" ? body.password : "";
  if (!timingSafeEqual(hash(given), hash(expected))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Das Passwort stimmt nicht." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "./auth";

/** Second check inside every admin route, in addition to the middleware. */
export async function requireAdmin() {
  const jar = await cookies();
  const ok = await verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
  return ok ? null : NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

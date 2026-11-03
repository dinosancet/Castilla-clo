import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/admin/login" || path === "/api/admin/login") return NextResponse.next();
  let ok = false;
  try {
    ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  } catch {
    ok = false;
  }
  if (ok) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

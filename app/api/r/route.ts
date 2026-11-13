import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { getSettings } from "@/lib/data";
import { isBot, visitorHash } from "@/lib/affiliate";
import { REF_COOKIE } from "@/lib/site";

// /r/CODE is rewritten to /api/r?code=CODE (see next.config.mjs)
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Behind the rewrite, req.url can still be the original /r/CODE address, so read both.
  const raw = url.searchParams.get("code") || url.pathname.match(/\/r\/([^/]+)/)?.[1] || "";
  const code = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  if (!code) return NextResponse.redirect(new URL("/shop", req.url), 302);
  await ready();
  const [link] = await sql()`
    SELECT l.code, l.product_id, c.active FROM affiliate_links l JOIN creators c ON c.id = l.creator_id WHERE l.code = ${code}`;
  if (!link) return NextResponse.redirect(new URL("/shop", req.url), 302);

  const res = NextResponse.redirect(new URL(`/produkt/${link.product_id}`, req.url), 302);
  res.headers.set("Cache-Control", "no-store");
  const ua = req.headers.get("user-agent") ?? "";
  if (!link.active || isBot(ua)) return res;

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  // One click per visitor, link and day.
  await sql()`INSERT INTO link_clicks (code, visitor) VALUES (${code}, ${visitorHash(ip, ua)}) ON CONFLICT DO NOTHING`;
  const { refCookieDays } = await getSettings();
  res.cookies.set(REF_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: refCookieDays * 86400,
  });
  return res;
}

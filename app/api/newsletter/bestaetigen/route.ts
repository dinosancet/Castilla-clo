import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";

export async function GET(req: Request) {
  const t = (new URL(req.url).searchParams.get("t") || "").replace(/[^a-f0-9]/g, "").slice(0, 64);
  if (!t) return NextResponse.redirect(new URL("/newsletter?s=fehler", req.url), 302);
  await ready();
  const rows = await sql()`UPDATE newsletter SET confirmed_at = COALESCE(confirmed_at, now()) WHERE token = ${t} RETURNING email`;
  return NextResponse.redirect(new URL(`/newsletter?s=${rows.length ? "ok" : "fehler"}`, req.url), 302);
}

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";

export async function GET(req: Request) {
  const t = (new URL(req.url).searchParams.get("t") || "").replace(/[^a-f0-9]/g, "").slice(0, 64);
  if (t) {
    await ready();
    await sql()`DELETE FROM newsletter WHERE token = ${t}`;
  }
  return NextResponse.redirect(new URL("/newsletter?s=ab", req.url), 302);
}

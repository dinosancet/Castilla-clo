import { NextResponse } from "next/server";
import { badRequest, requireAdmin } from "@/lib/admin";

// GET /api/admin/bild?url=...  Loads one of the shop's own product photos for re-processing in the admin.
// Only photo storage hosts are allowed, so this cannot be used to fetch arbitrary URLs.
const ALLOWED = [/\.public\.blob\.vercel-storage\.com$/, /\.blob\.vercel-storage\.com$/, /\.supabase\.co$/];

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const raw = new URL(req.url).searchParams.get("url") || "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return badRequest("Ungültige Adresse.");
  }
  if (target.protocol !== "https:" || !ALLOWED.some((r) => r.test(target.hostname))) return badRequest("Diese Adresse ist nicht erlaubt.");
  const res = await fetch(target, { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "Foto nicht gefunden." }, { status: 404 });
  const type = res.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) return badRequest("Keine Bilddatei.");
  return new NextResponse(await res.arrayBuffer(), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
}

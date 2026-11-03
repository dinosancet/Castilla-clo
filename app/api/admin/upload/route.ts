import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { badRequest, requireAdmin } from "@/lib/admin";

const MAX = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const BUCKET = "produkte";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) {
    return NextResponse.json({ error: "Supabase Storage ist nicht eingerichtet (SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt)." }, { status: 500 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest("Keine Datei erhalten.");
  const ext = TYPES[file.type];
  if (!ext) return badRequest("Nur JPG, PNG oder WebP.");
  if (file.size > MAX) return badRequest("Das Foto ist größer als 4 MB.");

  const stem = file.name.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "foto";
  const path = `${Date.now()}-${randomBytes(4).toString("hex")}-${stem}.${ext}`;
  const headers: Record<string, string> = { apikey: key, "Content-Type": file.type, "cache-control": "31536000", "x-upsert": "false" };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`; // legacy JWT service_role key

  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, { method: "POST", headers, body: Buffer.from(await file.arrayBuffer()) });
  if (!res.ok) {
    console.error("supabase upload failed", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "Das Foto konnte nicht in Supabase gespeichert werden. Gibt es den Bucket „produkte“?" }, { status: 502 });
  }
  return NextResponse.json({ url: `${base}/storage/v1/object/public/${BUCKET}/${path}` });
}

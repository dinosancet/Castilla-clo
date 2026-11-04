import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { badRequest, requireAdmin } from "@/lib/admin";

const MAX = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const BUCKET = "produkte";

/** Stores product photos in Vercel Blob (if connected) or otherwise in Supabase Storage. */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const supaBase = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!blobToken && !(supaBase && supaKey)) {
    return NextResponse.json({ error: "Kein Foto-Speicher verbunden. Lege in Vercel unter „Storage“ einen Blob-Speicher an und deploye neu." }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest("Keine Datei erhalten.");
  const ext = TYPES[file.type];
  if (!ext) return badRequest("Nur JPG, PNG oder WebP.");
  if (file.size > MAX) return badRequest("Das Foto ist größer als 4 MB.");
  const stem = file.name.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "foto";
  const path = `${Date.now()}-${randomBytes(4).toString("hex")}-${stem}.${ext}`;

  if (blobToken) {
    try {
      const blob = await put(`${BUCKET}/${path}`, file, { access: "public", contentType: file.type, token: blobToken });
      return NextResponse.json({ url: blob.url });
    } catch (err) {
      console.error("blob upload failed", err);
      return NextResponse.json({ error: "Das Foto konnte nicht gespeichert werden." }, { status: 502 });
    }
  }

  const headers: Record<string, string> = { apikey: supaKey!, "Content-Type": file.type, "cache-control": "31536000", "x-upsert": "false" };
  if (supaKey!.startsWith("eyJ")) headers.Authorization = `Bearer ${supaKey}`;
  const res = await fetch(`${supaBase}/storage/v1/object/${BUCKET}/${path}`, { method: "POST", headers, body: Buffer.from(await file.arrayBuffer()) });
  if (!res.ok) {
    console.error("supabase upload failed", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "Das Foto konnte nicht in Supabase gespeichert werden. Gibt es den Bucket „produkte“?" }, { status: 502 });
  }
  return NextResponse.json({ url: `${supaBase}/storage/v1/object/public/${BUCKET}/${path}` });
}

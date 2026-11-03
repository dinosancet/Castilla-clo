import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { badRequest, requireAdmin } from "@/lib/admin";

const SettingsInput = z.object({
  banner: z.string().max(200),
  heroTitle: z.string().max(120),
  heroImageUrl: z.string().url().nullable(),
  dropName: z.string().max(120),
  dropText: z.string().max(400),
  dropAt: z.string().datetime().nullable(),
  shippingText: z.string().max(2000),
});

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = SettingsInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Bitte prüfe die Einstellungen.");
  const db = sql();
  await db`INSERT INTO settings (id, data) VALUES (1, ${db.json(parsed.data)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
  return NextResponse.json({ ok: true });
}

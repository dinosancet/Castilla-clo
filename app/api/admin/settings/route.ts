import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { badRequest, requireAdmin } from "@/lib/admin";

const SettingsInput = z.object({
  banner: z.string().max(200),
  heroTitle: z.string().max(120),
  heroImageUrl: z.string().url().nullable(),
  dropName: z.string().max(120),
  dropText: z.string().max(400),
  dropAt: z.string().datetime().nullable(),
  shippingText: z.string().max(2000),
  commissionHoldDays: z.number().int().min(0).max(365),
  refCookieDays: z.number().int().min(1).max(365),
  legalOwner: z.string().trim().max(120),
  legalBusiness: z.string().trim().max(120),
  legalStreet: z.string().trim().max(160),
  legalZipCity: z.string().trim().max(120),
  legalEmail: z.string().trim().max(160),
  legalPhone: z.string().trim().max(60),
  vatId: z.string().trim().max(30),
  smallBusiness: z.boolean(),
  shippingCents: z.number().int().min(0).max(100000),
  freeShippingFromCents: z.number().int().min(0).max(10000000),
  bankDetails: z.string().max(500),
  legalOverrides: z.partialRecord(z.enum(["impressum", "datenschutz", "agb", "widerruf", "versand", "partnerbedingungen"]), z.string().max(60000)),
});

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = SettingsInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Bitte prüfe die Einstellungen.");
  await ready();
  const db = sql();
  await db`INSERT INTO settings (id, data) VALUES (1, ${db.json(parsed.data)}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
  return NextResponse.json({ ok: true });
}

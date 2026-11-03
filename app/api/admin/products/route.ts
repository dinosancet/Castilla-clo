import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { badRequest, requireAdmin } from "@/lib/admin";
import { ProductInput } from "@/lib/product-input";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `${base || "produkt"}-${randomBytes(2).toString("hex")}`;
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = ProductInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Bitte prüfe die Produktangaben.");
  const p = parsed.data;
  const id = slugify(p.name);
  await sql()`
    INSERT INTO products (id, name, price_cents, category, sizes, stock, color, description, is_new, image_url, image_url2)
    VALUES (${id}, ${p.name}, ${p.priceCents}, ${p.category}, ${p.sizes}, ${p.stock}, ${p.color}, ${p.description}, ${p.isNew}, ${p.imageUrl}, ${p.imageUrl2})`;
  return NextResponse.json({ id });
}

// PUT /api/admin/products?id=...  and  DELETE /api/admin/products?id=...

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Produkt-ID fehlt.");
  const parsed = ProductInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Bitte prüfe die Produktangaben.");
  const p = parsed.data;
  const rows = await sql()`
    UPDATE products SET name = ${p.name}, price_cents = ${p.priceCents}, category = ${p.category}, sizes = ${p.sizes},
      stock = ${p.stock}, color = ${p.color}, description = ${p.description}, is_new = ${p.isNew},
      image_url = ${p.imageUrl}, image_url2 = ${p.imageUrl2}, updated_at = now()
    WHERE id = ${id} RETURNING id`;
  if (!rows.length) return NextResponse.json({ error: "Produkt nicht gefunden." }, { status: 404 });
  return NextResponse.json({ id });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Produkt-ID fehlt.");
  await sql()`DELETE FROM products WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

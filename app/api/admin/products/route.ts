import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { ready } from "@/lib/migrate";
import { badRequest, requireAdmin } from "@/lib/admin";
import { ProductInput, productColumns } from "@/lib/product-input";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `${base || "produkt"}-${randomBytes(2).toString("hex")}`;
}

async function parse(req: Request) {
  const parsed = ProductInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues.find((i) => i.message.startsWith("Jede Größe"))?.message;
    return { error: badRequest(msg ?? "Bitte prüfe die Produktangaben.") };
  }
  return { p: parsed.data, c: productColumns(parsed.data) };
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const r = await parse(req);
  if ("error" in r) return r.error;
  const { p, c } = r;
  await ready();
  const db = sql();
  const id = slugify(p.name);
  await db`
    INSERT INTO products (id, name, price_cents, category, sizes, size_stock, stock, color, description, is_new, images, image_url, image_url2)
    VALUES (${id}, ${p.name}, ${p.priceCents}, ${p.category}, ${c.sizes}, ${db.json(c.sizeStock)}, ${c.stock}, ${p.color},
            ${p.description}, ${p.isNew}, ${p.images}, ${c.imageUrl}, ${c.imageUrl2})`;
  return NextResponse.json({ id });
}

// PUT /api/admin/products?id=...
export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Produkt-ID fehlt.");
  const r = await parse(req);
  if ("error" in r) return r.error;
  const { p, c } = r;
  await ready();
  const db = sql();
  const rows = await db`
    UPDATE products SET name = ${p.name}, price_cents = ${p.priceCents}, category = ${p.category}, sizes = ${c.sizes},
      size_stock = ${db.json(c.sizeStock)}, stock = ${c.stock}, color = ${p.color}, description = ${p.description},
      is_new = ${p.isNew}, images = ${p.images}, image_url = ${c.imageUrl}, image_url2 = ${c.imageUrl2}, updated_at = now()
    WHERE id = ${id} RETURNING id`;
  if (!rows.length) return NextResponse.json({ error: "Produkt nicht gefunden." }, { status: 404 });
  return NextResponse.json({ id });
}

// DELETE /api/admin/products?id=...
export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Produkt-ID fehlt.");
  await ready();
  await sql()`DELETE FROM products WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

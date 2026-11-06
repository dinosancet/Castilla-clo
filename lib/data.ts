import "server-only";
import { sql, type Row } from "./db";
import { ready } from "./migrate";
import { DEFAULT_SETTINGS, type Order, type Product, type Settings } from "./catalog";

export function toProduct(r: Row): Product {
  const sizeStock: Record<string, number> = {};
  for (const [k, v] of Object.entries((r.size_stock ?? {}) as Record<string, unknown>)) sizeStock[k] = Math.max(0, Number(v) || 0);
  const images: string[] = (r.images ?? []).filter(Boolean);
  return {
    id: r.id,
    name: r.name,
    priceCents: Number(r.price_cents),
    category: r.category,
    sizes: r.sizes ?? [],
    sizeStock: sizeStock,
    stock: Object.values(sizeStock).reduce((a, b) => a + b, 0),
    color: r.color,
    description: r.description ?? "",
    isNew: !!r.is_new,
    images,
    imageUrl: images[0] ?? null,
    imageUrl2: images[1] ?? null,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export function toOrder(r: Row): Order {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    status: r.status,
    items: r.items,
    totalCents: Number(r.total_cents),
    customer: r.customer,
  };
}

export async function getProducts(): Promise<Product[]> {
  await ready();
  const rows = await sql()`SELECT * FROM products ORDER BY is_new DESC, name`;
  return rows.map(toProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  await ready();
  const rows = await sql()`SELECT * FROM products WHERE id = ${id}`;
  return rows[0] ? toProduct(rows[0]) : null;
}

export async function getSettings(): Promise<Settings> {
  await ready();
  const rows = await sql()`SELECT data FROM settings WHERE id = 1`;
  return { ...DEFAULT_SETTINGS, ...(rows[0]?.data ?? {}) };
}

export async function getOrders(): Promise<Order[]> {
  await ready();
  const rows = await sql()`SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`;
  return rows.map(toOrder);
}

export async function getOrder(id: string): Promise<Order | null> {
  await ready();
  const rows = await sql()`SELECT * FROM orders WHERE id = ${id}`;
  return rows[0] ? toOrder(rows[0]) : null;
}

export async function getSubscribers(): Promise<{ email: string; createdAt: string }[]> {
  await ready();
  const rows = await sql()`SELECT email, created_at FROM newsletter ORDER BY created_at DESC`;
  return rows.map((r) => ({ email: r.email, createdAt: new Date(r.created_at).toISOString() }));
}

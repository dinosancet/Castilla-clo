import "server-only";
import { sql } from "./db";

/**
 * Brings the database up to date. Runs once per server instance; every statement is idempotent,
 * so it is safe on a fresh database and on one that already has data.
 */
const MIGRATION = `
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY, name text NOT NULL, price_cents integer NOT NULL CHECK (price_cents >= 0),
  category text NOT NULL CHECK (category IN ('hoodie','tee','pants','acc')),
  sizes text[] NOT NULL DEFAULT '{}', stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  color text NOT NULL DEFAULT '#2a2622', description text NOT NULL DEFAULT '', is_new boolean NOT NULL DEFAULT false,
  image_url text, image_url2 text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'neu' CHECK (status IN ('neu','bezahlt','versendet','storniert')),
  items jsonb NOT NULL, total_cents integer NOT NULL, customer jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE TABLE IF NOT EXISTS newsletter (email text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), data jsonb NOT NULL DEFAULT '{}');
INSERT INTO settings (id, data) VALUES (1, '{}') ON CONFLICT (id) DO NOTHING;

-- v2: many photos per product, stock per size
ALTER TABLE products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_stock jsonb NOT NULL DEFAULT '{}';

UPDATE products SET images = array_remove(ARRAY[image_url, image_url2], NULL)
WHERE cardinality(images) = 0 AND (image_url IS NOT NULL OR image_url2 IS NOT NULL);

-- Old total stock is split evenly across the sizes (remainder goes to the first sizes).
UPDATE products p SET size_stock = s.obj
FROM (
  SELECT id, jsonb_object_agg(sz, (stock / n) + CASE WHEN ord <= stock % n THEN 1 ELSE 0 END) AS obj
  FROM (
    SELECT id, stock, sz, ord, count(*) OVER (PARTITION BY id) AS n
    FROM products,
      unnest(CASE WHEN cardinality(sizes) = 0 THEN ARRAY['One Size'] ELSE sizes END) WITH ORDINALITY AS u(sz, ord)
    WHERE size_stock = '{}'::jsonb
  ) x
  GROUP BY id
) s
WHERE p.id = s.id;
`;

let done: Promise<void> | null = null;

export function ready(): Promise<void> {
  if (!done) {
    done = sql()
      .begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(482137)`;
        await tx.unsafe(MIGRATION);
      })
      .then(() => undefined)
      .catch((err) => {
        done = null; // try again on the next request
        throw err;
      });
  }
  return done;
}

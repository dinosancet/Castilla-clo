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

-- v3: commission links (affiliate program)
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ref_code text;
DO $m$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check' AND pg_get_constraintdef(oid) LIKE '%retourniert%'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('neu','bezahlt','versendet','storniert','retourniert'));
  END IF;
END $m$;
CREATE TABLE IF NOT EXISTS creators (
  id text PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL, token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true, payout text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS affiliate_links (
  code text PRIMARY KEY, creator_id text NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  product_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (creator_id, product_id)
);
CREATE TABLE IF NOT EXISTS link_clicks (
  code text NOT NULL REFERENCES affiliate_links(code) ON DELETE CASCADE, visitor text NOT NULL,
  day date NOT NULL DEFAULT current_date, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (code, visitor, day)
);
CREATE TABLE IF NOT EXISTS commissions (
  id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  creator_id text NOT NULL REFERENCES creators(id) ON DELETE CASCADE, code text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0), created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz
);
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- v4: customer accounts (passwordless login by e-mail code)
CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL DEFAULT '',
  street text NOT NULL DEFAULT '', zip text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), last_login_at timestamptz
);
CREATE TABLE IF NOT EXISTS login_codes (
  id text PRIMARY KEY, email text NOT NULL, code_hash text NOT NULL,
  expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_codes_email_idx ON login_codes (email, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (lower(customer->>'email'));
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_codes ENABLE ROW LEVEL SECURITY;

-- v5: legal requirements
ALTER TABLE products ADD COLUMN IF NOT EXISTS material text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS care text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cents integer NOT NULL DEFAULT 0;
ALTER TABLE newsletter ADD COLUMN IF NOT EXISTS token text;
ALTER TABLE newsletter ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
UPDATE newsletter SET token = md5(random()::text || email || clock_timestamp()::text) WHERE token IS NULL;
CREATE TABLE IF NOT EXISTS withdrawals (
  id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), name text NOT NULL, email text NOT NULL,
  order_ref text NOT NULL, order_id text REFERENCES orders(id) ON DELETE SET NULL, items text NOT NULL DEFAULT '',
  handled_at timestamptz
);
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
-- Shipping now always costs money: remove an old "free shipping" banner.
UPDATE settings SET data = data || '{"banner":""}'::jsonb WHERE data->>'banner' ILIKE '%kostenlos%versand%';
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

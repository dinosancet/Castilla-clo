-- Für Supabase: im SQL Editor komplett einfügen und ausführen.

CREATE TABLE IF NOT EXISTS products (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  price_cents  integer NOT NULL CHECK (price_cents >= 0),
  category     text NOT NULL CHECK (category IN ('hoodie','tee','pants','acc')),
  sizes        text[] NOT NULL DEFAULT '{}',
  stock        integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  color        text NOT NULL DEFAULT '#2a2622',
  description  text NOT NULL DEFAULT '',
  is_new       boolean NOT NULL DEFAULT false,
  image_url    text,
  image_url2   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id           text PRIMARY KEY,
  created_at   timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'neu' CHECK (status IN ('neu','bezahlt','versendet','storniert')),
  items        jsonb NOT NULL,
  total_cents  integer NOT NULL,
  customer     jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS newsletter (
  email       text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id    integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data  jsonb NOT NULL DEFAULT '{}'
);

INSERT INTO settings (id, data) VALUES (1, '{"banner":"Kostenloser Versand ab 100 € innerhalb Deutschlands","heroTitle":"Herbst Winter 26","dropName":"Drop 01: Murallas","dropText":"Fünf Teile, je 150 Stück.","dropAt":"2026-11-20T18:00:00.000Z"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, price_cents, category, sizes, stock, color, description, is_new) VALUES
  ('murallas-hoodie','Murallas Hoodie',11900,'hoodie','{S,M,L,XL,XXL}',40,'#6B0F1A','Oversized Hoodie aus 480 g/m² Baumwolle. Doppellagige Kapuze, gestickter Schriftzug auf der Brust.',true),
  ('torre-hoodie','Torre Hoodie',10900,'hoodie','{S,M,L,XL}',25,'#1a1a1a','Boxy Fit in gewaschenem Schwarz mit großem Rückendruck.',false),
  ('castilla-tee','Castilla Tee',4900,'tee','{S,M,L,XL,XXL}',80,'#E6E6E2','Heavyweight-Shirt, 260 g/m². Weiter Schnitt, verstärkter Kragen.',true),
  ('almena-tee','Almena Tee',4500,'tee','{S,M,L,XL}',0,'#B8912F','Goldgelbes Shirt mit Zinnen-Print über der Schulter.',false),
  ('foso-sweatpants','Foso Sweatpants',8900,'pants','{S,M,L,XL}',35,'#2a2a2a','Weite Jogginghose mit offenem Saum und Stickerei am Bein.',false),
  ('corona-cap','Corona Cap',3900,'acc','{}',60,'#6B0F1A','Six-Panel-Cap aus gewaschenem Canvas, verstellbar.',false)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security an: Supabases öffentliche Data-API (anon key) kommt so nicht an die Daten.
-- Der Shop verbindet sich serverseitig direkt mit der Datenbank und ist davon nicht betroffen.
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;

-- Öffentlicher Bucket für Produktfotos (nur auf Supabase vorhanden).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('produkte', 'produkte', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

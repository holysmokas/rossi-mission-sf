-- ============================================
-- ROSSI MISSION SF — D1 Schema (Cloudflare)
-- ============================================
-- Mirrors the Supabase schema so the frontend shim can stay thin.
-- Arrays → JSON text. Booleans → INTEGER 0/1. Timestamps → unix epoch.
--
-- Run:
--   wrangler d1 create rossi
--   wrangler d1 execute rossi --remote --file=./schema.sql
-- ============================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,                  -- slug, e.g. "guez-limited-hoodie-pink"
  name          TEXT NOT NULL,
  description   TEXT,
  price         REAL NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('art','clothing','accessories','footwear','limited_editions')),
  subcategory   TEXT,
  image_url     TEXT,
  images        TEXT DEFAULT '[]',                 -- JSON array of URLs
  featured      INTEGER DEFAULT 0,
  active        INTEGER DEFAULT 1,
  quantity      INTEGER DEFAULT 0,
  stock_status  TEXT DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock','low_stock','sold_out')),
  tags          TEXT DEFAULT '[]',                 -- JSON array
  artist        TEXT,
  sizes         TEXT DEFAULT '[]',                 -- JSON array
  created_at    INTEGER DEFAULT (unixepoch()),
  updated_at    INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active      ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured    ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at  ON products(created_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,            -- generated via crypto.randomUUID() in app
  square_order_id     TEXT UNIQUE,
  square_payment_id   TEXT,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','refunded')),
  items               TEXT DEFAULT '[]',           -- JSON array
  item_count          INTEGER DEFAULT 0,
  total_cents         INTEGER DEFAULT 0,
  currency            TEXT DEFAULT 'USD',
  customer_name       TEXT,
  customer_email      TEXT,
  shipping_address    TEXT,                        -- JSON object
  square_receipt_url  TEXT,
  notified            INTEGER DEFAULT 0,           -- atomic-claim flag for webhook dedup
  paid_at             INTEGER,
  created_at          INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_square     ON orders(square_order_id);

CREATE TABLE IF NOT EXISTS inventory_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id        TEXT,
  product_name      TEXT,
  change_type       TEXT CHECK (change_type IN ('sale','restock','adjustment','initial')),
  quantity_before   INTEGER,
  quantity_after    INTEGER,
  change_amount     INTEGER,
  note              TEXT,
  order_id          TEXT,
  created_at        INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_inv_log_created ON inventory_log(created_at DESC);

CREATE TABLE IF NOT EXISTS gallery_images (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url     TEXT NOT NULL,
  storage_path  TEXT,
  file_name     TEXT,
  title         TEXT,
  artist        TEXT,
  sort_order    INTEGER DEFAULT 0,
  active        INTEGER DEFAULT 1,
  created_at    INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_gallery_active ON gallery_images(active, sort_order);

CREATE TABLE IF NOT EXISTS showcase_images (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url     TEXT NOT NULL,
  storage_path  TEXT,
  file_name     TEXT,
  sort_order    INTEGER DEFAULT 0,
  active        INTEGER DEFAULT 1,
  created_at    INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_showcase_active ON showcase_images(active, sort_order);

CREATE TABLE IF NOT EXISTS contact_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  message       TEXT NOT NULL,
  submitted_at  INTEGER DEFAULT (unixepoch()),
  created_at    INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS newsletter (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT UNIQUE NOT NULL,
  source      TEXT DEFAULT 'website',
  created_at  INTEGER DEFAULT (unixepoch())
);

-- updated_at trigger for products (mirrors the PG trigger)
CREATE TRIGGER IF NOT EXISTS products_updated_at
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
  UPDATE products SET updated_at = unixepoch() WHERE id = NEW.id;
END;

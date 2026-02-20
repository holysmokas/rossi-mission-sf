-- ============================================
-- ROSSI MISSION SF - Product Catalog Schema
-- ============================================
-- Run this in Supabase SQL Editor (SQL Editor > New Query)
-- ============================================

-- 1. Create product categories enum
CREATE TYPE product_category AS ENUM (
  'art',
  'clothing',
  'accessories',
  'footwear',
  'limited_editions'
);

-- 2. Create products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category product_category NOT NULL,
  subcategory TEXT, -- e.g. 'canvas', 'tees', 'caps', 'sneakers'
  image_url TEXT,
  images TEXT[] DEFAULT '{}', -- additional image URLs
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  stock_status TEXT DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'low_stock', 'sold_out')),
  tags TEXT[] DEFAULT '{}', -- for AI agent to use: ['streetwear', 'local-artist', 'spray-paint']
  artist TEXT, -- artist name for art pieces
  sizes TEXT[] DEFAULT '{}', -- available sizes for clothing/footwear
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 4. Create indexes for common queries
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- 5. Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 6. Public read access (anyone can view active products on the website)
CREATE POLICY "Public can view active products"
  ON products
  FOR SELECT
  USING (active = true);

-- 7. Authenticated users can manage products (admin panel)
CREATE POLICY "Authenticated users can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);

-- 8. Create storage bucket for product images
-- NOTE: Do this in Supabase Dashboard > Storage > New Bucket
-- Bucket name: product-images
-- Public bucket: YES (so images load on the website)

-- 9. Seed some sample products
INSERT INTO products (name, description, price, category, subcategory, featured, tags, artist, sizes) VALUES
  ('Mission Walls Canvas', 'Original spray paint on canvas capturing the vibrant murals of Valencia Street.', 280.00, 'art', 'canvas', true, ARRAY['spray-paint', 'local-artist', 'mission-district'], 'REVS', '{}'),
  ('Valencia Street Print', 'Limited edition giclée print. Signed and numbered, edition of 50.', 120.00, 'art', 'prints', true, ARRAY['print', 'limited', 'signed'], 'REVS', '{}'),
  ('Rossi Tag Tee - Black', 'Heavyweight cotton tee with Rossi Mission SF graffiti tag print.', 48.00, 'clothing', 'tees', true, ARRAY['streetwear', 'essentials', 'logo'], NULL, ARRAY['S', 'M', 'L', 'XL', 'XXL']),
  ('Mural Hoodie - Charcoal', 'Pullover hoodie featuring all-over Mission District mural collage.', 95.00, 'clothing', 'hoodies', true, ARRAY['streetwear', 'winter', 'statement'], NULL, ARRAY['S', 'M', 'L', 'XL']),
  ('Spray Can Snapback', 'Embroidered snapback cap with spray can logo. One size fits all.', 38.00, 'accessories', 'caps', false, ARRAY['headwear', 'essentials', 'logo'], NULL, ARRAY['One Size']),
  ('Artist Pin Set', 'Enamel pin collection featuring 4 iconic Mission District art motifs.', 24.00, 'accessories', 'pins', false, ARRAY['pins', 'collectible', 'gift'], NULL, '{}'),
  ('Custom Painted AF1', 'Hand-painted Nike Air Force 1 with custom Rossi Mission artwork. Each pair unique.', 220.00, 'footwear', 'sneakers', true, ARRAY['custom', 'one-of-one', 'hand-painted'], 'Various', ARRAY['8', '9', '10', '11', '12']),
  ('Drip Series Bomber', 'Satin bomber jacket with drip-style paint splatter. Limited run of 25.', 185.00, 'limited_editions', 'jackets', true, ARRAY['limited', 'outerwear', 'statement', 'numbered'], NULL, ARRAY['M', 'L', 'XL']),
  ('Concrete Canvas Tote', 'Heavy-duty canvas tote with original graffiti artwork print.', 32.00, 'accessories', 'bags', false, ARRAY['bags', 'essentials', 'art'], NULL, '{}'),
  ('Stencil Art Original - "Rise"', 'Multi-layer stencil work on reclaimed wood. One of a kind.', 450.00, 'art', 'originals', false, ARRAY['stencil', 'wood', 'one-of-one', 'local-artist'], 'KAT', '{}');

-- Done! Verify:
-- SELECT * FROM products ORDER BY created_at DESC;

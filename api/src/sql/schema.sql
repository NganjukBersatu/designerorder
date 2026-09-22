-- ============================================================
-- Designer Orders — Skema PostgreSQL (versi final, sesuai db.js)
-- ============================================================

-- ===== PESANAN CUSTOM/KOMISI (halaman Semua Pesanan) =====
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_date DATE NOT NULL,
  designer_name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  character_type VARCHAR(100) NOT NULL,
  style VARCHAR(100) NOT NULL,
  package VARCHAR(100),
  buyer_name VARCHAR(150) NOT NULL,
  buyer_reference VARCHAR(255),
  store_name VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Progress', 'Done')),
  completion_date DATE,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ===== PRODUK (halaman /produk, /kategori) =====
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  image TEXT,
  name VARCHAR(255) NOT NULL,
  style VARCHAR(100),
  substyle VARCHAR(100),
  designer VARCHAR(150),
  date TIMESTAMP,
  upload_date TIMESTAMP,
  production_status VARCHAR(100),
  platform VARCHAR(255),
  link_db TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Link DB (Dropbox dkk) — satu produk bisa punya beberapa link
CREATE TABLE IF NOT EXISTS product_links (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

-- Riwayat penjualan produk (halaman Detail Produk)
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer VARCHAR(150) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  platform VARCHAR(100),
  package VARCHAR(100),
  total NUMERIC(12, 2),
  sold_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
-- ============================================================
-- Designer Orders — Skema PostgreSQL (dokumentasi, sesuai db.js)
-- Dibuat dari SCHEMA_SQL di src/config/db.js; yang benar-benar dieksekusi
-- server adalah ensureSchema() di sana, bukan file ini.
-- Semua PK/FK memakai UUID (gen_random_uuid(), PostgreSQL 13+).
-- Pesanan buyer dan tugas internal digabung di tabel orders.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ===== Tim & anggota (multi-tenant: satu tim = satu workspace client) =====
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  display_name VARCHAR(150),
  photo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_team_created ON users (team_id, created_at);

-- ===== Order (pesanan buyer + tugas internal digabung jadi satu) =====
-- Satu record bisa berisi data transaksi (pembeli, harga, paket) maupun data
-- kerjaan (judul, tenggat, link DB, catatan, gambar) — kolomnya saling melengkapi.
-- Syarat minimal: punya judul ATAU nama pembeli/klien.
-- product_id sengaja belum di-FK di sini: orders & products saling merujuk,
-- jadi FK-nya ditambahkan setelah tabel products ada (lihat bawah).
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  product_id UUID,
  image TEXT,
  title VARCHAR(255),
  buyer_name VARCHAR(150),
  buyer_reference VARCHAR(255),
  store_name VARCHAR(150),
  designer_name VARCHAR(150),
  category VARCHAR(100),
  character_type VARCHAR(100),
  style VARCHAR(100),
  package VARCHAR(100),
  production_status VARCHAR(100),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Progress', 'Done')),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT orders_title_or_buyer CHECK (title IS NOT NULL OR buyer_name IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_orders_team_date ON orders (team_id, order_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_team_status ON orders (team_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_team_created ON orders (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders (product_id) WHERE product_id IS NOT NULL;

-- Pencarian order (substring di banyak kolom). ILIKE '%x%' biasa tidak bisa
-- pakai index -> seq scan. Solusi: satu kolom gabungan (lowercase, otomatis
-- terisi) + GIN trigram index, jadi LIKE '%x%' tetap cepat di data besar.
-- team_id ikut di index (btree_gin) supaya filter tim terjadi di dalam index,
-- bukan memindai kecocokan semua tim dulu baru disaring.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS search_text TEXT GENERATED ALWAYS AS (
  lower(
    coalesce(title, '') || ' ' || coalesce(buyer_name, '') || ' ' || coalesce(category, '') || ' ' ||
    coalesce(store_name, '') || ' ' || coalesce(style, '') || ' ' || coalesce(designer_name, '') || ' ' ||
    coalesce(note, '')
  )
) STORED;
CREATE INDEX IF NOT EXISTS idx_orders_team_search_trgm ON orders USING gin (team_id, search_text gin_trgm_ops);

-- Link DB (Dropbox dkk) — satu order bisa punya beberapa link
CREATE TABLE IF NOT EXISTS order_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_links_order ON order_links (order_id, position);

-- ===== Produk (halaman /produk, /kategori) =====
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_products_team_created ON products (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_order_id ON products (order_id) WHERE order_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_product_id_fkey' AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Link DB (Dropbox dkk) — satu produk bisa punya beberapa link
CREATE TABLE IF NOT EXISTS product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_links_product ON product_links (product_id, position);

-- Paket per produk (mis. Basic / Full) — dipakai lagi saat catat penjualan
CREATE TABLE IF NOT EXISTS product_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_packages_product ON product_packages (product_id, position);

-- Riwayat penjualan produk (halaman Detail Produk)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer VARCHAR(150) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  platform VARCHAR(100),
  package VARCHAR(100),
  total NUMERIC(12, 2),
  sold_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_product_sold ON sales (product_id, sold_at DESC);

-- ===== Pilihan dropdown per tim (halaman Pengaturan → Pilihan Produk/Tugas) =====
-- Satu baris per tim; seluruh grup pilihan disimpan sebagai satu JSON.
CREATE TABLE IF NOT EXISTS team_options (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

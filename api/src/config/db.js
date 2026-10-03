import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config() // load file .env

const { Pool } = pg

// Kolom DATE dikembalikan apa adanya ('2026-09-30'), bukan objek Date zona waktu server —
// kalau tidak, tanggal bisa bergeser sehari saat diserialisasi ke JSON di server non-UTC.
pg.types.setTypeParser(1082, (value) => value)

// Production (Railway/Render/dll) biasanya menyediakan satu DATABASE_URL.
// Kalau tidak ada, pakai variabel DB_* terpisah seperti di development.
// Set DB_SSL=true kalau database mewajibkan koneksi SSL.
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined

export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'designer_orders',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl,
      },
)

// Test koneksi PostgreSQL
export const testConnection = async () => {
  try {
    const client = await pool.connect()
    console.log('✅ PostgreSQL berhasil terhubung')
    client.release()
    return true
  } catch (error) {
    console.error('❌ PostgreSQL gagal terhubung:', error.message)
    return false
  }
}

// Skema database. Semua PK/FK pakai UUID (gen_random_uuid() bawaan PostgreSQL 13+),
// dan semua FK + kolom filter/urutan yang dipakai query-nya sudah di-index.
// Di-export supaya skrip migrasi (scripts/migrate-uuid.js) pakai definisi yang sama.
export const SCHEMA_SQL = `
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

  -- Designer = anggota tim (users.id), bukan teks bebas. Kolom teks lama (designer_name /
  -- designer) dipertahankan HANYA untuk data lama yang namanya belum punya akun; begitu
  -- cocok dengan USERNAME akun, otomatis ditautkan ke designer_id dan teksnya dikosongkan.
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS designer_id UUID REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS designer_id UUID REFERENCES users(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_orders_designer_id ON orders (designer_id) WHERE designer_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_products_designer_id ON products (designer_id) WHERE designer_id IS NOT NULL;
  -- indeks kecil: hanya baris lama yang masih berupa teks (untuk penautan otomatis)
  CREATE INDEX IF NOT EXISTS idx_orders_designer_legacy ON orders (team_id) WHERE designer_id IS NULL AND designer_name IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_products_designer_legacy ON products (team_id) WHERE designer_id IS NULL AND designer IS NOT NULL;

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

  -- ===== Bundling: beberapa produk SATU kategori yang dijual sebagai satu kesatuan =====
  -- Isiannya mirip produk (nama, kategori/style, harga, link, catatan, gambar). Produk yang
  -- masuk bundling ditandai products.bundle_id dan tidak tampil sebagai produk satuan.
  CREATE TABLE IF NOT EXISTS bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    image TEXT,
    name VARCHAR(255) NOT NULL,
    style VARCHAR(100) NOT NULL,
    substyle VARCHAR(100),
    platform VARCHAR(255),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_bundles_team_style ON bundles (team_id, style, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_bundles_created_by ON bundles (created_by) WHERE created_by IS NOT NULL;

  CREATE TABLE IF NOT EXISTS bundle_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_bundle_links_bundle ON bundle_links (bundle_id, position);

  ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES bundles(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_products_bundle_id ON products (bundle_id) WHERE bundle_id IS NOT NULL;
  -- daftar produk satuan: hanya yang belum ter-bundling
  CREATE INDEX IF NOT EXISTS idx_products_team_single ON products (team_id, created_at DESC) WHERE bundle_id IS NULL;

  CREATE TABLE IF NOT EXISTS bundle_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    buyer VARCHAR(150) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    platform VARCHAR(100),
    total NUMERIC(12, 2),
    sold_at TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_bundle_sales_bundle_sold ON bundle_sales (bundle_id, sold_at DESC);
  CREATE INDEX IF NOT EXISTS idx_bundle_sales_team_sold ON bundle_sales (team_id, sold_at DESC);

  -- ===== Mata uang =====
  -- Harga produk/bundling punya mata uangnya sendiri; penjualan mewarisinya saat dicatat.
  -- Baris lama otomatis USD (sama dengan perilaku sebelumnya). Kurs & mata uang tampilan
  -- Ringkasan disimpan per tim (kurs = satuan mata uang per 1 USD).
  ALTER TABLE products ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
  ALTER TABLE bundles ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
  ALTER TABLE sales ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
  ALTER TABLE bundle_sales ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS display_currency VARCHAR(3) NOT NULL DEFAULT 'USD';
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS rates JSONB NOT NULL DEFAULT '{}'::jsonb;
  -- Nama & tagline aplikasi per tim (NULL = bawaan)
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS app_name VARCHAR(100);
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS app_tagline VARCHAR(150);

  -- ===== Pilihan dropdown per tim (halaman Pengaturan → Pilihan Produk/Tugas) =====
  -- Satu baris per tim; seluruh grup pilihan disimpan sebagai satu JSON.
  CREATE TABLE IF NOT EXISTS team_options (
    team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
  );
`

// Membuat tabel & index kalau belum ada. Skema lama (ID integer) TIDAK
// diubah otomatis di sini — migrasi data itu destruktif, jadi dijalankan
// manual lewat `npm run migrate:uuid`. Server menolak nyala kalau skemanya
// masih lama, daripada jalan dengan query yang pasti error.
export const ensureSchema = async () => {
  const current = await pool.query(`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'id'
  `)
  if (current.rows[0] && current.rows[0].data_type !== 'uuid') {
    throw new Error(
      'Skema database masih memakai ID integer. Jalankan "npm run migrate:uuid" (folder api) dulu, lalu nyalakan server lagi.'
    )
  }
  await pool.query(SCHEMA_SQL)
}

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err.message)
})

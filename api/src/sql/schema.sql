-- ============================================================
-- Designer Orders — Skema PostgreSQL (versi final, sesuai db.js)
-- ============================================================

-- ===== TIM & ANGGOTA (multi-tenant: satu tim = satu workspace client) =====
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')), -- role cuma ngatur siapa yang boleh kelola anggota tim, bukan akses fitur lain
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ===== PESANAN CUSTOM/KOMISI (halaman Semua Pesanan) =====
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
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
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, -- opsional: pesanan diambil dari produk katalog yang sudah ada
  completion_date DATE,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ===== PRODUK (halaman /produk, /kategori) =====
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL, -- kosong = produk katalog biasa, terisi = hasil dari pesanan custom
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

-- Paket per produk (mis. Basic / Full), isinya menyesuaikan yang ditawarkan
-- ke client di tiap platform jualan
CREATE TABLE IF NOT EXISTS product_packages (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT,
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

-- Tugas: kerjaan/service internal anggota tim, di luar produk yang dijual.
-- Self-assign, siapa pun di tim bisa bikin tugas buat dirinya sendiri.
-- Field-nya sengaja disamakan dengan products, kecuali price (tugas tidak dijual).
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image TEXT,
  title VARCHAR(255) NOT NULL,
  client_name VARCHAR(150),
  designer VARCHAR(150),
  style VARCHAR(100),
  substyle VARCHAR(100),
  date TIMESTAMP,
  upload_date TIMESTAMP,
  production_status VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Progress', 'Done')),
  due_date DATE,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_links (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
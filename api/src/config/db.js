import pg from 'pg'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config() // load file .env

const { Pool } = pg

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'designer_orders',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, // ← diambil dari .env
})

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

// Membuat tabel-tabel otomatis kalau belum ada, jadi tidak perlu
// jalankan migrasi manual - cukup pastikan .env sudah diisi dengan benar.
export const ensureSchema = async () => {
  // ===== Tim & anggota (multi-tenant: satu tim = satu workspace client) =====
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `)

  // Migrasi otomatis: kalau tabel users sudah dibuat sebelum role 'admin' ada,
  // constraint lama cuma izinkan owner/member. Ganti supaya 'admin' valid juga.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
      ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
      END IF;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'member'));
    END $$;
  `)

  await pool.query(`
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
  `)

  // Setiap pesanan & produk milik satu tim, supaya data antar tim/client
  // tidak saling kelihatan. Nullable karena data lama (sebelum multi-tim)
  // belum tentu punya pemilik tim.
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;`)

  // Migrasi otomatis: kalau tabel "orders" dibuat sebelum perubahan ini
  // (masih punya kolom lama total_order INTEGER), ganti jadi package VARCHAR
  // tanpa menghapus data yang sudah ada. Aman dijalankan berkali-kali.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'total_order'
      ) THEN
        ALTER TABLE orders ALTER COLUMN total_order TYPE VARCHAR(100) USING total_order::text;
        ALTER TABLE orders ALTER COLUMN total_order DROP DEFAULT;
        ALTER TABLE orders RENAME COLUMN total_order TO package;
      END IF;
    END $$;
  `)

  // ===== Produk (halaman /produk, /kategori) =====
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
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
  `)

  // Migrasi otomatis: tambahkan kolom order_id kalau tabel products sudah
  // dibuat sebelum relasi ini ada. Aman dijalankan berkali-kali.
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL;
  `)

  // Pesanan bisa mengambil datanya dari produk yang sudah ada di katalog
  // (Kategori/Style ikut produk), jadi orders juga butuh product_id.
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;
  `)

  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;`)

  // Link DB (Dropbox dkk) — satu produk bisa punya beberapa link
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_links (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );
  `)

  // Paket per produk (mis. Basic / Full) — isinya beda-beda sesuai yang
  // ditawarkan ke client di tiap platform jualan. Dipakai lagi saat catat
  // penjualan, jadi tidak perlu ketik ulang nama & harga paketnya.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_packages (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      description TEXT,
      position INTEGER NOT NULL DEFAULT 0
    );
  `)

  // Riwayat penjualan produk (halaman Detail Produk)
  await pool.query(`
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
  `)

  // ===== Tugas (kerjaan/service internal anggota tim, di luar produk yang dijual) =====
  // Self-assign: siapa pun di tim bisa bikin tugas buat dirinya sendiri.
  // Sengaja diketikin (VARCHAR) bukan FK style/opsi, karena datanya independen
  // dari katalog produk — cukup nempel ke user yang bikin dan status kerjaannya.
  await pool.query(`
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
  `)

  // Migrasi otomatis: tugas gak butuh platform (bukan buat dijual), dan butuh
  // designer kalau tabelnya sudah kebuat sebelum kolom ini ada.
  await pool.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS platform;`)
  await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS designer VARCHAR(150);`)

  // Sama seperti product_links, tapi buat tugas — satu tugas bisa punya beberapa Link DB.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_links (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );
  `)
  // Seed akun admin default kalau tabel users masih kosong
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users')
  if (rows[0].count === 0) {
    const defaultHash = await bcrypt.hash('admin123', 10)
    await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      ['admin', defaultHash]
    )
    console.log('👤 Akun default dibuat: admin / admin123 (segera ganti password)')
  }
}

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err.message)
})
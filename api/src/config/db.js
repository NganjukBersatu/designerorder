import pg from 'pg'
import dotenv from 'dotenv'

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

  // Link DB (Dropbox dkk) — satu produk bisa punya beberapa link
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_links (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
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
}

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err.message)
})
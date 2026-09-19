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

// Membuat tabel "orders" otomatis kalau belum ada, jadi tidak perlu
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
      total_order INTEGER NOT NULL DEFAULT 1,
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
}

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err.message)
})

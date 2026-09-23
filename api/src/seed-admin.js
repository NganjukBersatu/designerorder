// api/src/seed-admin.js
// Jalankan sekali: node src/seed-admin.js
// Cek apakah tabel users kosong, kalau iya buat user admin default.

import bcrypt from 'bcryptjs'
import { pool } from './config/db.js'

const USERNAME = 'admin'
const PASSWORD = 'admin123' // GANTI setelah login pertama kali!

async function main() {
  const existing = await pool.query('SELECT id, username FROM users')
  console.log('User yang sudah ada:', existing.rows)

  if (existing.rows.length > 0) {
    console.log('Sudah ada user, tidak perlu seed. Selesai.')
    process.exit(0)
  }

  const hash = await bcrypt.hash(PASSWORD, 10)
  const result = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [USERNAME, hash]
  )
  console.log('User admin dibuat:', result.rows[0])
  console.log(`Login pakai username: ${USERNAME}  password: ${PASSWORD}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Gagal seed:', err)
  process.exit(1)
})
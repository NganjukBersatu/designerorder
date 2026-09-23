// api/src/reset-admin-password.js
// Jalankan: node src/reset-admin-password.js
// Reset password user di USERNAME ke NEW_PASSWORD di bawah ini.

import bcrypt from 'bcryptjs'
import { pool } from './config/db.js'

const USERNAME = 'admin1' // <-- ganti ke username akun yang mau di-reset
const NEW_PASSWORD = 'admin123' // <-- GANTI ini ke password yang kamu mau, lalu jalankan

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 10)
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username',
    [hash, USERNAME]
  )

  if (result.rows.length === 0) {
    console.log(`User '${USERNAME}' tidak ditemukan.`)
  } else {
    console.log('Password berhasil direset untuk:', result.rows[0])
    console.log(`Login pakai username: ${USERNAME}  password: ${NEW_PASSWORD}`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Gagal reset password:', err)
  process.exit(1)
})
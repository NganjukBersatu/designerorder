// Tautkan designer lama (teks bebas) ke akun anggota tim. Dijalankan otomatis oleh prestart.js
// di setiap start, dan aman diulang: yang sudah tertaut tidak disentuh, yang namanya belum
// punya akun dibiarkan sebagai teks dan otomatis tertaut begitu akunnya dibuat.
//
//   npm run link:designers

import { pool } from '../src/config/db.js'
import { linkLegacyDesigners } from '../src/utils/designers.js'

async function main() {
  const r = await linkLegacyDesigners(pool)
  console.log(`Designer ditautkan ke akun: ${r.orders} order, ${r.products} produk.`)

  // Nama yang masih berupa teks (belum punya akun) — daftar akun yang perlu dibuat
  const left = await pool.query(
    `SELECT t.name AS tim, x.nama, x.jumlah FROM (
       SELECT team_id, btrim(designer_name) AS nama, count(*)::int AS jumlah
       FROM orders WHERE designer_id IS NULL AND designer_name IS NOT NULL GROUP BY 1, 2
       UNION ALL
       SELECT team_id, btrim(designer) AS nama, count(*)::int AS jumlah
       FROM products WHERE designer_id IS NULL AND designer IS NOT NULL GROUP BY 1, 2
     ) x JOIN teams t ON t.id = x.team_id ORDER BY t.name, x.nama`
  )
  if (left.rows.length) {
    console.log('Belum punya akun (tetap tampil sebagai teks sampai akunnya dibuat):')
    for (const row of left.rows) console.log(`  - [${row.tim}] ${row.nama} (${row.jumlah} data)`)
  }
}

main()
  .catch((err) => {
    console.error('Gagal menautkan designer:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())

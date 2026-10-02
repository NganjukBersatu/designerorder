// Pindahkan gambar lama yang tersimpan sebagai base64 (data URL) di database
// ke bucket, lalu ganti isi kolomnya jadi URL.
//
//   npm run migrate:images -- --dry-run   # cuma hitung & laporkan, tidak mengubah apa pun
//   npm run migrate:images                # upload + update database
//
// Syarat: variabel S3_* sudah diisi, dan `npm run migrate:uuid` sudah dijalankan.
// Aman diulang: yang diproses hanya baris yang masih berisi data URL. Tiap baris
// diproses sendiri — upload dulu, baru UPDATE (dengan guard nilai lama), jadi
// kalau gagal di tengah jalan tidak ada gambar yang hilang.

import { pool } from '../src/config/db.js'
import { isStorageConfigured, uploadImage } from '../src/config/storage.js'

const dryRun = process.argv.includes('--dry-run')

// [tabel, kolom, kind di bucket]
const TARGETS = [
  ['users', 'photo', 'avatar'],
  ['products', 'image', 'product'],
  ['orders', 'image', 'order'],
]

const DATA_URL_RE = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=\s]+)$/i

async function main() {
  let pending = 0
  for (const [table, column] of TARGETS) {
    const n = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${column} LIKE 'data:%'`)
    pending += n.rows[0].n
  }
  if (pending === 0) {
    console.log('Tidak ada gambar lama (base64) yang perlu dipindah.')
    return
  }

  if (!dryRun && !isStorageConfigured()) {
    throw new Error('Konfigurasi bucket belum lengkap (ENDPOINT, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY, dan domain publik: RAILWAY_PUBLIC_DOMAIN atau S3_PUBLIC_URL).')
  }

  let failed = 0
  const report = []

  for (const [table, column, kind] of TARGETS) {
    const rows = await pool.query(
      `SELECT id, team_id, ${column} AS value FROM ${table} WHERE ${column} LIKE 'data:%'`
    )
    let done = 0
    let bytes = 0

    for (const row of rows.rows) {
      const match = DATA_URL_RE.exec(row.value)
      if (!match) {
        failed++
        console.error(`✗ ${table}.${column} id=${row.id}: format data URL tidak dikenali, dilewati`)
        continue
      }
      const buffer = Buffer.from(match[1], 'base64')
      bytes += buffer.length
      if (dryRun) { done++; continue }

      try {
        const url = await uploadImage({ teamId: row.team_id, kind, buffer })
        const upd = await pool.query(
          `UPDATE ${table} SET ${column} = $1 WHERE id = $2 AND ${column} = $3`,
          [url, row.id, row.value]
        )
        if (upd.rowCount !== 1) throw new Error('nilai kolom berubah saat diproses, ulangi skrip')
        done++
      } catch (err) {
        failed++
        console.error(`✗ ${table}.${column} id=${row.id}: ${err.message}`)
      }
    }
    report.push({ kolom: `${table}.${column}`, ditemukan: rows.rows.length, [dryRun ? 'akan dipindah' : 'dipindah']: done, 'ukuran (KB)': Math.round(bytes / 1024) })
  }

  console.table(report)
  console.log(dryRun ? 'DRY RUN — tidak ada yang diubah.' : failed ? `Selesai dengan ${failed} kegagalan (lihat di atas); jalankan ulang untuk mencoba lagi.` : 'Selesai, semua gambar sudah di bucket.')
  if (failed) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error('Gagal:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())

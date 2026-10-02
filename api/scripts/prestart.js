// Dijalankan otomatis sebelum server nyala (npm start -> Railway tiap deploy/restart).
//
//   1. migrate-uuid.js   : migrasi skema lama -> UUID. WAJIB sukses; kalau gagal server
//                          tidak dinyalakan (deploy gagal, versi lama tetap jalan).
//                          Kalau skema sudah UUID, tidak melakukan apa-apa.
//   2. migrate-images.js : pindahkan gambar base64 lama ke bucket. TIDAK memblokir:
//                          kalau bucket belum siap, server tetap nyala dan dicoba lagi
//                          di start berikutnya. Kalau tidak ada gambar lama, tidak melakukan apa-apa.
//
// Keduanya idempoten, jadi aman dijalankan di setiap start.

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const run = (file) => spawnSync(process.execPath, [path.join(dir, file)], { stdio: 'inherit' }).status

console.log('== Prestart 1/2: migrasi skema (UUID) ==')
if (run('migrate-uuid.js') !== 0) {
  console.error('Migrasi skema gagal — server TIDAK dinyalakan. Data tidak berubah (transaksi di-rollback).')
  process.exit(1)
}

console.log('== Prestart 2/2: pindahkan gambar lama ke bucket (tidak memblokir) ==')
if (run('migrate-images.js') !== 0) {
  console.warn('Pemindahan gambar belum tuntas (lihat log di atas). Server tetap dinyalakan; dicoba lagi di start berikutnya.')
}

// Migrasi sekali jalan: PK/FK integer (SERIAL) -> UUID, data lama ikut dibawa.
//
//   npm run migrate:uuid
//
// Cara kerja (semua dalam SATU transaksi — gagal di mana pun = rollback total):
//   1. Tabel lama dipindah ke schema `legacy_int_ids` (jadi backup, tidak dihapus).
//   2. Tabel baru (UUID + index) dibuat dari SCHEMA_SQL di config/db.js.
//   3. Data disalin dengan ID baru; relasi (FK) dipetakan ulang lewat tabel pemetaan.
//   4. Jumlah baris lama vs baru dicocokkan sebelum COMMIT.
//
// Setelah yakin aplikasi jalan normal, backup bisa dihapus manual:
//   DROP SCHEMA legacy_int_ids CASCADE;

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, SCHEMA_SQL } from '../src/config/db.js'

const LEGACY = 'legacy_int_ids'

// Urutan = induk dulu baru anak. Dipakai buat pindah schema & cek jumlah baris.
const TABLES = [
  'teams', 'users', 'orders', 'products',
  'product_links', 'product_packages', 'sales',
  'tasks', 'task_links', 'team_options',
]

// Simpan isi semua tabel lama ke satu file JSON sebelum ada yang diubah.
// Ini jaring pengaman tambahan di luar schema "legacy_int_ids" (yang ada di database
// yang sama). File-nya berisi data asli (termasuk hash kata sandi) -> folder
// api/backups/ sudah di-gitignore; simpan di tempat aman, jangan dibagikan.
async function writeBackup(client) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../backups')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `pre-uuid-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)

  const dump = {}
  for (const t of TABLES) {
    const exists = await client.query(`SELECT to_regclass('public.${t}') AS t`)
    if (!exists.rows[0].t) continue
    dump[t] = (await client.query(`SELECT * FROM public.${t}`)).rows
    console.log(`      ${t}: ${dump[t].length} baris`)
  }
  fs.writeFileSync(file, JSON.stringify(dump, null, 2))
  return file
}

async function main() {
  const client = await pool.connect()
  try {
    const state = await client.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'id'
    `)
    if (!state.rows[0]) {
      console.log('Belum ada tabel users — database kosong, tidak ada yang perlu dimigrasi.')
      console.log('Cukup nyalakan server, tabel UUID dibuat otomatis.')
      return
    }
    if (state.rows[0].data_type === 'uuid') {
      console.log('Skema sudah memakai UUID — tidak ada yang perlu dimigrasi.')
      return
    }

    const legacyExists = await client.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [LEGACY])
    if (legacyExists.rows.length) {
      throw new Error(`Schema "${LEGACY}" sudah ada. Cek isinya dulu / hapus manual kalau memang sisa lama, lalu ulangi.`)
    }

    // Di Railway disk container hilang tiap deploy, jadi file backup tidak berguna di sana;
    // pengamannya schema "legacy_int_ids" (di database) + backup database dari Railway.
    let backupFile = null
    if (process.env.RAILWAY_PROJECT_ID) {
      console.log('[1/4] File backup dilewati (di Railway disk sementara). Pengaman: schema "' + LEGACY + '" di database.')
    } else {
      console.log('[1/4] Membuat file backup (sebelum ada yang diubah)...')
      backupFile = await writeBackup(client)
      console.log(`      tersimpan: ${backupFile}`)
    }

    console.log('[2/4] Memindahkan tabel lama ke schema "' + LEGACY + '" dan membuat skema baru...')
    await client.query('BEGIN')

    // --- 1. Amankan tabel lama ---
    await client.query(`CREATE SCHEMA ${LEGACY}`)
    for (const t of TABLES) {
      // Tabel opsional (mis. team_options) mungkin belum ada di DB yang sangat lama
      await client.query(`ALTER TABLE IF EXISTS public.${t} SET SCHEMA ${LEGACY}`)
    }

    // --- 2. Buat skema baru ---
    await client.query(SCHEMA_SQL)

    // --- Baris tanpa tim (data sebelum multi-tim): tempelkan ke tim tunggal kalau ada ---
    const orphan = await client.query(`
      SELECT
        (SELECT count(*) FROM ${LEGACY}.users WHERE team_id IS NULL)::int +
        (SELECT count(*) FROM ${LEGACY}.orders WHERE team_id IS NULL)::int +
        (SELECT count(*) FROM ${LEGACY}.products WHERE team_id IS NULL)::int AS n,
        (SELECT count(*) FROM ${LEGACY}.teams)::int AS teams
    `)
    let fallbackTeamId = null
    if (orphan.rows[0].n > 0) {
      if (orphan.rows[0].teams !== 1) {
        throw new Error(
          `Ada ${orphan.rows[0].n} baris tanpa team_id, dan jumlah tim = ${orphan.rows[0].teams} ` +
          '(harus tepat 1 supaya bisa ditempelkan otomatis). Rapikan manual dulu.'
        )
      }
      console.log(`Ada ${orphan.rows[0].n} baris tanpa team_id → ditempelkan ke satu-satunya tim.`)
    }

    console.log('[3/4] Menyalin data ke tabel baru (UUID)...')
    // --- 3. Tabel pemetaan id lama -> uuid baru ---
    for (const t of TABLES.filter((x) => x !== 'team_options')) {
      await client.query(`
        CREATE TEMP TABLE m_${t} ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM ${LEGACY}.${t}
      `)
      await client.query(`CREATE INDEX ON m_${t} (old_id)`)
    }
    if (orphan.rows[0].n > 0) {
      fallbackTeamId = (await client.query('SELECT new_id FROM m_teams')).rows[0].new_id
    }
    const fb = fallbackTeamId // dipakai sebagai $1 di query yang butuh COALESCE team

    // --- 4. Salin data (induk dulu) ---
    await client.query(`
      INSERT INTO teams (id, name, created_at)
      SELECT m.new_id, t.name, t.created_at
      FROM ${LEGACY}.teams t JOIN m_teams m ON m.old_id = t.id
    `)

    await client.query(`
      INSERT INTO users (id, team_id, username, password_hash, role, display_name, photo, created_at)
      SELECT mu.new_id, COALESCE(mt.new_id, $1::uuid), u.username, u.password_hash, u.role,
             u.display_name, u.photo, u.created_at
      FROM ${LEGACY}.users u
      JOIN m_users mu ON mu.old_id = u.id
      LEFT JOIN m_teams mt ON mt.old_id = u.team_id
    `, [fb])

    // orders.product_id diisi belakangan (orders & products saling merujuk).
    // Order lama: kolom baru (judul, gambar, tenggat, dst) kosong, pembuat tidak diketahui.
    await client.query(`
      INSERT INTO orders (id, team_id, created_by, product_id, image, title, buyer_name, buyer_reference,
                          store_name, designer_name, category, character_type, style, package,
                          production_status, order_date, completion_date, due_date, status, price, note,
                          created_at, updated_at)
      SELECT mo.new_id, COALESCE(mt.new_id, $1::uuid), NULL, NULL, NULL, NULL, o.buyer_name,
             o.buyer_reference, o.store_name, o.designer_name, o.category, o.character_type, o.style,
             o.package, NULL, o.order_date, o.completion_date, NULL, o.status, o.price, NULL,
             o.created_at, o.updated_at
      FROM ${LEGACY}.orders o
      JOIN m_orders mo ON mo.old_id = o.id
      LEFT JOIN m_teams mt ON mt.old_id = o.team_id
    `, [fb])

    // Tugas lama ikut jadi order (digabung): klien -> pembeli/klien, designer -> designer,
    // Kategori -> category, Substyle -> character_type, tanggal dibuat -> order_date,
    // tanggal selesai/upload -> completion_date. Harga 0 (tugas tidak punya harga).
    await client.query(`
      INSERT INTO orders (id, team_id, created_by, product_id, image, title, buyer_name, designer_name,
                          category, character_type, production_status, order_date, completion_date,
                          due_date, status, price, note, created_at, updated_at)
      SELECT m.new_id, mt.new_id, mu.new_id, NULL, t.image, t.title, t.client_name, t.designer,
             t.style, t.substyle, t.production_status, COALESCE(t.date::date, t.created_at::date),
             t.upload_date::date, t.due_date, t.status, 0, t.note, t.created_at, t.updated_at
      FROM ${LEGACY}.tasks t
      JOIN m_tasks m ON m.old_id = t.id
      JOIN m_teams mt ON mt.old_id = t.team_id
      JOIN m_users mu ON mu.old_id = t.user_id
    `)

    await client.query(`
      INSERT INTO products (id, team_id, order_id, image, name, style, substyle, designer, date,
                            upload_date, production_status, platform, link_db, price, note,
                            created_at, updated_at)
      SELECT mp.new_id, COALESCE(mt.new_id, $1::uuid), mo.new_id, p.image, p.name, p.style, p.substyle,
             p.designer, p.date, p.upload_date, p.production_status, p.platform, p.link_db,
             p.price, p.note, p.created_at, p.updated_at
      FROM ${LEGACY}.products p
      JOIN m_products mp ON mp.old_id = p.id
      LEFT JOIN m_teams mt ON mt.old_id = p.team_id
      LEFT JOIN m_orders mo ON mo.old_id = p.order_id
    `, [fb])

    await client.query(`
      UPDATE orders o SET product_id = mp.new_id
      FROM ${LEGACY}.orders lo
      JOIN m_orders mo ON mo.old_id = lo.id
      JOIN m_products mp ON mp.old_id = lo.product_id
      WHERE o.id = mo.new_id
    `)

    await client.query(`
      INSERT INTO product_links (id, product_id, url, position)
      SELECT m.new_id, mp.new_id, l.url, l.position
      FROM ${LEGACY}.product_links l
      JOIN m_product_links m ON m.old_id = l.id
      JOIN m_products mp ON mp.old_id = l.product_id
    `)

    await client.query(`
      INSERT INTO product_packages (id, product_id, name, price, description, position)
      SELECT m.new_id, mp.new_id, k.name, k.price, k.description, k.position
      FROM ${LEGACY}.product_packages k
      JOIN m_product_packages m ON m.old_id = k.id
      JOIN m_products mp ON mp.old_id = k.product_id
    `)

    await client.query(`
      INSERT INTO sales (id, product_id, buyer, qty, platform, package, total, sold_at, created_at, updated_at)
      SELECT m.new_id, mp.new_id, s.buyer, s.qty, s.platform, s.package, s.total, s.sold_at,
             s.created_at, s.updated_at
      FROM ${LEGACY}.sales s
      JOIN m_sales m ON m.old_id = s.id
      JOIN m_products mp ON mp.old_id = s.product_id
    `)

    // Link DB tugas -> order_links milik order hasil gabungan
    await client.query(`
      INSERT INTO order_links (id, order_id, url, position)
      SELECT m.new_id, mo.new_id, l.url, l.position
      FROM ${LEGACY}.task_links l
      JOIN m_task_links m ON m.old_id = l.id
      JOIN m_tasks mo ON mo.old_id = l.task_id
    `)

    const hasOptions = await client.query(`SELECT to_regclass('${LEGACY}.team_options') AS t`)
    if (hasOptions.rows[0].t) {
      await client.query(`
        INSERT INTO team_options (team_id, data, updated_at)
        SELECT mt.new_id, o.data, o.updated_at
        FROM ${LEGACY}.team_options o JOIN m_teams mt ON mt.old_id = o.team_id
      `)
    }

    // Pilihan dropdown tugas (taskCategory dst) digabung ke pilihan yang sekarang dipakai
    // bersama, lalu kunci task* dibuang. Duplikat (beda huruf besar/kecil) dibuang.
    const OPTION_MERGE = {
      taskCategory: 'style',
      taskSubstyle: 'substyle',
      taskDesigner: 'designer',
      taskProductionStatus: 'productionStatus',
    }
    const optRows = await client.query('SELECT team_id, data FROM team_options')
    for (const row of optRows.rows) {
      const data = { ...row.data }
      for (const [from, to] of Object.entries(OPTION_MERGE)) {
        if (!Array.isArray(data[from])) { delete data[from]; continue }
        const seen = new Set((data[to] || []).map((v) => String(v).toLowerCase()))
        data[to] = [...(data[to] || []), ...data[from].filter((v) => !seen.has(String(v).toLowerCase()))]
        delete data[from]
      }
      await client.query('UPDATE team_options SET data = $1::jsonb WHERE team_id = $2', [JSON.stringify(data), row.team_id])
    }

    console.log('[4/4] Memverifikasi jumlah baris sebelum COMMIT...')
    // --- 5. Verifikasi jumlah baris sebelum COMMIT ---
    // orders baru = order lama + tugas lama (digabung); order_links baru = task_links lama.
    const countOf = async (schema, t) => {
      const exists = await client.query(`SELECT to_regclass('${schema}.${t}') AS t`)
      return exists.rows[0].t ? (await client.query(`SELECT count(*)::int AS n FROM ${schema}.${t}`)).rows[0].n : 0
    }
    const CHECKS = [
      ['teams', ['teams'], 'teams'],
      ['users', ['users'], 'users'],
      ['orders (order + tugas)', ['orders', 'tasks'], 'orders'],
      ['products', ['products'], 'products'],
      ['product_links', ['product_links'], 'product_links'],
      ['product_packages', ['product_packages'], 'product_packages'],
      ['sales', ['sales'], 'sales'],
      ['order_links (dari task_links)', ['task_links'], 'order_links'],
      ['team_options', ['team_options'], 'team_options'],
    ]
    const report = []
    for (const [label, oldTables, newTable] of CHECKS) {
      let oldCount = 0
      for (const t of oldTables) oldCount += await countOf(LEGACY, t)
      const newCount = await countOf('public', newTable)
      report.push({ tabel: label, lama: oldCount, baru: newCount })
      if (oldCount !== newCount) {
        throw new Error(`Jumlah baris "${label}" tidak cocok: lama=${oldCount}, baru=${newCount}. Rollback.`)
      }
    }

    await client.query('COMMIT')
    console.table(report)
    console.log('Migrasi UUID selesai. Tabel lama disimpan di schema "' + LEGACY + '" sebagai backup.')
    if (backupFile) console.log('File backup: ' + backupFile)
    console.log('Semua sesi login lama otomatis tidak valid — user perlu login ulang.')
    console.log('Setelah semuanya terverifikasi: DROP SCHEMA ' + LEGACY + ' CASCADE;')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Migrasi gagal, semua perubahan di-rollback:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()

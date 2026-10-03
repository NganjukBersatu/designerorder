import { pool } from '../config/db.js'
import { isUuid } from './uuid.js'

// Designer = anggota tim (users.id). Hanya anggota tim yang sama yang boleh dipilih.
export async function isTeamMember(userId, teamId) {
  if (!isUuid(userId)) return false
  const r = await pool.query('SELECT 1 FROM users WHERE id = $1 AND team_id = $2', [userId, teamId])
  return r.rows.length > 0
}

// Data lama menyimpan designer sebagai teks bebas (orders.designer_name, products.designer).
// Tautkan ke akun anggota tim yang USERNAME-nya sama (tanpa peduli huruf besar-kecil dan
// spasi di tepi), lalu kosongkan teks lamanya supaya tidak dobel. Sengaja hanya username,
// bukan nama tampilan: username unik dan dibuat admin, sedangkan nama tampilan bisa diubah
// siapa saja — kalau ikut dicocokkan, anggota biasa bisa merebut data lama dengan mengganti
// nama tampilannya. Nama yang belum punya akun dibiarkan sebagai teks.
// Idempoten: aman dipanggil berkali-kali (mis. tiap start, atau setelah akun baru dibuat).
export async function linkLegacyDesigners(db = pool, teamId = null) {
  const scope = (alias) => (teamId ? `AND ${alias}.team_id = $1` : '')
  const params = teamId ? [teamId] : []

  const link = async (table, alias, legacyCol) => {
    const r = await db.query(
      `WITH m AS (
         SELECT ${alias}.id AS rid, (array_agg(u.id))[1] AS uid, count(*) AS c
         FROM ${table} ${alias}
         JOIN users u
           ON u.team_id = ${alias}.team_id
          AND lower(u.username) = lower(btrim(${alias}.${legacyCol}))
         WHERE ${alias}.designer_id IS NULL AND ${alias}.${legacyCol} IS NOT NULL ${scope(alias)}
         GROUP BY ${alias}.id
       )
       UPDATE ${table} t SET designer_id = m.uid, ${legacyCol} = NULL
       FROM m WHERE t.id = m.rid AND m.c = 1`,
      params
    )
    return r.rowCount
  }

  return {
    orders: await link('orders', 'o', 'designer_name'),
    products: await link('products', 'p', 'designer'),
  }
}

// Dipanggil setelah akun dibuat / nama tampilan berubah. Gagal menautkan tidak boleh
// menggagalkan request utamanya.
export async function relinkDesignersQuietly(teamId) {
  try {
    await linkLegacyDesigners(pool, teamId)
  } catch (err) {
    console.error('Gagal menautkan designer lama:', err.message)
  }
}

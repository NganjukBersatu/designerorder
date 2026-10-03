import jwt from 'jsonwebtoken'
import { isUuid } from '../utils/uuid.js'
import { pool } from '../config/db.js'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET wajib diset di environment production, tidak boleh pakai default')
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-jangan-dipakai-di-production'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, teamId: user.team_id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
}

// Menempelkan req.user = { id, teamId, username, role } dari token Bearer.
// Semua route data (orders/products/dashboard/team) wajib lewat ini supaya
// query-nya bisa dibatasi ke team_id milik user yang sedang login.
// Token cuma dipakai untuk mengenali akunnya; peran & tim DIBACA ULANG dari
// database di tiap request, jadi perubahan peran / pindah tim langsung berlaku
// (tidak menunggu token 30 hari habis) dan akun yang sudah dihapus langsung ditolak.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ message: 'Belum masuk, silakan login dulu' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    // Token yang dibuat sebelum migrasi UUID berisi ID integer — tolak,
    // user cukup login ulang (kalau lolos, query ke kolom UUID jadi error 500).
    if (!isUuid(payload.id)) {
      return res.status(401).json({ message: 'Sesi tidak valid atau sudah habis, silakan masuk ulang' })
    }
    const found = await pool.query('SELECT id, team_id, username, role FROM users WHERE id = $1', [payload.id])
    if (!found.rows.length) {
      return res.status(401).json({ message: 'Akun tidak ditemukan, silakan masuk ulang' })
    }
    const u = found.rows[0]
    req.user = { id: u.id, teamId: u.team_id, username: u.username, role: u.role }
    next()
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError' || err?.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Sesi tidak valid atau sudah habis, silakan masuk ulang' })
    }
    next(err)
  }
}

// Owner dan admin setara: berkuasa penuh atas semua tim (route /api/admin).
export function requirePrivileged(req, res, next) {
  if (req.user?.role === 'owner' || req.user?.role === 'admin') return next()
  return res.status(403).json({ message: 'Hanya owner/admin yang bisa mengakses ini' })
}

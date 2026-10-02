import jwt from 'jsonwebtoken'
import { isUuid } from '../utils/uuid.js'

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
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ message: 'Belum masuk, silakan login dulu' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    // Token yang dibuat sebelum migrasi UUID berisi ID integer — tolak,
    // user cukup login ulang (kalau lolos, query ke kolom UUID jadi error 500).
    if (!isUuid(payload.id) || !isUuid(payload.teamId)) {
      return res.status(401).json({ message: 'Sesi tidak valid atau sudah habis, silakan masuk ulang' })
    }
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Sesi tidak valid atau sudah habis, silakan masuk ulang' })
  }
}

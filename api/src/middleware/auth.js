import jwt from 'jsonwebtoken'

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
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ message: 'Sesi tidak valid atau sudah habis, silakan masuk ulang' })
  }
}

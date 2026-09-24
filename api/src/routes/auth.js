import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { pool } from '../config/db.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

// Batasi percobaan login/register supaya tidak gampang dibrute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan, coba lagi beberapa menit lagi' },
})

function mapUser(u) {
  return { id: u.id, username: u.username, role: u.role, teamId: u.team_id }
}

function normalizeUsername(v) {
  return String(v || '').trim().toLowerCase()
}

// POST /api/auth/register — bikin tim baru + akun owner pertamanya
router.post('/register', authLimiter, async (req, res) => {
  const { teamName, username, password } = req.body
  const uname = normalizeUsername(username)

  if (!teamName?.trim() || !uname || !password) {
    return res.status(400).json({ message: 'Nama tim, username, dan kata sandi wajib diisi' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Kata sandi minimal 8 karakter' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT id FROM users WHERE username = $1', [uname])
    if (existing.rows.length) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Username sudah dipakai' })
    }

    const team = await client.query('INSERT INTO teams (name) VALUES ($1) RETURNING id', [teamName.trim()])
    const teamId = team.rows[0].id

    const hash = await bcrypt.hash(password, 10)
    const user = await client.query(
      `INSERT INTO users (team_id, username, password_hash, role) VALUES ($1, $2, $3, 'owner') RETURNING *`,
      [teamId, uname, hash]
    )

    await client.query('COMMIT')
    const token = signToken(user.rows[0])
    res.status(201).json({ token, user: mapUser(user.rows[0]), teamName: teamName.trim() })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal membuat tim', error: err.message })
  } finally {
    client.release()
  }
})

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const uname = normalizeUsername(req.body.username)
  const { password } = req.body
  if (!uname || !password) {
    return res.status(400).json({ message: 'Username dan kata sandi wajib diisi' })
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [uname])
    const user = result.rows[0]
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Username atau kata sandi salah' })
    }

    const team = await pool.query('SELECT name FROM teams WHERE id = $1', [user.team_id])
    const token = signToken(user)
    res.json({ token, user: mapUser(user), teamName: team.rows[0]?.name || '' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal masuk', error: err.message })
  }
})

// GET /api/auth/me — dipakai frontend buat validasi token yang tersimpan
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    const user = result.rows[0]
    if (!user) return res.status(404).json({ message: 'Akun tidak ditemukan' })

    const team = await pool.query('SELECT name FROM teams WHERE id = $1', [user.team_id])
    res.json({ user: mapUser(user), teamName: team.rows[0]?.name || '' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil profil', error: err.message })
  }
})

// PATCH /api/auth/me — ganti username dan/atau kata sandi milik sendiri
router.patch('/me', requireAuth, async (req, res) => {
  const { username, currentPassword, newPassword } = req.body
  if (!currentPassword) {
    return res.status(400).json({ message: 'Isi kata sandi saat ini untuk konfirmasi' })
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    const user = result.rows[0]
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ message: 'Kata sandi saat ini salah' })
    }

    if (username !== undefined && normalizeUsername(username) !== user.username) {
      const uname = normalizeUsername(username)
      if (uname.length < 3) return res.status(400).json({ message: 'Username minimal 3 karakter' })
      const clash = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [uname, user.id])
      if (clash.rows.length) return res.status(409).json({ message: 'Username sudah dipakai' })
      await pool.query('UPDATE users SET username = $1 WHERE id = $2', [uname, user.id])
      user.username = uname
    }

    if (newPassword) {
      if (newPassword.length < 8) return res.status(400).json({ message: 'Kata sandi baru minimal 8 karakter' })
      const hash = await bcrypt.hash(newPassword, 10)
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id])
    }

    const token = signToken(user)
    res.json({ token, user: mapUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal memperbarui akun', error: err.message })
  }
})

export default router

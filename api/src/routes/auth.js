import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' })
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    const user = result.rows[0]
    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah' })
    }

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ message: 'Username atau password salah' })
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal login', error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// PATCH /api/auth/password — ganti password akun yang sedang login
router.patch('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Password lama dan baru wajib diisi' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password baru minimal 8 karakter' })
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    const user = result.rows[0]
    const match = await bcrypt.compare(currentPassword, user.password_hash)
    if (!match) {
      return res.status(401).json({ message: 'Password lama salah' })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, user.id])
    res.json({ message: 'Password berhasil diubah' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah password', error: err.message })
  }
})

export default router

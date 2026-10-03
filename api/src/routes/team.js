import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { uuidParam } from '../utils/uuid.js'

const router = Router()
router.param('id', uuidParam)
router.use(requireAuth)

const memberFieldsCreate = {
  username: { required: true, type: 'string', min: 3, max: 50, label: 'Username' },
  password: { required: true, type: 'string', min: 8, max: 100, label: 'Kata sandi' },
}

function mapMember(u) {
  return { id: u.id, username: u.username, role: u.role, createdAt: u.created_at }
}

function normalizeUsername(v) {
  return String(v || '').trim().toLowerCase()
}

// GET /api/team/members
router.get('/members', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE team_id = $1 ORDER BY created_at ASC',
      [req.user.teamId]
    )
    res.json({ data: result.rows.map(mapMember) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil anggota tim', error: err.message })
  }
})

// Owner dan admin setara: boleh kelola siapa saja dan assign role apa saja.
// Biasa (member): gak boleh kelola anggota sama sekali.
function canManage(requesterRole) {
  return requesterRole === 'owner' || requesterRole === 'admin'
}

// POST /api/team/members
router.post('/members', validateBody(memberFieldsCreate), async (req, res) => {
  const uname = normalizeUsername(req.body.username)
  const { password } = req.body
  const requestedRole = req.body.role === 'owner' || req.body.role === 'admin' ? req.body.role : 'member'

  if (!canManage(req.user.role, requestedRole)) {
    return res.status(403).json({
      message: req.user.role === 'member'
        ? 'Anggota biasa tidak bisa menambah anggota'
        : 'Admin cuma bisa menambah anggota biasa, bukan admin/owner'
    })
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [uname])
    if (existing.rows.length) {
      return res.status(409).json({ message: 'Username sudah dipakai' })
    }

    const hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO users (team_id, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.teamId, uname, hash, requestedRole]
    )
    res.status(201).json({ data: mapMember(result.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menambah anggota', error: err.message })
  }
})

// GET /api/team/members/:id — detail satu anggota tim (hanya dari tim yang sama)
router.get('/members/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, (SELECT count(*)::int FROM orders o WHERE o.created_by = u.id) AS order_count
       FROM users u WHERE u.id = $1 AND u.team_id = $2`,
      [req.params.id, req.user.teamId]
    )
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Anggota tidak ditemukan' })
    }
    const u = result.rows[0]
    res.json({
      data: {
        ...mapMember(u),
        displayName: u.display_name || '',
        photo: u.photo || '',
        orderCount: u.order_count,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil anggota', error: err.message })
  }
})

// DELETE /api/team/members/:id — gak bisa hapus diri sendiri
router.delete('/members/:id', async (req, res) => {
  if (req.params.id.toLowerCase() === req.user.id) {
    return res.status(400).json({ message: 'Tidak bisa menghapus akun sendiri' })
  }

  try {
    const target = await pool.query('SELECT role FROM users WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    if (!target.rows.length) {
      return res.status(404).json({ message: 'Anggota tidak ditemukan' })
    }
    if (!canManage(req.user.role, target.rows[0].role)) {
      return res.status(403).json({
        message: req.user.role === 'member'
          ? 'Anggota biasa tidak bisa menghapus anggota'
          : 'Admin cuma bisa menghapus anggota biasa, bukan admin/owner'
      })
    }

    await pool.query('DELETE FROM users WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    res.json({ message: 'Anggota berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus anggota', error: err.message })
  }
})

export default router

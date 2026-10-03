import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { signToken } from '../middleware/auth.js'
import { uuidParam, isUuid } from '../utils/uuid.js'
import { buildSet } from '../utils/sql.js'
import { relinkDesignersQuietly } from '../utils/designers.js'

// Owner dan admin setara dan berkuasa penuh atas SEMUA tim (lihat requirePrivileged
// di middleware/auth.js): membuat/mengganti nama tim, membuat akun di tim mana pun,
// mengubah peran, mereset kata sandi, memindahkan akun antar tim, dan menghapus akun.
// Satu akun tetap satu tim; "pindah ke tim lain" = memindahkan akun itu sendiri.
const router = Router()
router.param('id', uuidParam)

const ROLES = ['owner', 'admin', 'member']
const isPrivilegedRole = (r) => r === 'owner' || r === 'admin'
const normalizeUsername = (v) => String(v || '').trim().toLowerCase()

function mapUser(u) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    teamId: u.team_id,
    teamName: u.team_name,
    displayName: u.display_name || '',
    createdAt: u.created_at,
  }
}

async function teamExists(teamId) {
  if (!isUuid(teamId)) return false
  const r = await pool.query('SELECT 1 FROM teams WHERE id = $1', [teamId])
  return r.rows.length > 0
}

// Cegah sistem kehilangan semua admin/owner (tidak ada lagi yang bisa mengelola)
async function otherPrivilegedCount(excludeUserId) {
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM users WHERE role IN ('owner', 'admin') AND id <> $1`,
    [excludeUserId]
  )
  return r.rows[0].n
}

function validateCredentials(username, password) {
  if (username.length < 3 || username.length > 50) return 'Username 3–50 karakter'
  if (String(password || '').length < 8) return 'Kata sandi minimal 8 karakter'
  return ''
}

// ===== TIM =====

// GET /api/admin/teams — semua tim + jumlah anggota
router.get('/teams', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.name, t.created_at, count(u.id)::int AS member_count
       FROM teams t LEFT JOIN users u ON u.team_id = t.id
       GROUP BY t.id ORDER BY t.created_at ASC`
    )
    res.json({
      data: result.rows.map((t) => ({
        id: t.id,
        name: t.name,
        memberCount: t.member_count,
        createdAt: t.created_at,
        current: t.id === req.user.teamId,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil daftar tim', error: err.message })
  }
})

// POST /api/admin/teams { name, owner?: { username, password } }
router.post('/teams', async (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name || name.length > 150) {
    return res.status(400).json({ message: 'Nama tim wajib diisi (maksimal 150 karakter)' })
  }

  const owner = req.body.owner
  let ownerUsername = ''
  if (owner && (owner.username || owner.password)) {
    ownerUsername = normalizeUsername(owner.username)
    const problem = validateCredentials(ownerUsername, owner.password)
    if (problem) return res.status(400).json({ message: problem })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (ownerUsername) {
      const clash = await client.query('SELECT 1 FROM users WHERE username = $1', [ownerUsername])
      if (clash.rows.length) {
        await client.query('ROLLBACK')
        return res.status(409).json({ message: 'Username sudah dipakai' })
      }
    }
    const team = await client.query('INSERT INTO teams (name) VALUES ($1) RETURNING id, name, created_at', [name])
    let memberCount = 0
    if (ownerUsername) {
      const hash = await bcrypt.hash(owner.password, 10)
      await client.query(
        `INSERT INTO users (team_id, username, password_hash, role) VALUES ($1, $2, $3, 'owner')`,
        [team.rows[0].id, ownerUsername, hash]
      )
      memberCount = 1
    }
    await client.query('COMMIT')
    const t = team.rows[0]
    res.status(201).json({ data: { id: t.id, name: t.name, memberCount, createdAt: t.created_at, current: false } })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal membuat tim', error: err.message })
  } finally {
    client.release()
  }
})

// PATCH /api/admin/teams/:id { name }
router.patch('/teams/:id', async (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name || name.length > 150) {
    return res.status(400).json({ message: 'Nama tim wajib diisi (maksimal 150 karakter)' })
  }
  try {
    const result = await pool.query('UPDATE teams SET name = $1 WHERE id = $2 RETURNING id, name', [name, req.params.id])
    if (!result.rows.length) return res.status(404).json({ message: 'Tim tidak ditemukan' })
    res.json({ data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengganti nama tim', error: err.message })
  }
})

// ===== AKUN =====

// GET /api/admin/users — semua akun di semua tim
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.role, u.team_id, u.display_name, u.created_at, t.name AS team_name
       FROM users u JOIN teams t ON t.id = u.team_id
       ORDER BY t.name ASC, u.created_at ASC`
    )
    res.json({ data: result.rows.map(mapUser) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil daftar akun', error: err.message })
  }
})

// POST /api/admin/users { teamId, username, password, role }
router.post('/users', async (req, res) => {
  const username = normalizeUsername(req.body.username)
  const role = ROLES.includes(req.body.role) ? req.body.role : 'member'
  const problem = validateCredentials(username, req.body.password)
  if (problem) return res.status(400).json({ message: problem })
  if (!(await teamExists(req.body.teamId))) {
    return res.status(404).json({ message: 'Tim tidak ditemukan' })
  }

  try {
    const clash = await pool.query('SELECT 1 FROM users WHERE username = $1', [username])
    if (clash.rows.length) return res.status(409).json({ message: 'Username sudah dipakai' })

    const hash = await bcrypt.hash(req.body.password, 10)
    const result = await pool.query(
      `INSERT INTO users (team_id, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.body.teamId, username, hash, role]
    )
    const full = await pool.query(
      `SELECT u.*, t.name AS team_name FROM users u JOIN teams t ON t.id = u.team_id WHERE u.id = $1`,
      [result.rows[0].id]
    )
    await relinkDesignersQuietly(req.body.teamId)
    res.status(201).json({ data: mapUser(full.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal membuat akun', error: err.message })
  }
})

// PATCH /api/admin/users/:id { role?, teamId?, password? }
// Kalau yang diubah akun si pemanggil sendiri (mis. pindah tim), balasan menyertakan
// token & data sesi baru supaya frontend langsung memakai tim yang baru.
router.patch('/users/:id', async (req, res) => {
  const { role, teamId, password } = req.body
  try {
    const found = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (!found.rows.length) return res.status(404).json({ message: 'Akun tidak ditemukan' })
    const target = found.rows[0]

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ message: `Peran harus salah satu dari: ${ROLES.join(', ')}` })
    }
    if (teamId !== undefined && !(await teamExists(teamId))) {
      return res.status(404).json({ message: 'Tim tujuan tidak ditemukan' })
    }
    if (password !== undefined && String(password).length < 8) {
      return res.status(400).json({ message: 'Kata sandi minimal 8 karakter' })
    }
    if (role === 'member' && isPrivilegedRole(target.role) && (await otherPrivilegedCount(target.id)) === 0) {
      return res.status(400).json({ message: 'Tidak bisa menurunkan admin/owner terakhir — harus ada minimal satu yang tersisa' })
    }

    const body = { role, team_id: teamId }
    if (password !== undefined) body.password_hash = await bcrypt.hash(String(password), 10)
    const { sets, values } = buildSet(body, {
      role: { col: 'role', required: true },
      team_id: { col: 'team_id', required: true },
      password_hash: { col: 'password_hash', required: true },
    })
    if (sets.length) {
      await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length + 1}`, [...values, target.id])
    }

    const full = await pool.query(
      `SELECT u.*, t.name AS team_name FROM users u JOIN teams t ON t.id = u.team_id WHERE u.id = $1`,
      [target.id]
    )
    const updated = full.rows[0]
    if (teamId !== undefined) await relinkDesignersQuietly(updated.team_id) // akun pindah tim -> cocokkan ulang
    const response = { data: mapUser(updated) }
    if (updated.id === req.user.id) {
      response.session = {
        token: signToken(updated),
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          teamId: updated.team_id,
          displayName: updated.display_name || '',
          photo: updated.photo || '',
        },
        teamName: updated.team_name,
      }
    }
    res.json(response)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah akun', error: err.message })
  }
})

// DELETE /api/admin/users/:id — akun di tim mana pun (kecuali diri sendiri / admin terakhir)
router.delete('/users/:id', async (req, res) => {
  if (req.params.id.toLowerCase() === req.user.id) {
    return res.status(400).json({ message: 'Tidak bisa menghapus akun sendiri' })
  }
  try {
    const found = await pool.query('SELECT role FROM users WHERE id = $1', [req.params.id])
    if (!found.rows.length) return res.status(404).json({ message: 'Akun tidak ditemukan' })
    if (isPrivilegedRole(found.rows[0].role) && (await otherPrivilegedCount(req.params.id)) === 0) {
      return res.status(400).json({ message: 'Tidak bisa menghapus admin/owner terakhir' })
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
    res.json({ message: 'Akun berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus akun', error: err.message })
  }
})

export default router

import { Router } from 'express'
import { pool } from '../config/db.js'

const router = Router()

// Grup pilihan dropdown yang boleh disimpan (samain dengan OPTION_GROUPS di frontend)
const ALLOWED_KEYS = [
  'style', 'substyle', 'designer', 'productionStatus', 'platform',
  'taskCategory', 'taskSubstyle', 'taskProductionStatus', 'taskDesigner',
]

function sanitizeList(value) {
  if (!Array.isArray(value)) return null
  const seen = new Set()
  const cleaned = []
  for (const v of value) {
    if (typeof v !== 'string') continue
    const trimmed = v.trim()
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue
    seen.add(trimmed.toLowerCase())
    cleaned.push(trimmed)
  }
  return cleaned
}

// GET /api/options — pilihan dropdown milik tim yang sedang login
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM team_options WHERE team_id = $1', [req.user.teamId])
    res.json({ data: result.rows[0]?.data || {} })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil pilihan dropdown', error: err.message })
  }
})

// PATCH /api/options — update sebagian grup pilihan, sisanya tetap
router.patch('/', async (req, res) => {
  const updates = {}
  for (const key of Object.keys(req.body || {})) {
    if (!ALLOWED_KEYS.includes(key)) continue
    const cleaned = sanitizeList(req.body[key])
    if (cleaned === null) {
      return res.status(400).json({ message: `${key} harus berupa daftar teks` })
    }
    updates[key] = cleaned
  }

  try {
    const result = await pool.query(
      `INSERT INTO team_options (team_id, data)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (team_id) DO UPDATE SET
         data = team_options.data || $2::jsonb,
         updated_at = now()
       RETURNING data`,
      [req.user.teamId, JSON.stringify(updates)]
    )
    res.json({ data: result.rows[0].data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menyimpan pilihan dropdown', error: err.message })
  }
})

export default router

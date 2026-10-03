import { Router } from 'express'
import { pool } from '../config/db.js'

// Nama aplikasi & tagline (tampil di sidebar dan judul tab) — pengaturan TIM, bukan per browser.
const router = Router()

const DEFAULTS = { appName: 'Designer Orders', appTagline: 'Ruang kerja produksi' }

const map = (row) => ({
  appName: row?.app_name || DEFAULTS.appName,
  appTagline: row?.app_tagline ?? DEFAULTS.appTagline,
})

// GET /api/app-settings
router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT app_name, app_tagline FROM teams WHERE id = $1', [req.user.teamId])
    res.json({ data: map(r.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil pengaturan aplikasi', error: err.message })
  }
})

// PUT /api/app-settings { appName, appTagline } — appName kosong = ditolak; keduanya null = kembali ke bawaan
router.put('/', async (req, res) => {
  const { appName, appTagline, reset } = req.body || {}
  if (reset) {
    try {
      await pool.query('UPDATE teams SET app_name = NULL, app_tagline = NULL WHERE id = $1', [req.user.teamId])
      return res.json({ data: map(null) })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: 'Gagal mengembalikan ke bawaan', error: err.message })
    }
  }
  const name = String(appName ?? '').trim()
  const tagline = String(appTagline ?? '').trim()
  if (!name) return res.status(400).json({ message: 'Nama aplikasi tidak boleh kosong' })
  if (name.length > 100 || tagline.length > 150) {
    return res.status(400).json({ message: 'Nama maksimal 100 karakter, tagline maksimal 150 karakter' })
  }
  try {
    const r = await pool.query(
      'UPDATE teams SET app_name = $2, app_tagline = $3 WHERE id = $1 RETURNING app_name, app_tagline',
      [req.user.teamId, name, tagline]
    )
    res.json({ data: map(r.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menyimpan pengaturan aplikasi', error: err.message })
  }
})

export default router

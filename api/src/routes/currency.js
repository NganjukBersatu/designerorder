import { Router } from 'express'
import { pool } from '../config/db.js'
import { CURRENCIES, isCurrency } from '../utils/currency.js'

// Pengaturan mata uang tim: mata uang tampilan Ringkasan + kurs (satuan per 1 USD).
const router = Router()

const payload = (row) => ({
  currencies: CURRENCIES,
  displayCurrency: row?.display_currency || 'USD',
  rates: { ...(row?.rates || {}), USD: 1 },
})

// GET /api/currency
router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT display_currency, rates FROM teams WHERE id = $1', [req.user.teamId])
    res.json({ data: payload(r.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil pengaturan mata uang', error: err.message })
  }
})

// PUT /api/currency { displayCurrency?, rates?: { IDR: 16000, ... } }
router.put('/', async (req, res) => {
  const { displayCurrency, rates } = req.body || {}
  if (displayCurrency !== undefined && !isCurrency(displayCurrency)) {
    return res.status(400).json({ message: 'Mata uang tampilan tidak dikenal' })
  }
  let cleaned = null
  if (rates !== undefined) {
    if (!rates || typeof rates !== 'object' || Array.isArray(rates)) {
      return res.status(400).json({ message: 'Kurs harus berupa objek {KODE: angka}' })
    }
    cleaned = {}
    for (const [code, value] of Object.entries(rates)) {
      if (code === 'USD') continue // USD selalu 1
      if (!isCurrency(code)) return res.status(400).json({ message: `Mata uang ${code} tidak dikenal` })
      const num = Number(value)
      if (!Number.isFinite(num) || num <= 0) return res.status(400).json({ message: `Kurs ${code} harus angka lebih dari 0` })
      cleaned[code] = num
    }
  }
  try {
    const r = await pool.query(
      `UPDATE teams SET
         display_currency = COALESCE($2, display_currency),
         rates = CASE WHEN $3::jsonb IS NULL THEN rates ELSE rates || $3::jsonb END
       WHERE id = $1 RETURNING display_currency, rates`,
      [req.user.teamId, displayCurrency ?? null, cleaned ? JSON.stringify(cleaned) : null]
    )
    res.json({ data: payload(r.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menyimpan pengaturan mata uang', error: err.message })
  }
})

export default router

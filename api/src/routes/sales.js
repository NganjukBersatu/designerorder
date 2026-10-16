import { Router } from 'express'
import { pool } from '../config/db.js'
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js'

const router = Router()

// GET /api/sales?month=YYYY-MM&search=&platform=&style=&page=&limit= — penjualan SEMUA produk dan bundling milik tim,
// terbaru dulu. Selalu berpaginasi (default 50 per halaman, maksimal 200), jadi respons tidak
// membengkak. Tiap baris punya `kind` ('product' | 'bundle') dan `product` = ringkasan
// barang yang dijual (produk atau bundling), supaya tampilan bisa memperlakukannya sama.
router.get('/', async (req, res) => {
  try {
    const params = [req.user.teamId]
    let monthSql = (col) => ''

    const { month } = req.query
    if (typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      // rentang tanggal (bukan date_trunc) supaya index (…, sold_at) terpakai
      params.push(`${month}-01`)
      const idx = params.length
      monthSql = (col) => ` AND ${col} >= $${idx}::date AND ${col} < $${idx}::date + interval '1 month'`
    }

    // Filter tambahan: ?search= (pembeli / nama produk / platform), ?platform=, ?style= (kategori)
    const likeEsc = (v) => String(v).replace(/[\\%_]/g, '\\$&')
    const extra = { product: '', bundle: '' }
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    if (search) {
      params.push(`%${likeEsc(search)}%`)
      const n = `$${params.length}`
      extra.product += ` AND (s.buyer ILIKE ${n} OR p.name ILIKE ${n} OR s.platform ILIKE ${n} OR s.package ILIKE ${n})`
      extra.bundle += ` AND (bs.buyer ILIKE ${n} OR b.name ILIKE ${n} OR bs.platform ILIKE ${n})`
    }
    const platform = typeof req.query.platform === 'string' ? req.query.platform.trim() : ''
    if (platform) {
      params.push(`%${likeEsc(platform)}%`)
      const n = `$${params.length}`
      extra.product += ` AND s.platform ILIKE ${n}`
      extra.bundle += ` AND bs.platform ILIKE ${n}`
    }
    const style = typeof req.query.style === 'string' ? req.query.style.trim() : ''
    if (style) {
      params.push(style)
      const n = `$${params.length}`
      extra.product += ` AND p.style = ${n}`
      extra.bundle += ` AND b.style = ${n}`
    }

    const productPart = `
      SELECT s.id, 'product'::text AS kind, s.product_id AS ref_id, s.buyer, s.qty, s.platform, s.package,
             s.total, s.currency, s.sold_at, p.name AS item_name, p.image AS item_image, p.price AS item_price, p.currency AS item_currency
      FROM sales s JOIN products p ON p.id = s.product_id
      WHERE p.team_id = $1${monthSql('s.sold_at')}${extra.product}`
    const bundlePart = `
      SELECT bs.id, 'bundle'::text AS kind, bs.bundle_id AS ref_id, bs.buyer, bs.qty, bs.platform, NULL::varchar AS package,
             bs.total, bs.currency, bs.sold_at, b.name AS item_name, b.image AS item_image, b.price AS item_price, b.currency AS item_currency
      FROM bundle_sales bs JOIN bundles b ON b.id = bs.bundle_id
      WHERE bs.team_id = $1${monthSql('bs.sold_at')}${extra.bundle}`

    const pagination = parsePagination({ page: req.query.page || 1, limit: req.query.limit || 50 })
    // Data halaman dan total baris tidak saling bergantung, jadi dijalankan bersamaan
    const [result, count] = await Promise.all([
      pool.query(
        `SELECT * FROM (${productPart} UNION ALL ${bundlePart}) x
         ORDER BY sold_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pagination.limit, pagination.offset]
      ),
      pool.query(`SELECT count(*)::int AS total FROM (${productPart} UNION ALL ${bundlePart}) x`, params),
    ])

    res.json({
      data: result.rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        productId: r.ref_id, // id produk atau id bundling (lihat `kind`)
        buyer: r.buyer,
        qty: r.qty,
        platform: r.platform,
        package: r.package,
        total: r.total !== null ? Number(r.total) : null,
        currency: r.currency,
        soldAt: r.sold_at,
        product: { id: r.ref_id, name: r.item_name, image: r.item_image, price: Number(r.item_price), currency: r.item_currency },
      })),
      pagination: buildPaginationMeta(pagination, count.rows[0].total),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data penjualan', error: err.message })
  }
})

// GET /api/sales/daily?month=YYYY-MM — agregat penjualan per hari, platform, dan mata uang untuk grafik.
// Nilai = total yang tercatat, atau harga x jumlah kalau total kosong (sama seperti daftar transaksi).
router.get('/daily', async (req, res) => {
  try {
    const { month } = req.query
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: 'Parameter month (YYYY-MM) wajib diisi' })
    }
    const result = await pool.query(
      `SELECT day, platform, currency, sum(qty)::int AS units, sum(value) AS value, count(*)::int AS transactions FROM (
         SELECT s.sold_at::date AS day, COALESCE(s.platform, '') AS platform,
                COALESCE(s.currency, p.currency) AS currency, s.qty,
                COALESCE(s.total, p.price * s.qty) AS value
         FROM sales s JOIN products p ON p.id = s.product_id
         WHERE p.team_id = $1 AND s.sold_at >= $2::date AND s.sold_at < $2::date + interval '1 month'
         UNION ALL
         SELECT bs.sold_at::date, COALESCE(bs.platform, ''), COALESCE(bs.currency, b.currency), bs.qty,
                COALESCE(bs.total, b.price * bs.qty)
         FROM bundle_sales bs JOIN bundles b ON b.id = bs.bundle_id
         WHERE bs.team_id = $1 AND bs.sold_at >= $2::date AND bs.sold_at < $2::date + interval '1 month'
       ) x
       GROUP BY day, platform, currency
       ORDER BY day`,
      [req.user.teamId, `${month}-01`]
    )
    res.json({
      data: result.rows.map((r) => ({
        day: r.day instanceof Date ? `${r.day.getFullYear()}-${String(r.day.getMonth() + 1).padStart(2, '0')}-${String(r.day.getDate()).padStart(2, '0')}` : String(r.day).slice(0, 10),
        platform: r.platform,
        currency: r.currency,
        units: r.units,
        value: Number(r.value),
        transactions: r.transactions,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil grafik penjualan', error: err.message })
  }
})

export default router

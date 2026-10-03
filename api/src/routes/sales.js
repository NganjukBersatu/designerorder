import { Router } from 'express'
import { pool } from '../config/db.js'
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js'

const router = Router()

// GET /api/sales?month=YYYY-MM&page=&limit= — penjualan SEMUA produk dan bundling milik tim,
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

    const productPart = `
      SELECT s.id, 'product'::text AS kind, s.product_id AS ref_id, s.buyer, s.qty, s.platform, s.package,
             s.total, s.currency, s.sold_at, p.name AS item_name, p.image AS item_image, p.price AS item_price, p.currency AS item_currency
      FROM sales s JOIN products p ON p.id = s.product_id
      WHERE p.team_id = $1${monthSql('s.sold_at')}`
    const bundlePart = `
      SELECT bs.id, 'bundle'::text AS kind, bs.bundle_id AS ref_id, bs.buyer, bs.qty, bs.platform, NULL::varchar AS package,
             bs.total, bs.currency, bs.sold_at, b.name AS item_name, b.image AS item_image, b.price AS item_price, b.currency AS item_currency
      FROM bundle_sales bs JOIN bundles b ON b.id = bs.bundle_id
      WHERE bs.team_id = $1${monthSql('bs.sold_at')}`

    const pagination = parsePagination({ page: req.query.page || 1, limit: req.query.limit || 50 })
    const result = await pool.query(
      `SELECT * FROM (${productPart} UNION ALL ${bundlePart}) x
       ORDER BY sold_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pagination.limit, pagination.offset]
    )
    const count = await pool.query(`SELECT count(*)::int AS total FROM (${productPart} UNION ALL ${bundlePart}) x`, params)

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

export default router

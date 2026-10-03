import { Router } from 'express'
import { pool } from '../config/db.js'
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js'

const router = Router()

// GET /api/sales?month=YYYY-MM&page=&limit= — penjualan seluruh produk milik tim, terbaru dulu.
// Selalu berpaginasi (default 50 per halaman, maksimal 200), jadi respons tidak membengkak
// seperti ketika semua penjualan ikut di daftar produk.
router.get('/', async (req, res) => {
  try {
    const params = [req.user.teamId]
    const where = ['p.team_id = $1']

    const { month } = req.query
    if (typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      // rentang tanggal (bukan date_trunc) supaya index (product_id, sold_at) terpakai
      params.push(`${month}-01`)
      where.push(`s.sold_at >= $${params.length}::date AND s.sold_at < $${params.length}::date + interval '1 month'`)
    }
    const whereSql = `WHERE ${where.join(' AND ')}`

    const pagination = parsePagination({ page: req.query.page || 1, limit: req.query.limit || 50 })
    const result = await pool.query(
      `SELECT s.*, p.name AS product_name, p.image AS product_image, p.price AS product_price
       FROM sales s
       JOIN products p ON p.id = s.product_id
       ${whereSql}
       ORDER BY s.sold_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pagination.limit, pagination.offset]
    )
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM sales s JOIN products p ON p.id = s.product_id ${whereSql}`,
      params
    )

    res.json({
      data: result.rows.map((r) => ({
        id: r.id,
        productId: r.product_id,
        buyer: r.buyer,
        qty: r.qty,
        platform: r.platform,
        package: r.package,
        total: r.total !== null ? Number(r.total) : null,
        soldAt: r.sold_at,
        product: { id: r.product_id, name: r.product_name, image: r.product_image, price: Number(r.product_price) },
      })),
      pagination: buildPaginationMeta(pagination, count.rows[0].total),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data penjualan', error: err.message })
  }
})

export default router

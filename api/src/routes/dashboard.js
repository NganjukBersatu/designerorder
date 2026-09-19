import { Router } from 'express'
import { pool } from '../config/db.js'

const router = Router()
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const statusResult = await pool.query('SELECT status FROM orders')
    const totalOrders = statusResult.rows.length
    const pendingOrders = statusResult.rows.filter((r) => r.status === 'Pending').length
    const progressOrders = statusResult.rows.filter((r) => r.status === 'Progress').length
    const doneOrders = statusResult.rows.filter((r) => r.status === 'Done').length

    const totalRevenueResult = await pool.query('SELECT COALESCE(SUM(price), 0) AS total FROM orders')
    const monthRevenueResult = await pool.query(`
      SELECT COALESCE(SUM(price), 0) AS total FROM orders
      WHERE date_trunc('month', order_date) = date_trunc('month', CURRENT_DATE)
    `)

    // Pendapatan 12 bulan terakhir
    const monthlyResult = await pool.query(`
      WITH bulan AS (
        SELECT date_trunc('month', CURRENT_DATE) - (n || ' month')::interval AS periode
        FROM generate_series(11, 0, -1) AS n
      )
      SELECT
        b.periode,
        COALESCE(SUM(o.price), 0) AS revenue,
        COUNT(o.id) AS orders
      FROM bulan b
      LEFT JOIN orders o ON date_trunc('month', o.order_date) = b.periode
      GROUP BY b.periode
      ORDER BY b.periode ASC
    `)
    const monthlyRevenue = monthlyResult.rows.map((r) => ({
      month: new Date(r.periode).toISOString().slice(0, 7),
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    }))

    // Performa per kategori: bulan ini vs bulan lalu
    const categoryNowResult = await pool.query(`
      SELECT category, COALESCE(SUM(price), 0) AS revenue, COUNT(*) AS orders
      FROM orders
      WHERE date_trunc('month', order_date) = date_trunc('month', CURRENT_DATE)
      GROUP BY category
    `)
    const categoryPrevResult = await pool.query(`
      SELECT category, COALESCE(SUM(price), 0) AS revenue
      FROM orders
      WHERE date_trunc('month', order_date) = date_trunc('month', CURRENT_DATE - interval '1 month')
      GROUP BY category
    `)
    const prevMap = Object.fromEntries(categoryPrevResult.rows.map((r) => [r.category, Number(r.revenue)]))
    const categoryPerformance = categoryNowResult.rows.map((r) => {
      const revenue = Number(r.revenue)
      const prev = prevMap[r.category] || 0
      const changePercent = prev > 0 ? Math.round(((revenue - prev) / prev) * 100) : revenue > 0 ? 100 : 0
      return { category: r.category, revenue, orders: Number(r.orders), changePercent }
    })

    const recentResult = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5')
    const recentOrders = recentResult.rows.map((r) => ({
      id: r.id,
      orderDate: r.order_date,
      buyerName: r.buyer_name,
      category: r.category,
      characterType: r.character_type,
      style: r.style,
      status: r.status,
      price: Number(r.price),
      storeName: r.store_name,
      buyerReference: r.buyer_reference,
    }))

    res.json({
      totalOrders,
      pendingOrders,
      progressOrders,
      doneOrders,
      totalRevenue: Number(totalRevenueResult.rows[0].total),
      monthRevenue: Number(monthRevenueResult.rows[0].total),
      monthlyRevenue,
      categoryPerformance,
      recentOrders,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil ringkasan dashboard', error: err.message })
  }
})

export default router

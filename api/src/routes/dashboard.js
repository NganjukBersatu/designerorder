import { Router } from 'express'
import { pool } from '../config/db.js'

const router = Router()

// Ambil ?month=YYYY-MM dari query, jatuh ke bulan berjalan kalau kosong/tidak valid.
// Hasilnya selalu tanggal 1 bulan tersebut (YYYY-MM-01).
function parseMonthStart(raw) {
  if (typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw)) {
    const monthNum = Number(raw.slice(5, 7))
    if (monthNum >= 1 && monthNum <= 12) return `${raw}-01`
  }
  return `${new Date().toISOString().slice(0, 7)}-01`
}

// Semua filter tanggal di bawah berbentuk rentang (order_date >= x AND order_date < y)
// supaya memakai index (team_id, order_date). Membungkus kolom dengan date_trunc()
// membuat index tidak terpakai dan seluruh order tim dipindai di setiap request.
//
// GET /api/dashboard/summary?month=YYYY-MM
router.get('/summary', async (req, res) => {
  const teamId = req.user.teamId
  const monthStart = parseMonthStart(req.query.month)

  try {
    const [statusRes, totalsRes, monthlyRes, categoryRes, recentRes] = await Promise.all([
      // Hitung per status di database (bukan menarik semua baris lalu dihitung di JS)
      pool.query(
        'SELECT status, count(*)::int AS n FROM orders WHERE team_id = $1 GROUP BY status',
        [teamId]
      ),

      // Total seluruh pendapatan + pendapatan bulan terpilih dalam satu kali baca
      pool.query(
        `SELECT
           COALESCE(SUM(price), 0) AS total,
           COALESCE(SUM(price) FILTER (
             WHERE order_date >= $2::date AND order_date < $2::date + interval '1 month'
           ), 0) AS month_total
         FROM orders WHERE team_id = $1`,
        [teamId, monthStart]
      ),

      // Pendapatan 12 bulan terakhir, berakhir di bulan terpilih: SATU pemindaian rentang
      // lalu dikelompokkan per bulan. (Versi join per-bulan terbukti lebih lambat di benchmark
      // 500 ribu order: planner memilih index yang salah.) Bulan kosong diisi di bawah.
      pool.query(
        `SELECT date_trunc('month', order_date)::date AS periode,
                COALESCE(SUM(price), 0) AS revenue,
                COUNT(*)::int AS orders
         FROM orders
         WHERE team_id = $1
           AND order_date >= $2::date - interval '11 month'
           AND order_date <  $2::date + interval '1 month'
         GROUP BY 1`,
        [teamId, monthStart]
      ),

      // Performa per kategori: bulan terpilih vs bulan sebelumnya, satu kali baca untuk keduanya
      pool.query(
        `SELECT
           COALESCE(NULLIF(category, ''), 'Tanpa kategori') AS category,
           COALESCE(SUM(price) FILTER (WHERE order_date >= $2::date), 0) AS revenue,
           (COUNT(*) FILTER (WHERE order_date >= $2::date))::int AS orders,
           COALESCE(SUM(price) FILTER (WHERE order_date < $2::date), 0) AS prev_revenue
         FROM orders
         WHERE team_id = $1
           AND order_date >= $2::date - interval '1 month'
           AND order_date <  $2::date + interval '1 month'
         GROUP BY 1`,
        [teamId, monthStart]
      ),

      // Hanya kolom yang dipakai tampilan (tanpa catatan panjang / kolom pencarian)
      pool.query(
        `SELECT id, order_date, title, buyer_name, category, character_type, style, status,
                price, store_name, buyer_reference
         FROM orders WHERE team_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [teamId]
      ),
    ])

    const countOf = (status) => statusRes.rows.find((r) => r.status === status)?.n || 0
    const pendingOrders = countOf('Pending')
    const progressOrders = countOf('Progress')
    const doneOrders = countOf('Done')

    // 12 bulan berurutan (lama -> baru); bulan tanpa order tetap tampil dengan nilai 0
    const byMonth = new Map(monthlyRes.rows.map((r) => [String(r.periode).slice(0, 7), r])) // DATE -> 'YYYY-MM-DD'
    const [year, month] = monthStart.split('-').map(Number)
    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const key = new Date(Date.UTC(year, month - 1 - i, 1)).toISOString().slice(0, 7)
      const row = byMonth.get(key)
      monthlyRevenue.push({ month: key, revenue: row ? Number(row.revenue) : 0, orders: row ? row.orders : 0 })
    }

    const categoryPerformance = categoryRes.rows
      .filter((r) => r.orders > 0) // hanya kategori yang punya order di bulan terpilih
      .map((r) => {
        const revenue = Number(r.revenue)
        const prev = Number(r.prev_revenue)
        const changePercent = prev > 0 ? Math.round(((revenue - prev) / prev) * 100) : revenue > 0 ? 100 : 0
        return { category: r.category, revenue, orders: r.orders, changePercent }
      })

    const recentOrders = recentRes.rows.map((r) => ({
      id: r.id,
      orderDate: r.order_date,
      title: r.title,
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
      totalOrders: pendingOrders + progressOrders + doneOrders,
      pendingOrders,
      progressOrders,
      doneOrders,
      totalRevenue: Number(totalsRes.rows[0].total),
      monthRevenue: Number(totalsRes.rows[0].month_total),
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

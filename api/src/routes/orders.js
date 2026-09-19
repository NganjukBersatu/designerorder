import { Router } from 'express'
import { pool } from '../config/db.js'

const router = Router()

function mapRow(r) {
  return {
    id: r.id,
    orderDate: r.order_date,
    designerName: r.designer_name,
    category: r.category,
    characterType: r.character_type,
    style: r.style,
    totalOrder: r.total_order,
    buyerName: r.buyer_name,
    buyerReference: r.buyer_reference,
    storeName: r.store_name,
    status: r.status,
    completionDate: r.completion_date,
    price: Number(r.price),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// GET /api/orders?search=...&status=Pending
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query
    const where = []
    const params = []

    if (search) {
      params.push(`%${search}%`)
      where.push(
        `(buyer_name ILIKE $${params.length} OR category ILIKE $${params.length} OR store_name ILIKE $${params.length})`
      )
    }
    if (status) {
      params.push(status)
      where.push(`status = $${params.length}`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const result = await pool.query(
      `SELECT * FROM orders ${whereSql} ORDER BY order_date DESC, created_at DESC`,
      params
    )
    res.json({ data: result.rows.map(mapRow) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data pesanan', error: err.message })
  }
})

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' })
    }
    res.json({ data: mapRow(result.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil pesanan', error: err.message })
  }
})

// POST /api/orders
router.post('/', async (req, res) => {
  const {
    orderDate,
    designerName,
    category,
    characterType,
    style,
    totalOrder,
    buyerName,
    buyerReference,
    storeName,
    status,
    completionDate,
    price,
  } = req.body

  if (!orderDate || !designerName || !category || !characterType || !style || !buyerName) {
    return res.status(400).json({ message: 'Field wajib belum lengkap' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders
        (order_date, designer_name, category, character_type, style, total_order,
         buyer_name, buyer_reference, store_name, status, completion_date, price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        orderDate,
        designerName,
        category,
        characterType,
        style,
        totalOrder || 1,
        buyerName,
        buyerReference || null,
        storeName || null,
        status || 'Pending',
        completionDate || null,
        price || 0,
      ]
    )
    res.status(201).json({ data: mapRow(result.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menambah pesanan', error: err.message })
  }
})

// PATCH /api/orders/:id (partial update, seperti COALESCE)
router.patch('/:id', async (req, res) => {
  const {
    orderDate,
    designerName,
    category,
    characterType,
    style,
    totalOrder,
    buyerName,
    buyerReference,
    storeName,
    status,
    completionDate,
    price,
  } = req.body

  try {
    const result = await pool.query(
      `UPDATE orders SET
        order_date = COALESCE($1, order_date),
        designer_name = COALESCE($2, designer_name),
        category = COALESCE($3, category),
        character_type = COALESCE($4, character_type),
        style = COALESCE($5, style),
        total_order = COALESCE($6, total_order),
        buyer_name = COALESCE($7, buyer_name),
        buyer_reference = $8,
        store_name = $9,
        status = COALESCE($10, status),
        completion_date = $11,
        price = COALESCE($12, price),
        updated_at = now()
       WHERE id = $13
       RETURNING *`,
      [
        orderDate || null,
        designerName || null,
        category || null,
        characterType || null,
        style || null,
        totalOrder || null,
        buyerName || null,
        buyerReference !== undefined ? buyerReference : null,
        storeName !== undefined ? storeName : null,
        status || null,
        completionDate !== undefined ? completionDate : null,
        price !== undefined ? price : null,
        req.params.id,
      ]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' })
    }
    res.json({ data: mapRow(result.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah pesanan', error: err.message })
  }
})

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' })
    }
    res.json({ message: 'Pesanan berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus pesanan', error: err.message })
  }
})

export default router

import { Router } from 'express'
import { pool } from '../config/db.js'

const router = Router()

// Mapping status dari frontend ke database
const STATUS_MAP = {
  menunggu: 'Pending',
  pending: 'Pending',
  'sedang dikerjakan': 'Progress',
  progress: 'Progress',
  'in progress': 'Progress',
  selesai: 'Done',
  done: 'Done',
}

function normalizeStatus(status) {
  if (!status) return 'Pending'
  const key = String(status).toLowerCase().trim()
  return STATUS_MAP[key] || 'Pending'
}

async function ownsProduct(productId, teamId) {
  const result = await pool.query('SELECT id FROM products WHERE id = $1 AND team_id = $2', [productId, teamId])
  return result.rows.length > 0
}

function mapRow(r) {
  return {
    id: r.id,
    orderDate: r.order_date,
    designerName: r.designer_name,
    category: r.category,
    characterType: r.character_type,
    style: r.style,
    package: r.package,
    productId: r.product_id,
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

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query
    const where = []
    const params = [req.user.teamId]
    where.push(`team_id = $1`)

    if (search) {
      params.push(`%${search}%`)
      where.push(
        `(buyer_name ILIKE $${params.length} 
         OR category ILIKE $${params.length} 
         OR store_name ILIKE $${params.length} 
         OR style ILIKE $${params.length}
         OR designer_name ILIKE $${params.length})`
      )
    }
    if (status) {
      params.push(normalizeStatus(status))
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
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND team_id = $2',
      [req.params.id, req.user.teamId]
    )
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
    package: pkg,
    productId,
    buyerName,
    buyerReference,
    storeName,
    status,
    completionDate,
    price,
  } = req.body

  if (!buyerName) {
    return res.status(400).json({ message: 'Nama pembeli wajib diisi' })
  }
  if (productId && !(await ownsProduct(productId, req.user.teamId))) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders
        (team_id, order_date, designer_name, category, character_type, style, package, product_id,
         buyer_name, buyer_reference, store_name, status, completion_date, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        req.user.teamId,
        orderDate || new Date().toISOString().slice(0, 10),
        designerName || 'Unknown',
        category || 'Custom',
        characterType || '-',
        style || '-',
        pkg || null,
        productId || null,
        buyerName,
        buyerReference || null,
        storeName || null,
        normalizeStatus(status),
        completionDate || null,
        price ?? 0,
      ]
    )
    res.status(201).json({ data: mapRow(result.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menambah pesanan', error: err.message })
  }
})

// PATCH /api/orders/:id
router.patch('/:id', async (req, res) => {
  const {
    orderDate,
    designerName,
    category,
    characterType,
    style,
    package: pkg,
    productId,
    buyerName,
    buyerReference,
    storeName,
    status,
    completionDate,
    price,
  } = req.body

  if (productId && !(await ownsProduct(productId, req.user.teamId))) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' })
  }

  try {
    const result = await pool.query(
      `UPDATE orders SET
        order_date       = COALESCE($1, order_date),
        designer_name    = COALESCE($2, designer_name),
        category         = COALESCE($3, category),
        character_type   = COALESCE($4, character_type),
        style            = COALESCE($5, style),
        package          = COALESCE($6, package),
        product_id       = COALESCE($7, product_id),
        buyer_name       = COALESCE($8, buyer_name),
        buyer_reference  = COALESCE($9, buyer_reference),
        store_name       = COALESCE($10, store_name),
        status           = COALESCE($11, status),
        completion_date  = COALESCE($12, completion_date),
        price            = COALESCE($13, price),
        updated_at       = now()
       WHERE id = $14 AND team_id = $15
       RETURNING *`,
      [
        orderDate || null,
        designerName || null,
        category || null,
        characterType || null,
        style || null,
        pkg !== undefined ? pkg : null,
        productId !== undefined ? productId : null,
        buyerName || null,
        buyerReference !== undefined ? buyerReference : null,
        storeName !== undefined ? storeName : null,
        status ? normalizeStatus(status) : null,
        completionDate !== undefined ? completionDate : null,
        price !== undefined ? price : null,
        req.params.id,
        req.user.teamId,
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
    const result = await pool.query(
      'DELETE FROM orders WHERE id = $1 AND team_id = $2 RETURNING id',
      [req.params.id, req.user.teamId]
    )
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
import { Router } from 'express'
import { pool } from '../config/db.js'
import { validateBody } from '../middleware/validate.js'
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js'

const router = Router()

const productFieldsCreate = {
  name: { required: true, type: 'string', min: 1, max: 255, label: 'Nama produk' },
  style: { type: 'string', max: 100, label: 'Style' },
  substyle: { type: 'string', max: 100, label: 'Substyle' },
  designer: { type: 'string', max: 150, label: 'Desainer' },
  date: { type: 'date', label: 'Tanggal' },
  uploadDate: { type: 'date', label: 'Tanggal upload' },
  productionStatus: { type: 'string', max: 100, label: 'Status produksi' },
  platform: { type: 'string', max: 255, label: 'Platform' },
  linkDb: { type: 'string', max: 2000, label: 'Link DB' },
  linkDbs: { type: 'array', itemType: 'string', label: 'Daftar link DB' },
  price: { type: 'number', min: 0, label: 'Harga' },
  note: { type: 'string', max: 5000, label: 'Catatan' },
}

const productFieldsUpdate = Object.fromEntries(
  Object.entries(productFieldsCreate).map(([key, rule]) => [key, { ...rule, required: false }])
)

const saleFieldsCreate = {
  buyer: { required: true, type: 'string', min: 1, max: 150, label: 'Nama pembeli' },
  qty: { type: 'number', integer: true, min: 1, label: 'Jumlah' },
  platform: { type: 'string', max: 100, label: 'Platform' },
  package: { type: 'string', max: 100, label: 'Paket' },
  total: { type: 'number', min: 0, label: 'Total' },
  soldAt: { type: 'date', label: 'Tanggal jual' },
}

const saleFieldsUpdate = Object.fromEntries(
  Object.entries(saleFieldsCreate).map(([key, rule]) => [key, { ...rule, required: false }])
)

// Query dasar yang menempelkan links & sales sebagai JSON array
// langsung dari SQL, supaya frontend tidak perlu request terpisah.
const SELECT_PRODUCT = `
  SELECT
    p.*,
    COALESCE(
      (SELECT json_agg(json_build_object('id', l.id, 'url', l.url, 'position', l.position) ORDER BY l.position)
       FROM product_links l WHERE l.product_id = p.id),
      '[]'
    ) AS links,
    COALESCE(
      (SELECT json_agg(json_build_object(
          'id', pk.id, 'name', pk.name, 'price', pk.price, 'description', pk.description
        ) ORDER BY pk.position)
       FROM product_packages pk WHERE pk.product_id = p.id),
      '[]'
    ) AS packages,
    COALESCE(
      (SELECT json_agg(json_build_object(
          'id', s.id, 'productId', s.product_id, 'buyer', s.buyer, 'qty', s.qty,
          'platform', s.platform, 'package', s.package, 'total', s.total, 'soldAt', s.sold_at
        ) ORDER BY s.sold_at DESC)
       FROM sales s WHERE s.product_id = p.id),
      '[]'
    ) AS sales
  FROM products p
`

function mapRow(r) {
  return {
    id: r.id,
    image: r.image,
    name: r.name,
    style: r.style,
    substyle: r.substyle,
    designer: r.designer,
    date: r.date,
    uploadDate: r.upload_date,
    productionStatus: r.production_status,
    platform: r.platform,
    linkDb: r.link_db,
    linkDbs: (r.links || []).map((l) => l.url),
    packages: (r.packages || []).map((pk) => ({
      id: pk.id,
      name: pk.name,
      price: Number(pk.price),
      description: pk.description,
    })),
    price: Number(r.price),
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    sales: (r.sales || []).map((s) => ({
      id: s.id,
      productId: s.productId,
      buyer: s.buyer,
      qty: s.qty,
      platform: s.platform,
      package: s.package,
      total: s.total !== null ? Number(s.total) : null,
      soldAt: s.soldAt,
    })),
  }
}

async function replaceLinks(client, productId, urls) {
  await client.query('DELETE FROM product_links WHERE product_id = $1', [productId])
  const cleaned = (urls || []).filter(Boolean)
  for (let i = 0; i < cleaned.length; i++) {
    await client.query(
      'INSERT INTO product_links (product_id, url, position) VALUES ($1, $2, $3)',
      [productId, cleaned[i], i]
    )
  }
}

async function replacePackages(client, productId, packages) {
  await client.query('DELETE FROM product_packages WHERE product_id = $1', [productId])
  const cleaned = (packages || []).filter((pk) => pk && pk.name && pk.name.trim())
  for (let i = 0; i < cleaned.length; i++) {
    const pk = cleaned[i]
    await client.query(
      'INSERT INTO product_packages (product_id, name, price, description, position) VALUES ($1, $2, $3, $4, $5)',
      [productId, pk.name.trim(), pk.price || 0, pk.description || null, i]
    )
  }
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_PRODUCT} WHERE p.team_id = $1 ORDER BY p.created_at DESC`,
      [req.user.teamId]
    )
    res.json({ data: result.rows.map(mapRow) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data produk', error: err.message })
  }
})

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_PRODUCT} WHERE p.id = $1 AND p.team_id = $2`,
      [req.params.id, req.user.teamId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' })
    }
    res.json({ data: mapRow(result.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil produk', error: err.message })
  }
})

// POST /api/products
router.post('/', validateBody(productFieldsCreate), async (req, res) => {
  const {
    image, name, style, substyle, designer, date, uploadDate,
    productionStatus, platform, linkDb, linkDbs, price, note, packages,
  } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO products
        (team_id, image, name, style, substyle, designer, date, upload_date,
         production_status, platform, link_db, price, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        req.user.teamId, image || null, name, style || null, substyle || null, designer || null,
        date || null, uploadDate || null, productionStatus || null, platform || null,
        linkDb || null, price || 0, note || null,
      ]
    )
    const productId = result.rows[0].id

    await replaceLinks(client, productId, linkDbs)
    await replacePackages(client, productId, packages)

    await client.query('COMMIT')

    const full = await pool.query(`${SELECT_PRODUCT} WHERE p.id = $1`, [productId])
    res.status(201).json({ data: mapRow(full.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal menambah produk', error: err.message })
  } finally {
    client.release()
  }
})

// PATCH /api/products/:id
router.patch('/:id', validateBody(productFieldsUpdate), async (req, res) => {
  const {
    image, name, style, substyle, designer, date, uploadDate,
    productionStatus, platform, linkDb, linkDbs, price, note, packages,
  } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `UPDATE products SET
        image = COALESCE($1, image),
        name = COALESCE($2, name),
        style = $3,
        substyle = $4,
        designer = $5,
        date = $6,
        upload_date = $7,
        production_status = $8,
        platform = $9,
        link_db = $10,
        price = COALESCE($11, price),
        note = $12,
        updated_at = now()
       WHERE id = $13 AND team_id = $14
       RETURNING id`,
      [
        image || null, name || null,
        style !== undefined ? style : null,
        substyle !== undefined ? substyle : null,
        designer !== undefined ? designer : null,
        date !== undefined ? date : null,
        uploadDate !== undefined ? uploadDate : null,
        productionStatus !== undefined ? productionStatus : null,
        platform !== undefined ? platform : null,
        linkDb !== undefined ? linkDb : null,
        price !== undefined ? price : null,
        note !== undefined ? note : null,
        req.params.id,
        req.user.teamId,
      ]
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Produk tidak ditemukan' })
    }

    if (linkDbs !== undefined) {
      await replaceLinks(client, req.params.id, linkDbs)
    }
    if (packages !== undefined) {
      await replacePackages(client, req.params.id, packages)
    }

    await client.query('COMMIT')

    const full = await pool.query(`${SELECT_PRODUCT} WHERE p.id = $1`, [req.params.id])
    res.json({ data: mapRow(full.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah produk', error: err.message })
  } finally {
    client.release()
  }
})

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND team_id = $2 RETURNING id',
      [req.params.id, req.user.teamId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' })
    }
    res.json({ message: 'Produk berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus produk', error: err.message })
  }
})

// Pastikan produk dari :id di URL memang milik tim yang sedang login,
// dipakai sebelum tulis/ubah/hapus penjualan (tabel sales sendiri tidak
// punya kolom team_id, jadi verifikasi lewat kepemilikan produknya).
async function assertOwnedProduct(productId, teamId) {
  const result = await pool.query('SELECT id FROM products WHERE id = $1 AND team_id = $2', [productId, teamId])
  return result.rows.length > 0
}

// ============================================================
// PENJUALAN (nested di bawah produk)
// ============================================================

// POST /api/products/:id/sales
router.post('/:id/sales', validateBody(saleFieldsCreate), async (req, res) => {
  const { buyer, qty, platform, package: pkg, total, soldAt } = req.body

  if (!buyer) {
    return res.status(400).json({ message: 'Nama pembeli wajib diisi' })
  }
  if (!(await assertOwnedProduct(req.params.id, req.user.teamId))) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO sales (product_id, buyer, qty, platform, package, total, sold_at)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, now()))
       RETURNING *`,
      [req.params.id, buyer, qty || 1, platform || null, pkg || null, total ?? null, soldAt || null]
    )
    res.status(201).json({ data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mencatat penjualan', error: err.message })
  }
})

// PATCH /api/products/:id/sales/:saleId
router.patch('/:id/sales/:saleId', validateBody(saleFieldsUpdate), async (req, res) => {
  const { buyer, qty, platform, package: pkg, total, soldAt } = req.body
  if (!(await assertOwnedProduct(req.params.id, req.user.teamId))) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' })
  }

  try {
    const result = await pool.query(
      `UPDATE sales SET
        buyer = COALESCE($1, buyer),
        qty = COALESCE($2, qty),
        platform = $3,
        package = $4,
        total = $5,
        sold_at = COALESCE($6, sold_at),
        updated_at = now()
       WHERE id = $7 AND product_id = $8
       RETURNING *`,
      [
        buyer || null, qty || null,
        platform !== undefined ? platform : null,
        pkg !== undefined ? pkg : null,
        total !== undefined ? total : null,
        soldAt || null,
        req.params.saleId, req.params.id,
      ]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Penjualan tidak ditemukan' })
    }
    res.json({ data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah penjualan', error: err.message })
  }
})

// DELETE /api/products/:id/sales/:saleId
router.delete('/:id/sales/:saleId', async (req, res) => {
  if (!(await assertOwnedProduct(req.params.id, req.user.teamId))) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' })
  }
  try {
    const result = await pool.query(
      'DELETE FROM sales WHERE id = $1 AND product_id = $2 RETURNING id',
      [req.params.saleId, req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Penjualan tidak ditemukan' })
    }
    res.json({ message: 'Penjualan berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus penjualan', error: err.message })
  }
})

export default router
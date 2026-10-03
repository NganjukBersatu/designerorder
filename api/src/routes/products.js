import { Router } from 'express'
import { pool } from '../config/db.js'
import { validateBody } from '../middleware/validate.js'
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js'
import { uuidParam } from '../utils/uuid.js'
import { deleteImageByUrl } from '../config/storage.js'
import { isTeamMember } from '../utils/designers.js'
import { buildSet } from '../utils/sql.js'

const router = Router()
router.param('id', uuidParam)
router.param('saleId', uuidParam)

const productFieldsCreate = {
  image: { type: 'url', max: 2048, label: 'Gambar' },
  name: { required: true, type: 'string', min: 1, max: 255, label: 'Nama produk' },
  style: { type: 'string', max: 100, label: 'Style' },
  substyle: { type: 'string', max: 100, label: 'Substyle' },
  designerId: { type: 'string', max: 36, label: 'Designer' },
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
    ) AS sales,
    COALESCE(NULLIF(btrim(d.display_name), ''), d.username, p.designer) AS designer_label
  FROM products p
  LEFT JOIN users d ON d.id = p.designer_id
`

// Versi untuk DAFTAR produk: TANPA isi penjualan. Satu produk bisa punya ribuan penjualan,
// dan menyertakan semuanya membuat respons membengkak tanpa batas (terukur 748 ms di 2.000
// produk x 50 penjualan). Cukup agregatnya (soldQty, salesCount); isi penjualan satu produk
// ada di GET /api/products/:id, dan semua penjualan tim ada di GET /api/sales (berpaginasi).
const SELECT_PRODUCT_LIST = `
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
    sa.sold_qty,
    sa.sales_count,
    COALESCE(NULLIF(btrim(d.display_name), ''), d.username, p.designer) AS designer_label
  FROM products p
  LEFT JOIN users d ON d.id = p.designer_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(s.qty), 0)::int AS sold_qty, COUNT(*)::int AS sales_count
    FROM sales s WHERE s.product_id = p.id
  ) sa ON true
`

function mapRow(r) {
  return {
    id: r.id,
    image: r.image,
    name: r.name,
    style: r.style,
    substyle: r.substyle,
    designer: r.designer_label, // nama akun designer (atau teks lama kalau belum tertaut)
    designerId: r.designer_id,
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
    // Dari agregat server (daftar produk) atau dihitung dari penjualan yang ikut (detail produk)
    soldQty: r.sold_qty ?? (r.sales || []).reduce((sum, s) => sum + (Number(s.qty) || 0), 0),
    salesCount: r.sales_count ?? (r.sales || []).length,
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
  if (!cleaned.length) return
  await client.query(
    `INSERT INTO product_links (product_id, url, position)
     SELECT $1, t.url, t.pos - 1 FROM unnest($2::text[]) WITH ORDINALITY AS t(url, pos)`,
    [productId, cleaned]
  )
}

async function replacePackages(client, productId, packages) {
  await client.query('DELETE FROM product_packages WHERE product_id = $1', [productId])
  const cleaned = (packages || []).filter((pk) => pk && pk.name && pk.name.trim())
  if (!cleaned.length) return
  await client.query(
    `INSERT INTO product_packages (product_id, name, price, description, position)
     SELECT $1, t.name, t.price, t.description, t.pos - 1
     FROM unnest($2::text[], $3::numeric[], $4::text[]) WITH ORDINALITY AS t(name, price, description, pos)`,
    [
      productId,
      cleaned.map((pk) => pk.name.trim()),
      cleaned.map((pk) => pk.price || 0),
      cleaned.map((pk) => pk.description || null),
    ]
  )
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_PRODUCT_LIST} WHERE p.team_id = $1 ORDER BY p.created_at DESC`,
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
    image, name, style, substyle, designerId, date, uploadDate,
    productionStatus, platform, linkDb, linkDbs, price, note, packages,
  } = req.body

  if (designerId && !(await isTeamMember(designerId, req.user.teamId))) {
    return res.status(400).json({ message: 'Designer harus anggota tim ini' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO products
        (team_id, image, name, style, substyle, designer_id, date, upload_date,
         production_status, platform, link_db, price, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        req.user.teamId, image || null, name, style || null, substyle || null, designerId || null,
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
  const { image, linkDbs, packages } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (req.body.designerId && !(await isTeamMember(req.body.designerId, req.user.teamId))) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Designer harus anggota tim ini' })
    }
    // Memilih designer dari akun = teks lama tidak diperlukan lagi (cegah data dobel)
    const input = req.body.designerId ? { ...req.body, designerLegacy: null } : req.body

    // Hanya kolom yang dikirim yang diubah; image '' / null = hapus gambar.
    const { sets, values } = buildSet(input, {
      image: 'image',
      name: { col: 'name', required: true, map: (v) => String(v).trim() },
      style: 'style',
      substyle: 'substyle',
      designerId: 'designer_id',
      designerLegacy: 'designer',
      date: 'date',
      uploadDate: 'upload_date',
      productionStatus: 'production_status',
      platform: 'platform',
      linkDb: 'link_db',
      price: { col: 'price', required: true },
      note: 'note',
    })
    const idParam = values.length + 1
    const result = await client.query(
      `WITH old AS (SELECT image FROM products WHERE id = $${idParam} AND team_id = $${idParam + 1})
       UPDATE products SET ${[...sets, 'updated_at = now()'].join(', ')}
       WHERE id = $${idParam} AND team_id = $${idParam + 1}
       RETURNING id, (SELECT image FROM old) AS old_image`,
      [...values, req.params.id, req.user.teamId]
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

    // Gambar diganti/dihapus -> file lama di bucket dibuang (best-effort, setelah data tersimpan)
    const oldImage = result.rows[0].old_image
    if (image !== undefined && oldImage && oldImage !== (image || null)) await deleteImageByUrl(oldImage, req.user.teamId)

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
      'DELETE FROM products WHERE id = $1 AND team_id = $2 RETURNING id, image',
      [req.params.id, req.user.teamId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' })
    }
    await deleteImageByUrl(result.rows[0].image, req.user.teamId)
    res.json({ message: 'Produk berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus produk', error: err.message })
  }
})

// Pastikan produk dari :id di URL memang milik tim yang sedang login,
// sekaligus ambil price & daftar package-nya — dipakai untuk menghitung
// total penjualan otomatis kalau frontend tidak mengirim total (tabel
// sales sendiri tidak punya kolom team_id, jadi verifikasi lewat
// kepemilikan produknya).
async function getOwnedProductPricing(productId, teamId) {
  const result = await pool.query(
    `SELECT p.price,
            COALESCE(
              (SELECT json_agg(json_build_object('name', pk.name, 'price', pk.price))
               FROM product_packages pk WHERE pk.product_id = p.id),
              '[]'
            ) AS packages
     FROM products p WHERE p.id = $1 AND p.team_id = $2`,
    [productId, teamId]
  )
  return result.rows[0] || null
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

  const productPricing = await getOwnedProductPricing(req.params.id, req.user.teamId)
  if (!productPricing) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' })
  }

  const qtyValue = qty || 1

  // Kolom "total" di tabel sales NOT NULL — kalau frontend tidak mengirim
  // total, hitung otomatis dari harga package yang dipilih (kalau ada),
  // atau harga produk, dikali qty. Jadi total tidak pernah null.
  let totalValue = total ?? null
  if (totalValue === null) {
    const packages = productPricing.packages || []
    const matchedPackage = pkg ? packages.find((p) => p.name === pkg) : null
    const unitPrice = matchedPackage ? Number(matchedPackage.price) : Number(productPricing.price)
    totalValue = (unitPrice || 0) * qtyValue
  }

  try {
    const result = await pool.query(
      `INSERT INTO sales (product_id, buyer, qty, platform, package, total, sold_at)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, now()))
       RETURNING *`,
      [req.params.id, buyer, qtyValue, platform || null, pkg || null, totalValue, soldAt || null]
    )
    res.status(201).json({ data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mencatat penjualan', error: err.message })
  }
})

// GET /api/products/:id/sales/:saleId — detail satu penjualan (beserta ringkasan produknya)
router.get('/:id/sales/:saleId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, p.name AS product_name, p.image AS product_image, p.price AS product_price
       FROM sales s
       JOIN products p ON p.id = s.product_id
       WHERE s.id = $1 AND s.product_id = $2 AND p.team_id = $3`,
      [req.params.saleId, req.params.id, req.user.teamId]
    )
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Penjualan tidak ditemukan' })
    }
    const r = result.rows[0]
    res.json({
      data: {
        id: r.id,
        productId: r.product_id,
        buyer: r.buyer,
        qty: r.qty,
        platform: r.platform,
        package: r.package,
        total: r.total !== null ? Number(r.total) : null,
        soldAt: r.sold_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        product: { id: r.product_id, name: r.product_name, image: r.product_image, price: Number(r.product_price) },
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil penjualan', error: err.message })
  }
})

// PATCH /api/products/:id/sales/:saleId
router.patch('/:id/sales/:saleId', validateBody(saleFieldsUpdate), async (req, res) => {
  const { buyer, qty, platform, package: pkg, total, soldAt } = req.body
  const productPricing = await getOwnedProductPricing(req.params.id, req.user.teamId)
  if (!productPricing) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' })
  }

  try {
    const result = await pool.query(
      `UPDATE sales SET
        buyer = COALESCE($1, buyer),
        qty = COALESCE($2, qty),
        platform = $3,
        package = $4,
        total = COALESCE($5, total),
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
  const productPricing = await getOwnedProductPricing(req.params.id, req.user.teamId)
  if (!productPricing) {
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
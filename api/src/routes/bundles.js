import { Router } from 'express'
import { pool } from '../config/db.js'
import { validateBody } from '../middleware/validate.js'
import { uuidParam, isUuid } from '../utils/uuid.js'
import { buildSet } from '../utils/sql.js'
import { deleteImageByUrl } from '../config/storage.js'
import { currencyRule, checkCurrency } from '../utils/currency.js'

// Bundling = beberapa produk SATU KATEGORI yang dijual sebagai satu kesatuan.
//  - Produk yang masuk bundling tidak lagi tampil sebagai produk satuan (products.bundle_id),
//    dan satu produk hanya boleh ada di satu bundling.
//  - Kategori bundling = kategori semua anggotanya (tidak bisa dicampur) dan tidak bisa diubah.
//  - Minimal 2 produk. Anggota bisa ditambah dan dikeluarkan; produk yang dikeluarkan kembali satuan.
//  - Bundling punya penjualannya sendiri (bundle_sales).
const router = Router()
router.param('id', uuidParam)
router.param('saleId', uuidParam)

const MIN_ITEMS = 2

const bundleFieldsCreate = {
  name: { required: true, type: 'string', min: 1, max: 255, label: 'Nama bundling' },
  style: { required: true, type: 'string', min: 1, max: 100, label: 'Kategori' },
  substyle: { type: 'string', max: 100, label: 'Sub style' },
  platform: { type: 'string', max: 255, label: 'Platform' },
  price: { type: 'number', min: 0, label: 'Harga' },
  currency: currencyRule,
  note: { type: 'string', max: 5000, label: 'Catatan' },
  image: { type: 'url', max: 2048, label: 'Gambar' },
  linkDbs: { type: 'array', itemType: 'string', label: 'Daftar link DB' },
  productIds: { type: 'array', itemType: 'string', label: 'Produk' },
}
const bundleFieldsUpdate = {
  ...Object.fromEntries(Object.entries(bundleFieldsCreate).map(([k, r]) => [k, { ...r, required: false }])),
  addProductIds: { type: 'array', itemType: 'string', label: 'Produk yang ditambah' },
  removeProductIds: { type: 'array', itemType: 'string', label: 'Produk yang dikeluarkan' },
}
const saleFields = {
  buyer: { type: 'string', max: 150, label: 'Nama pembeli' },
  qty: { type: 'number', integer: true, min: 1, label: 'Jumlah' },
  platform: { type: 'string', max: 100, label: 'Platform' },
  total: { type: 'number', min: 0, label: 'Total' },
  soldAt: { type: 'date', label: 'Tanggal jual' },
}

const SELECT_BUNDLE = `
  SELECT
    b.*,
    COALESCE(
      (SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'image', p.image, 'price', p.price, 'currency', p.currency) ORDER BY p.name)
       FROM products p WHERE p.bundle_id = b.id),
      '[]'
    ) AS items,
    COALESCE(
      (SELECT json_agg(json_build_object('url', l.url) ORDER BY l.position)
       FROM bundle_links l WHERE l.bundle_id = b.id),
      '[]'
    ) AS links,
    COALESCE((SELECT sum(s.qty) FROM bundle_sales s WHERE s.bundle_id = b.id), 0)::int AS sold_qty,
    (SELECT count(*) FROM bundle_sales s WHERE s.bundle_id = b.id)::int AS sales_count
  FROM bundles b
`

function mapBundle(r) {
  return {
    id: r.id,
    kind: 'bundle',
    name: r.name,
    style: r.style,
    substyle: r.substyle,
    platform: r.platform,
    image: r.image,
    price: Number(r.price),
    currency: r.currency,
    note: r.note,
    linkDbs: (r.links || []).map((l) => l.url),
    items: (r.items || []).map((p) => ({ id: p.id, name: p.name, image: p.image, price: Number(p.price), currency: p.currency })),
    itemCount: (r.items || []).length,
    soldQty: r.sold_qty,
    salesCount: r.sales_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapSale(r) {
  return {
    id: r.id,
    bundleId: r.bundle_id,
    buyer: r.buyer,
    qty: r.qty,
    platform: r.platform,
    total: Number(r.total),
    currency: r.currency,
    soldAt: r.sold_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

async function replaceLinks(client, bundleId, urls) {
  await client.query('DELETE FROM bundle_links WHERE bundle_id = $1', [bundleId])
  const cleaned = (urls || []).filter(Boolean)
  if (!cleaned.length) return
  await client.query(
    `INSERT INTO bundle_links (bundle_id, url, position)
     SELECT $1, t.url, t.pos - 1 FROM unnest($2::text[]) WITH ORDINALITY AS t(url, pos)`,
    [bundleId, cleaned]
  )
}

const uniqueIds = (list) => [...new Set((list || []).map((v) => String(v).toLowerCase()))]

// Cek produk-produk yang mau ditambahkan: milik tim, satu kategori dengan bundling, belum ter-bundling.
// Semua anggota juga harus bermata uang sama (dengan `currency` bila diberikan, kalau tidak dengan satu sama lain).
// Mengembalikan { error: {status, message} } atau { ids, currency }.
async function checkCandidates(client, ids, teamId, style, bundleId = null, currency = null) {
  if (!ids.length) return { ids, currency }
  if (!ids.every(isUuid)) return { error: { status: 400, message: 'ID produk tidak valid' } }
  const r = await client.query(
    'SELECT id, name, style, currency, bundle_id FROM products WHERE id = ANY($1::uuid[]) AND team_id = $2 FOR UPDATE',
    [ids, teamId]
  )
  if (r.rows.length !== ids.length) return { error: { status: 404, message: 'Ada produk yang tidak ditemukan' } }
  const other = r.rows.find((p) => (p.style || '') !== style)
  if (other) return { error: { status: 400, message: `Semua produk harus satu kategori (${style}). "${other.name}" ada di kategori lain.` } }
  const taken = r.rows.find((p) => p.bundle_id && p.bundle_id !== bundleId)
  if (taken) return { error: { status: 409, message: `"${taken.name}" sudah ada di bundling lain` } }
  const want = currency || r.rows[0].currency
  const mixed = r.rows.find((p) => p.currency !== want)
  if (mixed) {
    return { error: { status: 400, message: `Semua produk harus bermata uang sama (${want}). "${mixed.name}" memakai ${mixed.currency}.` } }
  }
  return { ids, currency: want }
}

// GET /api/bundles?style=
router.get('/', async (req, res) => {
  try {
    const params = [req.user.teamId]
    let where = 'WHERE b.team_id = $1'
    if (req.query.style) {
      params.push(String(req.query.style))
      where += ` AND b.style = $${params.length}`
    }
    const result = await pool.query(`${SELECT_BUNDLE} ${where} ORDER BY b.created_at DESC`, params)
    res.json({ data: result.rows.map(mapBundle) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil bundling', error: err.message })
  }
})

// GET /api/bundles/:id — detail + penjualannya
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`${SELECT_BUNDLE} WHERE b.id = $1 AND b.team_id = $2`, [req.params.id, req.user.teamId])
    if (!result.rows.length) return res.status(404).json({ message: 'Bundling tidak ditemukan' })
    const sales = await pool.query('SELECT * FROM bundle_sales WHERE bundle_id = $1 ORDER BY sold_at DESC', [req.params.id])
    res.json({ data: { ...mapBundle(result.rows[0]), sales: sales.rows.map(mapSale) } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil bundling', error: err.message })
  }
})

// POST /api/bundles { name, style, productIds[>=2], price?, image?, note? }
router.post('/', validateBody(bundleFieldsCreate), async (req, res) => {
  const b = req.body
  const style = String(b.style).trim()
  const ids = uniqueIds(b.productIds)
  if (!checkCurrency(b.currency)) return res.status(400).json({ message: 'Mata uang tidak dikenal' })
  if (ids.length < MIN_ITEMS) {
    return res.status(400).json({ message: `Bundling harus berisi minimal ${MIN_ITEMS} produk` })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const check = await checkCandidates(client, ids, req.user.teamId, style, null, b.currency || null)
    if (check.error) {
      await client.query('ROLLBACK')
      return res.status(check.error.status).json({ message: check.error.message })
    }

    // Harga bundling diisi manual; kalau kosong, otomatis = jumlah harga anggotanya
    let price = b.price
    if (price === undefined || price === null || price === '') {
      price = (await client.query('SELECT COALESCE(SUM(price), 0) AS total FROM products WHERE id = ANY($1::uuid[])', [ids])).rows[0].total
    }
    const created = await client.query(
      `INSERT INTO bundles (team_id, name, style, substyle, platform, image, price, currency, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [req.user.teamId, String(b.name).trim(), style, b.substyle || null, b.platform || null, b.image || null, price, check.currency || 'USD', b.note || null, req.user.id]
    )
    const bundleId = created.rows[0].id
    await replaceLinks(client, bundleId, b.linkDbs)
    await client.query('UPDATE products SET bundle_id = $1 WHERE id = ANY($2::uuid[])', [bundleId, ids])
    await client.query('COMMIT')

    const full = await pool.query(`${SELECT_BUNDLE} WHERE b.id = $1`, [bundleId])
    res.status(201).json({ data: mapBundle(full.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal membuat bundling', error: err.message })
  } finally {
    client.release()
  }
})

// PATCH /api/bundles/:id { name?, price?, image?, note?, addProductIds?[], removeProductIds?[] }
router.patch('/:id', validateBody(bundleFieldsUpdate), async (req, res) => {
  const b = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query('SELECT * FROM bundles WHERE id = $1 AND team_id = $2 FOR UPDATE', [req.params.id, req.user.teamId])
    if (!found.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Bundling tidak ditemukan' })
    }
    const current = found.rows[0]
    if (b.style !== undefined && String(b.style).trim() !== current.style) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Kategori bundling tidak bisa diubah' })
    }
    if (b.currency && b.currency !== current.currency) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Mata uang bundling mengikuti isinya dan tidak bisa diubah' })
    }

    const add = uniqueIds(b.addProductIds)
    const remove = uniqueIds(b.removeProductIds)
    if (add.some((id) => remove.includes(id))) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Produk yang sama tidak bisa ditambah dan dikeluarkan sekaligus' })
    }

    const check = await checkCandidates(client, add, req.user.teamId, current.style, current.id, current.currency)
    if (check.error) {
      await client.query('ROLLBACK')
      return res.status(check.error.status).json({ message: check.error.message })
    }
    if (add.length) await client.query('UPDATE products SET bundle_id = $1 WHERE id = ANY($2::uuid[])', [current.id, add])
    if (remove.length) {
      if (!remove.every(isUuid)) {
        await client.query('ROLLBACK')
        return res.status(400).json({ message: 'ID produk tidak valid' })
      }
      await client.query('UPDATE products SET bundle_id = NULL WHERE id = ANY($1::uuid[]) AND bundle_id = $2', [remove, current.id])
    }

    const count = (await client.query('SELECT count(*)::int AS n FROM products WHERE bundle_id = $1', [current.id])).rows[0].n
    if (count < MIN_ITEMS) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: `Bundling harus berisi minimal ${MIN_ITEMS} produk. Hapus bundlingnya kalau sudah tidak diperlukan.` })
    }

    const { sets, values } = buildSet(b, {
      name: { col: 'name', required: true, map: (v) => String(v).trim() },
      substyle: 'substyle',
      platform: 'platform',
      price: { col: 'price', required: true },
      note: 'note',
      image: 'image',
    })
    await client.query(
      `UPDATE bundles SET ${[...sets, 'updated_at = now()'].join(', ')} WHERE id = $${values.length + 1}`,
      [...values, current.id]
    )
    if (b.linkDbs !== undefined) await replaceLinks(client, current.id, b.linkDbs)
    await client.query('COMMIT')

    if (b.image !== undefined && current.image && current.image !== (b.image || null)) {
      await deleteImageByUrl(current.image, req.user.teamId)
    }
    const full = await pool.query(`${SELECT_BUNDLE} WHERE b.id = $1`, [current.id])
    res.json({ data: mapBundle(full.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah bundling', error: err.message })
  } finally {
    client.release()
  }
})

// DELETE /api/bundles/:id — anggotanya kembali jadi produk satuan.
// Bundling yang sudah punya penjualan TIDAK dihapus (riwayat penjualan tidak boleh hilang).
router.delete('/:id', async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT image, (SELECT count(*)::int FROM bundle_sales s WHERE s.bundle_id = b.id) AS sales_count
       FROM bundles b WHERE b.id = $1 AND b.team_id = $2`,
      [req.params.id, req.user.teamId]
    )
    if (!found.rows.length) return res.status(404).json({ message: 'Bundling tidak ditemukan' })
    if (found.rows[0].sales_count > 0) {
      return res.status(409).json({
        message: `Bundling ini sudah punya ${found.rows[0].sales_count} penjualan. Hapus penjualannya dulu kalau memang mau dihapus.`,
      })
    }
    // products.bundle_id ON DELETE SET NULL -> anggota otomatis kembali satuan
    await pool.query('DELETE FROM bundles WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    await deleteImageByUrl(found.rows[0].image, req.user.teamId)
    res.json({ message: 'Bundling dihapus, produknya kembali menjadi produk satuan' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus bundling', error: err.message })
  }
})

// ===== Penjualan bundling =====
async function ownedBundle(id, teamId) {
  const r = await pool.query('SELECT id, price, currency FROM bundles WHERE id = $1 AND team_id = $2', [id, teamId])
  return r.rows[0] || null
}

router.get('/:id/sales/:saleId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT s.*, b.name AS bundle_name, b.image AS bundle_image, b.price AS bundle_price, b.currency AS bundle_currency
       FROM bundle_sales s JOIN bundles b ON b.id = s.bundle_id
       WHERE s.id = $1 AND s.bundle_id = $2 AND b.team_id = $3`,
      [req.params.saleId, req.params.id, req.user.teamId]
    )
    if (!r.rows.length) return res.status(404).json({ message: 'Penjualan tidak ditemukan' })
    const row = r.rows[0]
    res.json({
      data: {
        ...mapSale(row),
        productId: row.bundle_id,
        package: null,
        // bentuk sama dengan penjualan produk supaya halaman detail penjualan bisa dipakai bersama
        product: { id: row.bundle_id, name: row.bundle_name, image: row.bundle_image, price: Number(row.bundle_price), currency: row.bundle_currency },
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil penjualan', error: err.message })
  }
})

router.post('/:id/sales', validateBody(saleFields), async (req, res) => {
  const bundle = await ownedBundle(req.params.id, req.user.teamId)
  if (!bundle) return res.status(404).json({ message: 'Bundling tidak ditemukan' })
  const { buyer, qty, platform, total, soldAt } = req.body
  if (!buyer) return res.status(400).json({ message: 'Nama pembeli wajib diisi' })
  const qtyValue = qty || 1
  const totalValue = total ?? Number(bundle.price) * qtyValue // otomatis = harga bundling x jumlah
  try {
    const r = await pool.query(
      `INSERT INTO bundle_sales (bundle_id, team_id, buyer, qty, platform, total, currency, sold_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, now())) RETURNING *`,
      [bundle.id, req.user.teamId, buyer, qtyValue, platform || null, totalValue, bundle.currency, soldAt || null]
    )
    res.status(201).json({ data: mapSale(r.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mencatat penjualan', error: err.message })
  }
})

router.patch('/:id/sales/:saleId', validateBody(saleFields), async (req, res) => {
  const bundle = await ownedBundle(req.params.id, req.user.teamId)
  if (!bundle) return res.status(404).json({ message: 'Bundling tidak ditemukan' })
  try {
    const { sets, values } = buildSet(req.body, {
      buyer: { col: 'buyer', required: true, map: (v) => String(v).trim() },
      qty: { col: 'qty', required: true },
      platform: 'platform',
      total: { col: 'total', required: true },
      soldAt: { col: 'sold_at', required: true },
    })
    const r = await pool.query(
      `UPDATE bundle_sales SET ${[...sets, 'updated_at = now()'].join(', ')}
       WHERE id = $${values.length + 1} AND bundle_id = $${values.length + 2} RETURNING *`,
      [...values, req.params.saleId, bundle.id]
    )
    if (!r.rows.length) return res.status(404).json({ message: 'Penjualan tidak ditemukan' })
    res.json({ data: mapSale(r.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah penjualan', error: err.message })
  }
})

router.delete('/:id/sales/:saleId', async (req, res) => {
  const bundle = await ownedBundle(req.params.id, req.user.teamId)
  if (!bundle) return res.status(404).json({ message: 'Bundling tidak ditemukan' })
  try {
    const r = await pool.query('DELETE FROM bundle_sales WHERE id = $1 AND bundle_id = $2 RETURNING id', [req.params.saleId, bundle.id])
    if (!r.rows.length) return res.status(404).json({ message: 'Penjualan tidak ditemukan' })
    res.json({ message: 'Penjualan dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus penjualan', error: err.message })
  }
})

export default router

import { Router } from 'express'
import { pool } from '../config/db.js'
import { validateBody } from '../middleware/validate.js'
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js'
import { uuidParam } from '../utils/uuid.js'
import { deleteImageByUrl } from '../config/storage.js'
import { isTeamMember } from '../utils/designers.js'
import { buildSet } from '../utils/sql.js'
import { currencyRule, checkCurrency } from '../utils/currency.js'
import { cached } from '../utils/cache.js'

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
  currency: currencyRule,
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

// Query dasar untuk DETAIL produk: links, paket, dan 10 penjualan TERBARU (sold_qty / sales_count
// dihitung dari seluruh penjualan). Riwayat lengkap diambil per halaman lewat GET /:id/sales.
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
          'platform', s.platform, 'package', s.package, 'total', s.total, 'currency', s.currency, 'soldAt', s.sold_at
        ) ORDER BY s.sold_at DESC)
       FROM (SELECT * FROM sales WHERE product_id = p.id ORDER BY sold_at DESC LIMIT 10) s),
      '[]'
    ) AS sales,
    (SELECT COALESCE(SUM(qty), 0)::int FROM sales WHERE product_id = p.id) AS sold_qty,
    (SELECT COUNT(*)::int FROM sales WHERE product_id = p.id) AS sales_count,
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
    currency: r.currency,
    bundleId: r.bundle_id,
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
      currency: s.currency,
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

// Ekspresi nama designer yang tampil (akun tertaut, atau teks lama kalau belum tertaut)
const DESIGNER_LABEL = `COALESCE(NULLIF(btrim(d.display_name), ''), d.username, p.designer)`
const NO_SUBSTYLE = '__none' // nilai khusus untuk filter "Tanpa substyle"

// Escape karakter khusus LIKE supaya ketikan user (%, _) dicari apa adanya
const likeEscape = (v) => String(v).replace(/[\\%_]/g, '\\$&')
const str = (v) => (typeof v === 'string' ? v.trim() : '')

// Menyusun WHERE dari query string. Semua filter dikerjakan di database supaya halaman yang
// diminta cukup membaca baris-barisnya saja (bukan seluruh produk tim lalu disaring di browser).
function buildProductFilters(query, teamId) {
  const where = ['p.team_id = $1', 'p.bundle_id IS NULL']
  const params = [teamId]
  const add = (sql, value) => {
    params.push(value)
    where.push(sql.replaceAll('?', `$${params.length}`))
  }

  const style = str(query.style)
  if (style) add('p.style = ?', style)

  const substyle = str(query.substyle)
  if (substyle === NO_SUBSTYLE) where.push(`(p.substyle IS NULL OR btrim(p.substyle) = '')`)
  else if (substyle) add('btrim(p.substyle) = ?', substyle)

  const productionStatus = str(query.productionStatus)
  if (productionStatus) add('p.production_status = ?', productionStatus)

  const platform = str(query.platform)
  if (platform) {
    add(`p.platform ILIKE '%' || ? || '%'`, likeEscape(platform))
    // data lama: "both" berarti Etsy & Booth
    if (/^(etsy|booth)$/i.test(platform)) where[where.length - 1] = `(${where[where.length - 1]} OR lower(btrim(p.platform)) = 'both')`
  }

  const designer = str(query.designer)
  if (designer) add(`${DESIGNER_LABEL} = ?`, designer)

  const currency = str(query.currency)
  if (currency) add('p.currency = ?', currency.toUpperCase())

  const search = str(query.search)
  if (search) {
    params.push(`%${likeEscape(search)}%`)
    const n = `$${params.length}`
    where.push(
      `(p.name ILIKE ${n} OR p.substyle ILIKE ${n} OR p.platform ILIKE ${n} OR p.production_status ILIKE ${n}
        OR p.note ILIKE ${n} OR ${DESIGNER_LABEL} ILIKE ${n})`
    )
  }

  const sold = str(query.sold)
  if (sold === 'sold') where.push('COALESCE(sa.sold_qty, 0) > 0')
  else if (sold === 'unsold') where.push('COALESCE(sa.sold_qty, 0) = 0')

  return { whereSql: `WHERE ${where.join(' AND ')}`, params, needsSold: sold === 'sold' || sold === 'unsold' }
}

// GET /api/products?style=&substyle=&productionStatus=&platform=&designer=&currency=&sold=sold|unsold
//                  &search=&page=&limit=
// Tanpa page/limit semua baris yang cocok dikembalikan (kompatibel dengan pemanggil lama).
// Dengan page/limit: berpaginasi (maks 200 per halaman) + `pagination` berisi total.
router.get('/', async (req, res) => {
  try {
    const { whereSql, params, needsSold } = buildProductFilters(req.query, req.user.teamId)
    const pagination = parsePagination(req.query)

    let limitSql = ''
    const dataParams = [...params]
    if (pagination) {
      dataParams.push(pagination.limit, pagination.offset)
      limitSql = ` LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`
    }

    // COUNT hanya perlu join users (untuk filter/pencarian designer) dan agregat penjualan kalau filter jual dipakai
    const countFrom = `FROM products p LEFT JOIN users d ON d.id = p.designer_id${
      needsSold
        ? ` LEFT JOIN LATERAL (SELECT COALESCE(SUM(s.qty), 0)::int AS sold_qty FROM sales s WHERE s.product_id = p.id) sa ON true`
        : ''
    }`

    const [result, countResult] = await Promise.all([
      pool.query(`${SELECT_PRODUCT_LIST} ${whereSql} ORDER BY p.created_at DESC, p.id DESC${limitSql}`, dataParams),
      pagination ? pool.query(`SELECT COUNT(*)::int AS total ${countFrom} ${whereSql}`, params) : null,
    ])

    res.json({
      data: result.rows.map(mapRow),
      pagination: pagination ? buildPaginationMeta(pagination, countResult.rows[0].total) : null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data produk', error: err.message })
  }
})

// GET /api/products/overview — agregat seluruh produk & bundling tim (satu query, di-cache).
// Dipakai sidebar, halaman Kategori, Ringkasan Penjualan, dan pilihan dropdown di form, supaya
// semuanya TIDAK perlu memuat daftar produk lengkap. Nilai uang per mata uang asalnya
// (konversi ke mata uang tampilan dilakukan di browser, karena kurs bisa berubah kapan saja).
router.get('/overview', async (req, res) => {
  try {
    const teamId = req.user.teamId
    const data = await cached(teamId, 'products-overview', async () => {
      const ITEMS = `
        WITH items AS MATERIALIZED (
          SELECT 'product'::text AS kind, p.id, p.name, p.image, NULLIF(btrim(p.style), '') AS style,
                 NULLIF(btrim(p.substyle), '') AS substyle, p.created_at,
                 p.currency, p.price, COALESCE(sa.q, 0) AS units, COALESCE(sa.c, 0) AS tx
          FROM products p
          LEFT JOIN LATERAL (SELECT SUM(s.qty)::int AS q, COUNT(*)::int AS c FROM sales s WHERE s.product_id = p.id) sa ON true
          WHERE p.team_id = $1 AND p.bundle_id IS NULL
          UNION ALL
          SELECT 'bundle'::text, b.id, b.name, b.image, NULLIF(btrim(b.style), ''),
                 NULLIF(btrim(b.substyle), ''), b.created_at, b.currency, b.price,
                 COALESCE(bs.q, 0), COALESCE(bs.c, 0)
          FROM bundles b
          LEFT JOIN LATERAL (SELECT SUM(x.qty)::int AS q, COUNT(*)::int AS c FROM bundle_sales x WHERE x.bundle_id = b.id) bs ON true
          WHERE b.team_id = $1
        )`
      const [byStyleRes, topRes, facetRes, subRes, thumbRes] = await Promise.all([
        pool.query(
          `${ITEMS}
           SELECT style, currency, count(*)::int AS count, count(*) FILTER (WHERE units > 0)::int AS sold,
                  COALESCE(SUM(units), 0)::int AS units, COALESCE(SUM(tx), 0)::int AS tx,
                  COALESCE(SUM(units * price), 0) AS revenue
           FROM items GROUP BY style, currency`,
          [teamId]
        ),
        pool.query(
          `${ITEMS}
           SELECT kind, id, name, image, currency, price, units, tx FROM items
           WHERE units > 0 ORDER BY units DESC, units * price DESC LIMIT 5`,
          [teamId]
        ),
        pool.query(
          `SELECT
             COALESCE(array_agg(DISTINCT btrim(substyle)) FILTER (WHERE btrim(substyle) <> ''), '{}') AS substyles,
             COALESCE(array_agg(DISTINCT production_status) FILTER (WHERE production_status <> ''), '{}') AS statuses
           FROM products WHERE team_id = $1`,
          [teamId]
        ),
        pool.query(
          `${ITEMS}
           SELECT style, substyle, count(*)::int AS n FROM items
           WHERE style IS NOT NULL AND substyle IS NOT NULL GROUP BY style, substyle`,
          [teamId]
        ),
        // 4 gambar terbaru per kategori untuk kartu di halaman Kategori
        pool.query(
          `${ITEMS}
           SELECT style, id, name, image FROM (
             SELECT style, id, name, image,
                    row_number() OVER (PARTITION BY style ORDER BY created_at DESC) AS rn
             FROM items WHERE style IS NOT NULL AND image IS NOT NULL AND image <> ''
           ) t WHERE rn <= 4 ORDER BY style, rn`,
          [teamId]
        ),
      ])

      // Gabungkan baris (style, currency) jadi satu entri per style
      const styles = new Map()
      const totals = { count: 0, sold: 0, units: 0, transactions: 0 }
      for (const r of byStyleRes.rows) {
        const key = r.style || ''
        const entry = styles.get(key) || { style: key, count: 0, units: 0, revenue: {}, substyles: [], thumbs: [] }
        entry.count += r.count
        entry.units += r.units
        entry.revenue[r.currency] = (entry.revenue[r.currency] || 0) + Number(r.revenue)
        styles.set(key, entry)
        totals.count += r.count
        totals.sold += r.sold
        totals.units += r.units
        totals.transactions += r.tx
      }

      for (const r of subRes.rows) {
        const entry = styles.get(r.style)
        if (entry) (entry.substyles ||= []).push({ name: r.substyle, count: r.n })
      }
      for (const r of thumbRes.rows) {
        const entry = styles.get(r.style)
        if (entry) (entry.thumbs ||= []).push({ id: r.id, name: r.name, src: r.image })
      }

      return {
        totals,
        styles: [...styles.values()],
        topProducts: topRes.rows.map((r) => ({
          kind: r.kind,
          id: r.id,
          name: r.name,
          image: r.image,
          currency: r.currency,
          price: Number(r.price),
          units: r.units,
        })),
        substyles: facetRes.rows[0].substyles,
        productionStatuses: facetRes.rows[0].statuses,
      }
    })
    res.json({ data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil ringkasan produk', error: err.message })
  }
})

// GET /api/products/facets?style= — pilihan filter untuk satu kategori (produk satuan + bundling):
// substyle beserta jumlahnya, status produksi, platform, dan designer yang benar-benar ada di sana.
router.get('/facets', async (req, res) => {
  try {
    const style = str(req.query.style)
    const teamId = req.user.teamId

    // Tanpa ?style=: daftar nilai yang dipakai di seluruh tim (untuk "Ambil dari produk" di Pengaturan)
    if (!style) {
      const all = await pool.query(
        `SELECT
           COALESCE(array_agg(DISTINCT btrim(style)) FILTER (WHERE btrim(style) <> ''), '{}') AS styles,
           COALESCE(array_agg(DISTINCT btrim(substyle)) FILTER (WHERE btrim(substyle) <> ''), '{}') AS substyles,
           COALESCE(array_agg(DISTINCT production_status) FILTER (WHERE production_status <> ''), '{}') AS statuses,
           COALESCE(array_agg(DISTINCT platform) FILTER (WHERE platform <> ''), '{}') AS platforms
         FROM products WHERE team_id = $1`,
        [teamId]
      )
      const r = all.rows[0]
      return res.json({ data: { styles: r.styles, substyles: r.substyles, productionStatuses: r.statuses, platforms: r.platforms } })
    }
    const [subs, rest] = await Promise.all([
      pool.query(
        `SELECT COALESCE(btrim(substyle), '') AS name, count(*)::int AS n FROM (
           SELECT substyle FROM products WHERE team_id = $1 AND style = $2 AND bundle_id IS NULL
           UNION ALL
           SELECT substyle FROM bundles WHERE team_id = $1 AND style = $2
         ) x GROUP BY 1`,
        [teamId, style]
      ),
      pool.query(
        `SELECT
           COALESCE(array_agg(DISTINCT p.production_status) FILTER (WHERE p.production_status <> ''), '{}') AS statuses,
           COALESCE(array_agg(DISTINCT p.platform) FILTER (WHERE p.platform <> ''), '{}')
             || COALESCE((SELECT array_agg(DISTINCT b.platform) FROM bundles b WHERE b.team_id = $1 AND b.style = $2 AND b.platform <> ''), '{}') AS platforms,
           COALESCE(array_agg(DISTINCT ${DESIGNER_LABEL}) FILTER (WHERE ${DESIGNER_LABEL} IS NOT NULL), '{}') AS designers
         FROM products p LEFT JOIN users d ON d.id = p.designer_id
         WHERE p.team_id = $1 AND p.style = $2 AND p.bundle_id IS NULL`,
        [teamId, style]
      ),
    ])
    res.json({
      data: {
        substyles: subs.rows.map((r) => ({ name: r.name, count: r.n })),
        productionStatuses: rest.rows[0].statuses,
        platforms: rest.rows[0].platforms,
        designers: rest.rows[0].designers,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil pilihan filter', error: err.message })
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

// GET /api/products/:id/sales?search=&page=&limit= — riwayat penjualan satu produk, terbaru dulu,
// berpaginasi (default 20/halaman). search mencari pembeli, platform, atau paket.
router.get('/:id/sales', async (req, res) => {
  try {
    const owned = await pool.query('SELECT 1 FROM products WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    if (!owned.rows.length) return res.status(404).json({ message: 'Produk tidak ditemukan' })

    const params = [req.params.id]
    let whereSql = 'WHERE s.product_id = $1'
    const search = str(req.query.search)
    if (search) {
      params.push(`%${likeEscape(search)}%`)
      whereSql += ` AND (s.buyer ILIKE $2 OR s.platform ILIKE $2 OR s.package ILIKE $2)`
    }
    const pagination = parsePagination({ page: req.query.page || 1, limit: req.query.limit || 20 })
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT s.* FROM sales s ${whereSql} ORDER BY s.sold_at DESC, s.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pagination.limit, pagination.offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM sales s ${whereSql}`, params),
    ])
    res.json({
      data: rows.rows.map((s) => ({
        id: s.id,
        productId: s.product_id,
        buyer: s.buyer,
        qty: s.qty,
        platform: s.platform,
        package: s.package,
        total: s.total !== null ? Number(s.total) : null,
        currency: s.currency,
        soldAt: s.sold_at,
      })),
      pagination: buildPaginationMeta(pagination, count.rows[0].total),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil riwayat penjualan', error: err.message })
  }
})

// POST /api/products
router.post('/', validateBody(productFieldsCreate), async (req, res) => {
  const {
    image, name, style, substyle, designerId, date, uploadDate,
    productionStatus, platform, linkDb, linkDbs, price, currency, note, packages,
  } = req.body

  if (!checkCurrency(currency)) return res.status(400).json({ message: 'Mata uang tidak dikenal' })

  if (designerId && !(await isTeamMember(designerId, req.user.teamId))) {
    return res.status(400).json({ message: 'Designer harus anggota tim ini' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO products
        (team_id, image, name, style, substyle, designer_id, date, upload_date,
         production_status, platform, link_db, price, currency, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        req.user.teamId, image || null, name, style || null, substyle || null, designerId || null,
        date || null, uploadDate || null, productionStatus || null, platform || null,
        linkDb || null, price || 0, currency || 'USD', note || null,
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
  if (!checkCurrency(req.body.currency)) return res.status(400).json({ message: 'Mata uang tidak dikenal' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (req.body.designerId && !(await isTeamMember(req.body.designerId, req.user.teamId))) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Designer harus anggota tim ini' })
    }
    if (req.body.style !== undefined || req.body.currency) {
      const cur = await client.query('SELECT style, currency, bundle_id FROM products WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
      const c = cur.rows[0]
      if (c?.bundle_id && req.body.style !== undefined && (req.body.style || null) !== (c.style || null)) {
        await client.query('ROLLBACK')
        return res.status(409).json({ message: 'Produk ini ada di dalam bundling, jadi kategorinya tidak bisa dipindah. Keluarkan dari bundling dulu.' })
      }
      if (c?.bundle_id && req.body.currency && req.body.currency !== c.currency) {
        await client.query('ROLLBACK')
        return res.status(409).json({ message: 'Produk ini ada di dalam bundling, jadi mata uangnya tidak bisa diganti. Keluarkan dari bundling dulu.' })
      }
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
      currency: { col: 'currency', required: true },
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
      'DELETE FROM products WHERE id = $1 AND team_id = $2 AND bundle_id IS NULL RETURNING id, image',
      [req.params.id, req.user.teamId]
    )
    if (result.rows.length === 0) {
      const exists = await pool.query('SELECT 1 FROM products WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
      if (exists.rows.length) {
        return res.status(409).json({ message: 'Produk ini ada di dalam bundling. Keluarkan dari bundling dulu sebelum dihapus.' })
      }
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
    `SELECT p.price, p.currency,
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
      `INSERT INTO sales (product_id, buyer, qty, platform, package, total, currency, sold_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, now()))
       RETURNING *`,
      [req.params.id, buyer, qtyValue, platform || null, pkg || null, totalValue, productPricing.currency, soldAt || null]
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
      `SELECT s.*, p.name AS product_name, p.image AS product_image, p.price AS product_price, p.currency AS product_currency
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
        currency: r.currency,
        soldAt: r.sold_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        product: { id: r.product_id, name: r.product_name, image: r.product_image, price: Number(r.product_price), currency: r.product_currency },
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
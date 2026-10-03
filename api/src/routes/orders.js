import { Router } from 'express'
import { pool } from '../config/db.js'
import { validateBody } from '../middleware/validate.js'
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js'
import { isUuid, uuidParam } from '../utils/uuid.js'
import { buildSet } from '../utils/sql.js'
import { deleteImageByUrl } from '../config/storage.js'
import { isTeamMember } from '../utils/designers.js'

const router = Router()
router.param('id', uuidParam)

// Order = pesanan buyer + tugas internal yang digabung. Satu record bisa berisi
// data transaksi (pembeli, harga, paket) dan/atau data kerjaan (judul, tenggat,
// link DB, catatan, gambar). Syarat minimal: ada judul ATAU nama pembeli.
const orderFieldsCreate = {
  image: { type: 'url', max: 2048, label: 'Gambar' },
  title: { type: 'string', max: 255, label: 'Judul' },
  buyerName: { type: 'string', max: 150, label: 'Nama pembeli/klien' },
  buyerReference: { type: 'string', max: 255, label: 'Referensi pembeli' },
  storeName: { type: 'string', max: 150, label: 'Platform/toko' },
  designerId: { type: 'string', max: 36, label: 'Designer' },
  category: { type: 'string', max: 100, label: 'Kategori' },
  characterType: { type: 'string', max: 100, label: 'Jenis karakter' },
  style: { type: 'string', max: 100, label: 'Style' },
  package: { type: 'string', max: 100, label: 'Paket' },
  productionStatus: { type: 'string', max: 100, label: 'Status produksi' },
  orderDate: { type: 'date', label: 'Tanggal order' },
  completionDate: { type: 'date', label: 'Tanggal selesai' },
  dueDate: { type: 'date', label: 'Tenggat' },
  price: { type: 'number', min: 0, label: 'Harga' },
  note: { type: 'string', max: 5000, label: 'Catatan' },
  linkDbs: { type: 'array', itemType: 'string', label: 'Daftar link DB' },
}

const orderFieldsUpdate = Object.fromEntries(
  Object.entries(orderFieldsCreate).map(([key, rule]) => [key, { ...rule, required: false }])
)

// Mapping status dari frontend ke database
const STATUS_MAP = {
  menunggu: 'Pending',
  pending: 'Pending',
  'sedang dikerjakan': 'Progress',
  dikerjakan: 'Progress',
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

const trimOrNull = (v) => (v === null || v === undefined ? null : String(v).trim())

// Query dasar: menempelkan link DB (JSON array) dan username pembuat langsung
// dari SQL, supaya frontend tidak perlu request terpisah.
const SELECT_ORDER = `
  SELECT
    o.*,
    u.username AS created_by_name,
    COALESCE(NULLIF(btrim(d.display_name), ''), d.username, o.designer_name) AS designer_label,
    COALESCE(
      (SELECT json_agg(json_build_object('id', l.id, 'url', l.url, 'position', l.position) ORDER BY l.position)
       FROM order_links l WHERE l.order_id = o.id),
      '[]'
    ) AS links
  FROM orders o
  LEFT JOIN users u ON u.id = o.created_by
  LEFT JOIN users d ON d.id = o.designer_id
`

function mapRow(r) {
  return {
    id: r.id,
    image: r.image,
    title: r.title,
    buyerName: r.buyer_name,
    buyerReference: r.buyer_reference,
    storeName: r.store_name,
    designerId: r.designer_id,
    designerName: r.designer_label, // nama akun designer (atau teks lama kalau belum tertaut)
    category: r.category,
    characterType: r.character_type,
    style: r.style,
    package: r.package,
    productId: r.product_id,
    productionStatus: r.production_status,
    orderDate: r.order_date,
    completionDate: r.completion_date,
    dueDate: r.due_date,
    status: r.status,
    price: Number(r.price),
    note: r.note,
    linkDbs: (r.links || []).map((l) => l.url),
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

async function ownsProduct(productId, teamId) {
  if (!isUuid(productId)) return false
  const result = await pool.query('SELECT id FROM products WHERE id = $1 AND team_id = $2', [productId, teamId])
  return result.rows.length > 0
}

// Pembuat order, atau owner/admin tim, yang boleh mengubah/menghapus.
// Order lama yang tidak punya pembuat (created_by kosong) cuma bisa oleh owner/admin.
function canModify(row, user) {
  if (user.role === 'owner' || user.role === 'admin') return true
  return !!row.created_by && row.created_by === user.id
}

async function replaceLinks(client, orderId, urls) {
  await client.query('DELETE FROM order_links WHERE order_id = $1', [orderId])
  const cleaned = (urls || []).map((u) => String(u).trim()).filter(Boolean)
  if (!cleaned.length) return
  // Satu INSERT untuk semua link; urutan dijaga lewat WITH ORDINALITY
  await client.query(
    `INSERT INTO order_links (order_id, url, position)
     SELECT $1, t.url, t.pos - 1 FROM unnest($2::text[]) WITH ORDINALITY AS t(url, pos)`,
    [orderId, cleaned]
  )
}

// GET /api/orders?search=&status=&mine=true&createdBy=<userId>&month=YYYY-MM&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { search, status, mine, month, createdBy } = req.query
    const params = [req.user.teamId]
    const where = ['o.team_id = $1']

    if (search) {
      // search_text sudah lowercase & ber-index trigram (lihat db.js). Karakter
      // wildcard dari user di-escape supaya "50%" dicari sebagai teks biasa.
      const term = `%${String(search).toLowerCase().replace(/[\\%_]/g, '\\$&')}%`
      params.push(term)
      const likeIdx = params.length
      // Nama designer ada di tabel users (bukan di search_text): cari dulu akun yang cocok di
      // tim ini (tabel kecil), lalu gabungkan lewat OR agar kedua sisi tetap memakai index.
      const found = await pool.query(
        `SELECT id FROM users WHERE team_id = $1 AND lower(coalesce(display_name, '') || ' ' || username) LIKE $2`,
        [req.user.teamId, term]
      )
      if (found.rows.length) {
        params.push(found.rows.map((r) => r.id))
        where.push(`(o.search_text LIKE $${likeIdx} OR o.designer_id = ANY($${params.length}::uuid[]))`)
      } else {
        where.push(`o.search_text LIKE $${likeIdx}`)
      }
    }
    if (status) {
      params.push(normalizeStatus(status))
      where.push(`o.status = $${params.length}`)
    }
    if (typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      // order_date >= awal bulan DAN < awal bulan berikutnya (memakai index order_date)
      params.push(`${month}-01`)
      where.push(`o.order_date >= $${params.length}::date AND o.order_date < $${params.length}::date + interval '1 month'`)
    }
    if (createdBy) {
      if (!isUuid(createdBy)) return res.status(400).json({ message: 'createdBy tidak valid' })
      params.push(createdBy)
      where.push(`o.created_by = $${params.length}`)
    }
    if (mine === 'true' || mine === '1') {
      params.push(req.user.id)
      where.push(`o.created_by = $${params.length}`)
    }

    const whereSql = `WHERE ${where.join(' AND ')}`
    const pagination = parsePagination(req.query)

    let limitSql = ''
    const queryParams = [...params]
    if (pagination) {
      queryParams.push(pagination.limit)
      limitSql += ` LIMIT $${queryParams.length}`
      queryParams.push(pagination.offset)
      limitSql += ` OFFSET $${queryParams.length}`
    }

    const result = await pool.query(
      `${SELECT_ORDER} ${whereSql} ORDER BY o.order_date DESC, o.created_at DESC${limitSql}`,
      queryParams
    )

    let meta = null
    if (pagination) {
      const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM orders o ${whereSql}`, params)
      meta = buildPaginationMeta(pagination, countResult.rows[0].total)
    }

    res.json({ data: result.rows.map(mapRow), pagination: meta })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data order', error: err.message })
  }
})

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`${SELECT_ORDER} WHERE o.id = $1 AND o.team_id = $2`, [req.params.id, req.user.teamId])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order tidak ditemukan' })
    }
    res.json({ data: mapRow(result.rows[0]) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil order', error: err.message })
  }
})

// POST /api/orders
router.post('/', validateBody(orderFieldsCreate), async (req, res) => {
  const b = req.body
  const title = trimOrNull(b.title) || null
  const buyerName = trimOrNull(b.buyerName) || null

  if (!title && !buyerName) {
    return res.status(400).json({ message: 'Judul atau nama pembeli/klien wajib diisi (minimal salah satu)' })
  }
  if (b.productId && !(await ownsProduct(b.productId, req.user.teamId))) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' })
  }
  if (b.designerId && !(await isTeamMember(b.designerId, req.user.teamId))) {
    return res.status(400).json({ message: 'Designer harus anggota tim ini' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO orders
        (team_id, created_by, product_id, image, title, buyer_name, buyer_reference, store_name,
         designer_id, category, character_type, style, package, production_status,
         order_date, completion_date, due_date, status, price, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
               COALESCE($15::date, CURRENT_DATE),$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        req.user.teamId, req.user.id, b.productId || null, b.image || null, title, buyerName,
        b.buyerReference || null, b.storeName || null, b.designerId || null, b.category || null,
        b.characterType || null, b.style || null, b.package || null, b.productionStatus || null,
        b.orderDate || null, b.completionDate || null, b.dueDate || null,
        normalizeStatus(b.status), b.price ?? 0, b.note || null,
      ]
    )
    const orderId = result.rows[0].id
    await replaceLinks(client, orderId, b.linkDbs)
    await client.query('COMMIT')

    const full = await pool.query(`${SELECT_ORDER} WHERE o.id = $1`, [orderId])
    res.status(201).json({ data: mapRow(full.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal menambah order', error: err.message })
  } finally {
    client.release()
  }
})

// PATCH /api/orders/:id — hanya field yang dikirim yang diubah.
// image / productId kosong atau null = dihapus.
router.patch('/:id', validateBody(orderFieldsUpdate), async (req, res) => {
  const b = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 AND team_id = $2 FOR UPDATE', [req.params.id, req.user.teamId])
    if (!existing.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Order tidak ditemukan' })
    }
    const current = existing.rows[0]
    if (!canModify(current, req.user)) {
      await client.query('ROLLBACK')
      return res.status(403).json({ message: 'Cuma pembuat order atau owner/admin tim yang bisa mengubah ini' })
    }

    // Constraint DB: harus tetap ada judul ATAU nama pembeli setelah diubah
    const nextTitle = b.title !== undefined ? (trimOrNull(b.title) || null) : current.title
    const nextBuyer = b.buyerName !== undefined ? (trimOrNull(b.buyerName) || null) : current.buyer_name
    if (!nextTitle && !nextBuyer) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Judul atau nama pembeli/klien wajib diisi (minimal salah satu)' })
    }
    if (b.productId && !(await ownsProduct(b.productId, req.user.teamId))) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Produk tidak ditemukan' })
    }

    if (b.designerId && !(await isTeamMember(b.designerId, req.user.teamId))) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Designer harus anggota tim ini' })
    }
    // Memilih designer dari akun = teks lama tidak diperlukan lagi (cegah data dobel)
    const input = b.designerId ? { ...b, designerLegacy: null } : b

    const { sets, values } = buildSet(input, {
      image: 'image',
      title: { col: 'title', map: trimOrNull },
      buyerName: { col: 'buyer_name', map: trimOrNull },
      buyerReference: 'buyer_reference',
      storeName: 'store_name',
      designerId: 'designer_id',
      designerLegacy: 'designer_name',
      category: 'category',
      characterType: 'character_type',
      style: 'style',
      package: 'package',
      productId: 'product_id',
      productionStatus: 'production_status',
      orderDate: { col: 'order_date', required: true },
      completionDate: 'completion_date',
      dueDate: 'due_date',
      status: { col: 'status', required: true, map: (v) => (v ? normalizeStatus(v) : null) },
      price: { col: 'price', required: true },
      note: 'note',
    })
    const idParam = values.length + 1
    await client.query(
      `UPDATE orders SET ${[...sets, 'updated_at = now()'].join(', ')}
       WHERE id = $${idParam} AND team_id = $${idParam + 1}`,
      [...values, req.params.id, req.user.teamId]
    )

    if (b.linkDbs !== undefined) {
      await replaceLinks(client, req.params.id, b.linkDbs)
    }
    await client.query('COMMIT')

    // Gambar diganti/dihapus -> file lama di bucket dibuang (best-effort, setelah data tersimpan)
    if (b.image !== undefined && current.image && current.image !== (b.image || null)) {
      await deleteImageByUrl(current.image, req.user.teamId)
    }

    const full = await pool.query(`${SELECT_ORDER} WHERE o.id = $1`, [req.params.id])
    res.json({ data: mapRow(full.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah order', error: err.message })
  } finally {
    client.release()
  }
})

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT created_by, image FROM orders WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Order tidak ditemukan' })
    }
    if (!canModify(existing.rows[0], req.user)) {
      return res.status(403).json({ message: 'Cuma pembuat order atau owner/admin tim yang bisa menghapus ini' })
    }

    await pool.query('DELETE FROM orders WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    await deleteImageByUrl(existing.rows[0].image, req.user.teamId)
    res.json({ message: 'Order berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus order', error: err.message })
  }
})

export default router

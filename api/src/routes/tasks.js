import { Router } from 'express'
import { pool } from '../config/db.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()

const taskFieldsCreate = {
  title: { required: true, type: 'string', min: 1, max: 255, label: 'Judul tugas' },
  clientName: { type: 'string', max: 150, label: 'Nama klien' },
  designer: { type: 'string', max: 150, label: 'Designer' },
  style: { type: 'string', max: 100, label: 'Kategori' },
  substyle: { type: 'string', max: 100, label: 'Substyle' },
  date: { type: 'date', label: 'Tanggal' },
  uploadDate: { type: 'date', label: 'Tanggal upload' },
  dueDate: { type: 'date', label: 'Tenggat' },
  productionStatus: { type: 'string', max: 100, label: 'Status produksi' },
  linkDbs: { type: 'array', itemType: 'string', label: 'Daftar link DB' },
  note: { type: 'string', max: 5000, label: 'Catatan' },
}

const taskFieldsUpdate = Object.fromEntries(
  Object.entries(taskFieldsCreate).map(([key, rule]) => [key, { ...rule, required: false }])
)

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

const SELECT_TASK = `
  SELECT
    t.*,
    u.username,
    COALESCE(
      (SELECT json_agg(json_build_object('id', l.id, 'url', l.url, 'position', l.position) ORDER BY l.position)
       FROM task_links l WHERE l.task_id = t.id),
      '[]'
    ) AS links
  FROM tasks t
  JOIN users u ON u.id = t.user_id
`

function mapRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username,
    image: r.image,
    title: r.title,
    clientName: r.client_name,
    designer: r.designer,
    style: r.style,
    substyle: r.substyle,
    date: r.date,
    uploadDate: r.upload_date,
    productionStatus: r.production_status,
    linkDbs: (r.links || []).map((l) => l.url),
    status: r.status,
    dueDate: r.due_date,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

async function replaceLinks(client, taskId, urls) {
  await client.query('DELETE FROM task_links WHERE task_id = $1', [taskId])
  const cleaned = (urls || []).filter(Boolean)
  for (let i = 0; i < cleaned.length; i++) {
    await client.query(
      'INSERT INTO task_links (task_id, url, position) VALUES ($1, $2, $3)',
      [taskId, cleaned[i], i]
    )
  }
}

// GET /api/tasks — semua tugas satu tim (kelihatan bareng, biar bisa dipantau/statistik)
router.get('/', async (req, res) => {
  try {
    const { status, userId } = req.query
    const where = ['t.team_id = $1']
    const params = [req.user.teamId]

    if (status) {
      params.push(normalizeStatus(status))
      where.push(`t.status = $${params.length}`)
    }
    if (userId) {
      params.push(userId)
      where.push(`t.user_id = $${params.length}`)
    }

    const result = await pool.query(
      `${SELECT_TASK} WHERE ${where.join(' AND ')} ORDER BY t.status = 'Done', t.due_date NULLS LAST, t.created_at DESC`,
      params
    )
    res.json({ data: result.rows.map(mapRow) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal mengambil data tugas', error: err.message })
  }
})

// POST /api/tasks — self-assign, selalu buat diri sendiri
router.post('/', validateBody(taskFieldsCreate), async (req, res) => {
  const {
    image, title, clientName, designer, style, substyle, date, uploadDate,
    productionStatus, linkDbs, status, dueDate, note,
  } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO tasks
        (team_id, user_id, image, title, client_name, designer, style, substyle, date, upload_date,
         production_status, status, due_date, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        req.user.teamId, req.user.id, image || null, title.trim(), clientName || null, designer || null,
        style || null, substyle || null, date || null, uploadDate || null,
        productionStatus || null, normalizeStatus(status), dueDate || null, note || null,
      ]
    )
    const taskId = result.rows[0].id
    await replaceLinks(client, taskId, linkDbs)

    await client.query('COMMIT')
    const full = await pool.query(`${SELECT_TASK} WHERE t.id = $1`, [taskId])
    res.status(201).json({ data: mapRow(full.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal menambah tugas', error: err.message })
  } finally {
    client.release()
  }
})

// PATCH /api/tasks/:id — pemilik tugas, atau owner/admin tim, boleh ubah
router.patch('/:id', validateBody(taskFieldsUpdate), async (req, res) => {
  const {
    image, title, clientName, designer, style, substyle, date, uploadDate,
    productionStatus, linkDbs, status, dueDate, note,
  } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT user_id FROM tasks WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    if (!existing.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Tugas tidak ditemukan' })
    }
    const isOwnerOfTask = existing.rows[0].user_id === req.user.id
    const isManager = req.user.role === 'owner' || req.user.role === 'admin'
    if (!isOwnerOfTask && !isManager) {
      await client.query('ROLLBACK')
      return res.status(403).json({ message: 'Cuma pemilik tugas atau owner/admin tim yang bisa mengubah ini' })
    }

    const result = await client.query(
      `UPDATE tasks SET
        image             = COALESCE($1, image),
        title             = COALESCE($2, title),
        client_name       = $3,
        designer          = $4,
        style             = $5,
        substyle          = $6,
        date              = $7,
        upload_date       = $8,
        production_status = $9,
        status            = COALESCE($10, status),
        due_date          = $11,
        note              = $12,
        updated_at        = now()
       WHERE id = $13 AND team_id = $14
       RETURNING id`,
      [
        image || null, title?.trim() || null,
        clientName !== undefined ? clientName : null,
        designer !== undefined ? designer : null,
        style !== undefined ? style : null,
        substyle !== undefined ? substyle : null,
        date !== undefined ? date : null,
        uploadDate !== undefined ? uploadDate : null,
        productionStatus !== undefined ? productionStatus : null,
        status ? normalizeStatus(status) : null,
        dueDate !== undefined ? dueDate : null,
        note !== undefined ? note : null,
        req.params.id,
        req.user.teamId,
      ]
    )

    if (linkDbs !== undefined) {
      await replaceLinks(client, req.params.id, linkDbs)
    }

    await client.query('COMMIT')
    const full = await pool.query(`${SELECT_TASK} WHERE t.id = $1`, [result.rows[0].id])
    res.json({ data: mapRow(full.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Gagal mengubah tugas', error: err.message })
  } finally {
    client.release()
  }
})

// DELETE /api/tasks/:id — pemilik tugas, atau owner/admin tim
router.delete('/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT user_id FROM tasks WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan' })
    }
    const isOwnerOfTask = existing.rows[0].user_id === req.user.id
    const isManager = req.user.role === 'owner' || req.user.role === 'admin'
    if (!isOwnerOfTask && !isManager) {
      return res.status(403).json({ message: 'Cuma pemilik tugas atau owner/admin tim yang bisa menghapus ini' })
    }

    await pool.query('DELETE FROM tasks WHERE id = $1 AND team_id = $2', [req.params.id, req.user.teamId])
    res.json({ message: 'Tugas berhasil dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus tugas', error: err.message })
  }
})

export default router

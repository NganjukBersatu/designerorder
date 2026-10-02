import { Router } from 'express'
import { isStorageConfigured, getImageObject } from '../config/storage.js'

const router = Router()

// Bucket Railway bersifat privat, jadi gambar dilayani lewat server ini:
//   S3_PUBLIC_URL = https://<domain-app>/api/files
// Hanya key buatan kita sendiri yang diterima: <teamId>/<kind>/<uuid>.<ext>.
// Format seketat ini mencegah path traversal dan penelusuran isi bucket.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const KEY_RE = new RegExp(`^${UUID}/(product|order|avatar)/${UUID}\\.(jpg|png|webp)$`, 'i')

// GET /api/files/<teamId>/<kind>/<uuid>.<ext>
router.get('/*', async (req, res) => {
  const key = req.params[0]
  if (!KEY_RE.test(key)) return res.status(404).end()
  if (!isStorageConfigured()) return res.status(503).end()

  try {
    const obj = await getImageObject(key, req.headers['if-none-match'])

    res.set({
      'Content-Type': obj.ContentType || 'application/octet-stream',
      // Nama file unik & tidak pernah ditimpa, jadi aman di-cache selamanya oleh browser
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(obj.ETag ? { ETag: obj.ETag } : {}),
      ...(obj.ContentLength ? { 'Content-Length': String(obj.ContentLength) } : {}),
    })

    obj.Body.on('error', () => res.destroy())
    obj.Body.pipe(res)
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode
    if (status === 304) return res.status(304).end()
    if (status === 404 || err?.name === 'NoSuchKey') return res.status(404).end()
    console.error('Gagal mengambil gambar dari bucket:', err?.message)
    res.status(502).end()
  }
})

export default router

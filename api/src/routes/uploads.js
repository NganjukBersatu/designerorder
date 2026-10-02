import { Router } from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { KINDS, isStorageConfigured, uploadImage } from '../config/storage.js'

const router = Router()

// Frontend sudah mengecilkan gambar (maks 640px) sebelum upload, jadi 2MB
// sudah sangat longgar. File ditahan di memori, tidak pernah ditulis ke disk.
const MAX_BYTES = 2 * 1024 * 1024
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } })

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak upload, coba lagi beberapa menit lagi' },
})

// POST /api/uploads?kind=product|task|avatar — multipart, field "file".
// Balasannya { url } yang kemudian dikirim ke endpoint produk/tugas/profil.
router.post('/', uploadLimiter, (req, res, next) => {
  if (!isStorageConfigured()) {
    return res.status(503).json({ message: 'Penyimpanan gambar belum dikonfigurasi di server' })
  }
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: `Ukuran gambar maksimal ${MAX_BYTES / 1024 / 1024}MB` })
      }
      return res.status(400).json({ message: 'Upload gagal', error: err.message })
    }

    const kind = String(req.query.kind || '')
    if (!KINDS.includes(kind)) {
      return res.status(400).json({ message: `kind harus salah satu dari: ${KINDS.join(', ')}` })
    }
    if (!req.file) {
      return res.status(400).json({ message: 'File gambar wajib diisi (field "file")' })
    }

    try {
      const url = await uploadImage({ teamId: req.user.teamId, kind, buffer: req.file.buffer })
      res.status(201).json({ url })
    } catch (e) {
      if (e.status) return res.status(e.status).json({ message: e.message })
      console.error(e)
      res.status(500).json({ message: 'Gagal mengunggah gambar', error: e.message })
    }
  })
})

export default router

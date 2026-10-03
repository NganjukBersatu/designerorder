import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { testConnection, ensureSchema } from './config/db.js'
import { requireAuth, requirePrivileged } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import teamRoutes from './routes/team.js'
import ordersRoutes from './routes/orders.js'
import dashboardRoutes from './routes/dashboard.js'
import productsRoutes from './routes/products.js'
import optionsRoutes from './routes/options.js'
import uploadsRoutes from './routes/uploads.js'
import filesRoutes from './routes/files.js'
import adminRoutes from './routes/admin.js'
import salesRoutes from './routes/sales.js'
import bundlesRoutes from './routes/bundles.js'
import currencyRoutes from './routes/currency.js'
import appSettingsRoutes from './routes/appSettings.js'
import { linkLegacyDesigners } from './utils/designers.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '1mb' })) // gambar diunggah lewat /api/uploads (multipart), bukan base64 di JSON

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'designer-orders-api' }))

app.use('/api/auth', authRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/orders', requireAuth, ordersRoutes)
app.use('/api/dashboard', requireAuth, dashboardRoutes)
app.use('/api/products', requireAuth, productsRoutes)
app.use('/api/options', requireAuth, optionsRoutes)
app.use('/api/uploads', requireAuth, uploadsRoutes)
app.use('/api/sales', requireAuth, salesRoutes)
app.use('/api/bundles', requireAuth, bundlesRoutes)
app.use('/api/currency', requireAuth, currencyRoutes)
app.use('/api/app-settings', requireAuth, appSettingsRoutes)
app.use('/api/admin', requireAuth, requirePrivileged, adminRoutes)
// Publik (tanpa login): tag <img> tidak bisa mengirim token. Key-nya UUID acak dan divalidasi ketat.
app.use('/api/files', filesRoutes)

// Sajikan frontend hasil build (web/dist) dari service yang sama, supaya
// deploy cukup 1 service app + 1 database. Dilewati kalau belum di-build (dev).
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

// 404 untuk endpoint yang tidak dikenal
app.use((req, res) => {
  res.status(404).json({ message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan` })
})

// Jaring pengaman terakhir untuk error yang tidak tertangkap di route/middleware
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: 'Terjadi kesalahan pada server', error: err.message })
})

app.listen(PORT, async () => {
  console.log(`Designer Orders API berjalan di http://localhost:${PORT}`)
  const connected = await testConnection()
  if (connected) {
    try {
      await ensureSchema()
      console.log('✅ Skema database siap digunakan')
      // Designer lama (teks) yang namanya cocok dengan akun otomatis ditautkan; tidak fatal kalau gagal.
      try {
        const linked = await linkLegacyDesigners()
        if (linked.orders || linked.products) {
          console.log(`✅ Designer lama ditautkan ke akun: ${linked.orders} order, ${linked.products} produk`)
        }
      } catch (linkErr) {
        console.error('⚠️  Gagal menautkan designer lama:', linkErr.message)
      }
    } catch (err) {
      console.error('❌', err.message)
      process.exit(1)
    }
  }
})
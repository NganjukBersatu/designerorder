import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { testConnection, ensureSchema } from './config/db.js'
import ordersRoutes from './routes/orders.js'
import dashboardRoutes from './routes/dashboard.js'
import productsRoutes from './routes/products.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '10mb' })) // dinaikkan supaya gambar base64 dari form tidak ditolak

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'designer-orders-api' }))

app.use('/api/orders', ordersRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/products', productsRoutes)

app.listen(PORT, async () => {
  console.log(`Designer Orders API berjalan di http://localhost:${PORT}`)
  const connected = await testConnection()
  if (connected) {
    await ensureSchema()
    console.log('✅ Tabel "orders", "products", "product_links", "sales" siap digunakan')
  }
})
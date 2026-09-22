import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { testConnection, ensureSchema } from './config/db.js'
import { requireAuth } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import teamRoutes from './routes/team.js'
import ordersRoutes from './routes/orders.js'
import dashboardRoutes from './routes/dashboard.js'
import productsRoutes from './routes/products.js'
import tasksRoutes from './routes/tasks.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '10mb' })) // dinaikkan supaya gambar base64 dari form tidak ditolak

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'designer-orders-api' }))

app.use('/api/auth', authRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/orders', requireAuth, ordersRoutes)
app.use('/api/dashboard', requireAuth, dashboardRoutes)
app.use('/api/products', requireAuth, productsRoutes)
app.use('/api/tasks', requireAuth, tasksRoutes)

app.listen(PORT, async () => {
  console.log(`Designer Orders API berjalan di http://localhost:${PORT}`)
  const connected = await testConnection()
  if (connected) {
    await ensureSchema()
    console.log('✅ Tabel "orders", "products", "product_links", "sales" siap digunakan')
  }
})
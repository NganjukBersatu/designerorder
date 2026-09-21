// src/composables/useProducts.js
// State dibuat di luar fungsi supaya dipakai bersama oleh halaman List & Detail.
import { ref } from 'vue'

// ========== DATA PRODUK ==========
const products = ref([
  {
    id: 1,
    name: 'Bunny knit Sweater Outfit',
    style: 'Casual',
    substyle: 'Daily outfit',
    designer: 'Reni',
    date: '2026-04-10T14:30',
    productionStatus: 'Preview',
    platform: 'Etsy & Booth',
    linkDb: '',
    price: 12,
    note: ''
  },
  {
    id: 2,
    name: 'Mocha Street Set',
    style: 'Casual',
    substyle: 'Daily outfit',
    designer: 'Reni',
    date: '2026-04-15T09:00',
    productionStatus: 'Preview',
    platform: 'Booth',
    linkDb: '',
    price: 9,
    note: ''
  }
])

// ========== DATA PENJUALAN (riwayat pembeli) ==========
// Data di bawah hanya contoh — ganti dengan data asli / dari API.
const sales = ref([
  { id: 1, productId: 1, buyer: 'Sakura Lin', qty: 1, platform: 'Etsy', soldAt: '2026-04-12T10:15' },
  { id: 2, productId: 1, buyer: 'Mika_Rose', qty: 1, platform: 'Booth', soldAt: '2026-04-14T20:42' },
  { id: 3, productId: 2, buyer: 'Nadia Putri', qty: 1, platform: 'Booth', soldAt: '2026-04-18T08:05' }
])

let nextProductId = 3
let nextSaleId = 4

// ========== HELPER FORMAT ==========
export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatPrice(n) {
  const num = Number(n) || 0
  return `$${Number.isInteger(num) ? num : num.toFixed(2)}`
}

// Pastikan link diawali https:// supaya bisa dibuka (mis. link Dropbox)
export function normalizeUrl(url) {
  const u = (url || '').trim()
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

// Nilai awal untuk input datetime-local (waktu lokal sekarang)
export function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// ========== COMPOSABLE ==========
export function useProducts() {
  function getProduct(id) {
    return products.value.find(p => p.id === Number(id)) || null
  }

  function addProduct(data) {
    products.value.push({ id: nextProductId++, ...data })
  }

  function updateProduct(id, data) {
    const index = products.value.findIndex(p => p.id === id)
    if (index !== -1) {
      products.value[index] = { ...products.value[index], ...data }
    }
  }

  function removeProduct(id) {
    products.value = products.value.filter(p => p.id !== id)
    // hapus juga riwayat penjualannya
    sales.value = sales.value.filter(s => s.productId !== id)
  }

  // Riwayat penjualan satu produk, terbaru di atas
  function salesOf(productId) {
    return sales.value
      .filter(s => s.productId === Number(productId))
      .sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt))
  }

  // Total unit terjual = jumlah qty dari semua transaksi
  function totalSold(productId) {
    return salesOf(productId).reduce((sum, s) => sum + (Number(s.qty) || 0), 0)
  }

  function isSold(productId) {
    return totalSold(productId) > 0
  }

  function addSale(productId, data) {
    sales.value.push({ id: nextSaleId++, productId: Number(productId), ...data })
  }

  function removeSale(saleId) {
    sales.value = sales.value.filter(s => s.id !== saleId)
  }

  return {
    products,
    sales,
    getProduct,
    addProduct,
    updateProduct,
    removeProduct,
    salesOf,
    totalSold,
    isSold,
    addSale,
    removeSale
  }
}
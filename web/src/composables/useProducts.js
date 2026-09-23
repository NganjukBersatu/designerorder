// src/composables/useProducts.js
// State dibuat di luar fungsi supaya dipakai bersama oleh halaman List & Detail.
// Sekarang data diambil dari API (bukan disimpan di memory lagi), jadi tidak
// hilang saat halaman di-refresh.
import { ref } from 'vue'
import { getToken, setToken } from '../utils/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const products = ref([])
const sales = ref([])
const loading = ref(false)
const error = ref(null)

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  if (res.status === 401) {
    setToken('')
    if (!location.pathname.startsWith('/login')) location.href = '/login'
  }
  if (!res.ok) {
    throw new Error(body.message || 'Terjadi kesalahan pada server')
  }
  return body.data
}

// Susun ulang `sales` global dari data yang sudah nempel di tiap produk
// (backend mengirim sales sebagai bagian dari respons produk).
function flattenSales(productList) {
  const all = []
  for (const p of productList) {
    for (const s of p.sales || []) all.push(s)
  }
  return all
}

// ========== FETCH ==========
export async function fetchProducts() {
  loading.value = true
  error.value = null
  try {
    const data = await request('/products')
    products.value = data
    sales.value = flattenSales(data)
  } catch (err) {
    error.value = err.message
    console.error('Gagal memuat produk:', err.message)
  } finally {
    loading.value = false
  }
}

// Muat otomatis begitu composable ini pertama kali dipakai, tapi cuma kalau
// sudah ada token (mis. refresh halaman waktu masih login). Kalau belum
// login, useAuth yang akan memanggil fetchProducts() setelah login sukses.
if (getToken()) fetchProducts()

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

  async function addProduct(data) {
    await request('/products', { method: 'POST', body: JSON.stringify(data) })
    await fetchProducts()
  }

  async function updateProduct(id, data) {
    await request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    await fetchProducts()
  }

  async function removeProduct(id) {
    await request(`/products/${id}`, { method: 'DELETE' })
    await fetchProducts()
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

  async function addSale(productId, data) {
    await request(`/products/${productId}/sales`, { method: 'POST', body: JSON.stringify(data) })
    await fetchProducts()
  }

  async function removeSale(saleId, productId) {
    // productId dibutuhkan karena endpoint di-nest di bawah /products/:id/sales/:saleId
    const pid = productId ?? sales.value.find(s => s.id === saleId)?.productId
    await request(`/products/${pid}/sales/${saleId}`, { method: 'DELETE' })
    await fetchProducts()
  }

  return {
    products,
    sales,
    loading,
    error,
    fetchProducts,
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
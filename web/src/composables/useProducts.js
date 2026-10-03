// src/composables/useProducts.js
// State dibuat di luar fungsi supaya dipakai bersama oleh halaman List & Detail.
// Sekarang data diambil dari API (bukan disimpan di memory lagi), jadi tidak
// hilang saat halaman di-refresh.
import { ref } from 'vue'
import { API_BASE, getToken, setToken } from '../utils/api.js'

const products = ref([])
const salesByProduct = ref({}) // { [productId]: penjualan produk itu } — dimuat per produk (halaman detail)
const loading = ref(false)
const error = ref(null)

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const body = await res.json().catch(() => ({}))

  if (res.status === 401) {
    setToken(null)
    throw new Error(body.message || 'Sesi berakhir, silakan login lagi')
  }

  if (!res.ok) {
    throw new Error(body.message || 'Terjadi kesalahan pada server')
  }
  return body.data
}

// Daftar produk tidak membawa isi penjualan (hanya agregat: soldQty, salesCount) supaya
// responsnya tidak membengkak. Isi penjualan SATU produk dimuat dari GET /products/:id
// saat halaman detailnya dibuka.
async function loadSales(productId) {
  const data = await request(`/products/${productId}`)
  salesByProduct.value = { ...salesByProduct.value, [productId]: data.sales || [] }
}

// ========== FETCH ==========
export async function fetchProducts() {
  loading.value = true
  error.value = null
  try {
    const data = await request('/products')
    products.value = data
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

// Format harga dalam mata uangnya sendiri (default USD seperti sebelumnya: "$10" / "$10.50").
// IDR, JPY, dan KRW tanpa pecahan.
const NO_DECIMALS = ['IDR', 'JPY', 'KRW']
export function formatPrice(n, currency = 'USD') {
  const num = Number(n) || 0
  const digits = NO_DECIMALS.includes(currency) ? 0 : Number.isInteger(num) ? 0 : 2
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num)
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
  return products.value.find(p => String(p.id) === String(id)) || null
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
  return salesByProduct.value[productId] || []
}

  // Total unit terjual: agregat dari server (soldQty), bukan dijumlah di browser
  function totalSold(productId) {
    return getProduct(productId)?.soldQty || 0
  }

  // Cari produk pemilik sebuah penjualan (untuk pemanggil yang tidak menyebut productId)
  function productIdOfSale(saleId) {
    for (const [pid, list] of Object.entries(salesByProduct.value)) {
      if (list.some(s => s.id === saleId)) return pid
    }
    return undefined
  }

  function isSold(productId) {
    return totalSold(productId) > 0
  }

  async function addSale(productId, data) {
    await request(`/products/${productId}/sales`, { method: 'POST', body: JSON.stringify(data) })
    await Promise.all([fetchProducts(), loadSales(productId)])
  }

  async function removeSale(saleId, productId) {
    // productId dibutuhkan karena endpoint di-nest di bawah /products/:id/sales/:saleId
    const pid = productId ?? productIdOfSale(saleId)
    await request(`/products/${pid}/sales/${saleId}`, { method: 'DELETE' })
    await Promise.all([fetchProducts(), loadSales(pid)])
  }

  async function updateSale(saleId, data, productId) {
    // productId dibutuhkan karena endpoint di-nest di bawah /products/:id/sales/:saleId
    const pid = productId ?? productIdOfSale(saleId)
    await request(`/products/${pid}/sales/${saleId}`, { method: 'PATCH', body: JSON.stringify(data) })
    await Promise.all([fetchProducts(), loadSales(pid)])
  }

  return {
    products,
    loadSales,
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
    removeSale,
    updateSale
  }
}
// src/composables/useProducts.js
// State dibuat di luar fungsi supaya dipakai bersama oleh halaman List & Detail.
// Sekarang data diambil dari API (bukan disimpan di memory lagi), jadi tidak
// hilang saat halaman di-refresh.
import { ref } from 'vue'
import { API_BASE, getToken, setToken, api } from '../utils/api.js'
import { invalidateProducts } from './useProductOverview.js'

// Cache produk yang pernah dimuat (halaman daftar, detail, picker). BUKAN seluruh produk tim:
// angka agregat ada di useProductOverview, dan daftar diambil per halaman lewat fetchProductPage.
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

// Simpan/ganti produk di cache berdasarkan id (urutan dan produk lain tidak berubah)
function upsertProducts(list) {
  const next = [...products.value]
  for (const item of list) {
    const i = next.findIndex((p) => p.id === item.id)
    if (i === -1) next.push(item)
    else next[i] = item
  }
  products.value = next
}

// Detail SATU produk beserta riwayat penjualannya (GET /products/:id). Daftar produk hanya
// membawa agregat (soldQty, salesCount), jadi halaman detail memanggil ini.
async function loadSales(productId) {
  const data = await request(`/products/${productId}`)
  upsertProducts([data])
  salesByProduct.value = { ...salesByProduct.value, [productId]: data.sales || [] }
  return data
}

// ========== FETCH ==========
// Satu halaman produk dengan filter di server. params: style, substyle, productionStatus, platform,
// designer, currency, sold ('sold' | 'unsold'), search, page, limit. Hasilnya masuk cache supaya
// getProduct()/totalSold() langsung bisa dipakai untuk baris-baris itu.
export async function fetchProductPage(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v)
  }
  const body = await api.get(`/products?${qs}`)
  upsertProducts(body.data || [])
  return { data: body.data || [], pagination: body.pagination }
}

// Kosongkan cache saat logout supaya data tim sebelumnya tidak terlihat oleh akun berikutnya
export function clearProducts() {
  products.value = []
  salesByProduct.value = {}
}

// Dipanggil setelah login dan setelah tiap perubahan data produk. TIDAK lagi memuat semua produk:
// hanya menyegarkan ringkasan dan memberi tahu halaman yang terbuka agar memuat ulang halamannya.
export function fetchProducts() {
  return invalidateProducts()
}

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
    await fetchProducts()
  }

  async function removeSale(saleId, productId) {
    // productId dibutuhkan karena endpoint di-nest di bawah /products/:id/sales/:saleId
    const pid = productId ?? productIdOfSale(saleId)
    await request(`/products/${pid}/sales/${saleId}`, { method: 'DELETE' })
    await fetchProducts()
  }

  async function updateSale(saleId, data, productId) {
    // productId dibutuhkan karena endpoint di-nest di bawah /products/:id/sales/:saleId
    const pid = productId ?? productIdOfSale(saleId)
    await request(`/products/${pid}/sales/${saleId}`, { method: 'PATCH', body: JSON.stringify(data) })
    await fetchProducts()
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
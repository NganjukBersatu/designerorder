// Ringkasan seluruh produk & bundling tim dari satu endpoint (GET /products/overview).
// Dipakai sidebar, halaman Kategori, Ringkasan Penjualan, dan pilihan dropdown di form —
// jadi tak satu pun dari mereka perlu memuat daftar produk lengkap. Daftar produk sendiri
// diambil per halaman (lihat fetchProductPage di useProducts).
import { ref, computed } from 'vue'
import { api, getToken } from '../utils/api.js'

const overview = ref(null)
const loading = ref(false)

// Naik setiap kali data produk/bundling berubah (tambah, ubah, hapus, catat penjualan).
// Halaman yang menampilkan daftar/detail memantau ini lalu memuat ulang datanya sendiri.
export const productsVersion = ref(0)

let inflight = null
let dirty = false

export function fetchOverview() {
  if (inflight) {
    dirty = true // ada perubahan saat request berjalan: ulangi sekali lagi setelah selesai
    return inflight
  }
  loading.value = true
  inflight = api
    .get('/products/overview')
    .then((res) => {
      overview.value = res.data
    })
    .catch((err) => console.error('Gagal memuat ringkasan produk:', err.message))
    .finally(() => {
      loading.value = false
      inflight = null
      if (dirty) {
        dirty = false
        fetchOverview()
      }
    })
  return inflight
}

// Dipanggil setelah data produk/bundling berubah
export function invalidateProducts() {
  productsVersion.value++
  return fetchOverview()
}

export function resetOverview() {
  overview.value = null
}

if (getToken()) fetchOverview()

export function useProductOverview() {
  const styles = computed(() => overview.value?.styles || [])
  const totals = computed(() => overview.value?.totals || { count: 0, sold: 0, units: 0, transactions: 0 })
  const styleOf = (name) => styles.value.find((s) => s.style === name) || null

  return {
    overview,
    loading,
    totals,
    styles, // [{ style, count, units, revenue: { USD: n }, substyles, thumbs }] ('' = tanpa kategori)
    styleNames: computed(() => styles.value.map((s) => s.style).filter(Boolean).sort()),
    uncategorizedCount: computed(() => styleOf('')?.count || 0),
    topProducts: computed(() => overview.value?.topProducts || []),
    substyles: computed(() => overview.value?.substyles || []),
    productionStatuses: computed(() => overview.value?.productionStatuses || []),
    styleOf,
    fetchOverview,
  }
}

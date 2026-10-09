// State dibagi bersama (di luar fungsi) seperti useProducts, jadi halaman Kategori, Detail
// Bundling, dan Ringkasan melihat data yang sama.
import { ref } from 'vue'
import { api } from '../utils/api.js'
import { invalidateProducts } from './useProductOverview.js'

// Bundling dimuat PER KATEGORI (halaman Kategori), bukan semuanya sekaligus. Angka agregat
// bundling (jumlah, unit terjual, nilai) ada di useProductOverview.
const bundles = ref([])
const loading = ref(false)
let currentStyle = ''

export async function fetchBundles(style = currentStyle) {
  currentStyle = style || ''
  if (!currentStyle) {
    bundles.value = []
    return
  }
  loading.value = true
  try {
    const res = await api.get(`/bundles?style=${encodeURIComponent(currentStyle)}`)
    bundles.value = res.data || []
  } catch (err) {
    console.error('Gagal memuat bundling:', err.message)
  } finally {
    loading.value = false
  }
}

export function useBundles() {
  const getBundle = (id) => bundles.value.find((b) => String(b.id) === String(id)) || null
  const bundlesOf = (style) => bundles.value.filter((b) => (b.style || '').trim() === style)

  // Membuat/mengubah/menghapus bundling mengubah daftar produk satuan juga
  // (produk yang masuk bundling hilang dari daftar satuan), jadi keduanya dimuat ulang.
  const refresh = () => Promise.all([fetchBundles(), invalidateProducts()])

  async function addBundle(data) {
    const res = await api.post('/bundles', data)
    await refresh()
    return res.data
  }
  async function updateBundle(id, data) {
    const res = await api.patch(`/bundles/${id}`, data)
    await refresh()
    return res.data
  }
  async function removeBundle(id) {
    await api.delete(`/bundles/${id}`)
    await refresh()
  }
  async function loadBundle(id) {
    const res = await api.get(`/bundles/${id}`)
    return res.data
  }
  // Penjualan bundling mengubah agregat (unit terjual) di ringkasan, jadi ringkasan ikut disegarkan
  const afterSale = () => Promise.all([fetchBundles(), invalidateProducts()])
  const addSale = (id, data) => api.post(`/bundles/${id}/sales`, data).then(afterSale)
  const updateSale = (id, saleId, data) => api.patch(`/bundles/${id}/sales/${saleId}`, data).then(afterSale)
  const removeSale = (id, saleId) => api.delete(`/bundles/${id}/sales/${saleId}`).then(afterSale)

  return { bundles, loading, getBundle, bundlesOf, addBundle, updateBundle, removeBundle, loadBundle, addSale, updateSale, removeSale, fetchBundles }
}

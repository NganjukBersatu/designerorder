// State dibagi bersama (di luar fungsi) seperti useProducts, jadi halaman Kategori, Detail
// Bundling, dan Ringkasan melihat data yang sama.
import { ref } from 'vue'
import { api, getToken } from '../utils/api.js'
import { fetchProducts } from './useProducts.js'

const bundles = ref([])
const loading = ref(false)

export async function fetchBundles() {
  loading.value = true
  try {
    const res = await api.get('/bundles')
    bundles.value = res.data || []
  } catch (err) {
    console.error('Gagal memuat bundling:', err.message)
  } finally {
    loading.value = false
  }
}

if (getToken()) fetchBundles()

export function useBundles() {
  const getBundle = (id) => bundles.value.find((b) => String(b.id) === String(id)) || null
  const bundlesOf = (style) => bundles.value.filter((b) => (b.style || '').trim() === style)

  // Membuat/mengubah/menghapus bundling mengubah daftar produk satuan juga
  // (produk yang masuk bundling hilang dari daftar satuan), jadi keduanya dimuat ulang.
  const refresh = () => Promise.all([fetchBundles(), fetchProducts()])

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
  const addSale = (id, data) => api.post(`/bundles/${id}/sales`, data).then(fetchBundles)
  const updateSale = (id, saleId, data) => api.patch(`/bundles/${id}/sales/${saleId}`, data).then(fetchBundles)
  const removeSale = (id, saleId) => api.delete(`/bundles/${id}/sales/${saleId}`).then(fetchBundles)

  return { bundles, loading, getBundle, bundlesOf, addBundle, updateBundle, removeBundle, loadBundle, addSale, updateSale, removeSale, fetchBundles }
}

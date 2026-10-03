<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../utils/api.js'
import { formatDateTime, formatPrice } from '../composables/useProducts'

const route = useRoute()
const router = useRouter()

const sale = ref(null)
const loading = ref(true)
const errorMsg = ref('')

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.get(`/products/${route.params.id}/sales/${route.params.saleId}`)
    sale.value = res.data
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

// Total yang tersimpan; kalau kosong, hitung dari harga produk x jumlah (sama seperti tabel penjualan)
const total = computed(() => {
  const s = sale.value
  if (!s) return 0
  return s.total !== null ? s.total : (s.product.price || 0) * s.qty
})

const fields = computed(() => {
  const s = sale.value
  if (!s) return []
  return [
    { label: 'Pembeli', value: s.buyer },
    { label: 'Paket', value: s.package || 'Satuan' },
    { label: 'Jumlah', value: String(s.qty) },
    { label: 'Platform', value: s.platform },
    { label: 'Tanggal jual', value: formatDateTime(s.soldAt) },
    { label: 'Dicatat', value: formatDateTime(s.createdAt) },
  ]
})
</script>

<template>
  <div class="space-y-4">
    <button class="text-[13px] text-ink-500 hover:text-ink-700 flex items-center gap-1.5" @click="router.push(`/produk/${route.params.id}`)">
      ← Kembali ke detail produk
    </button>

    <div v-if="loading" class="h-48 rounded-card bg-white shadow-card animate-pulse" />
    <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
      <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
      <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
    </div>

    <template v-else-if="sale">
      <div class="bg-white rounded-card shadow-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div class="min-w-0">
          <p class="text-[12px] text-ink-400">Penjualan #{{ sale.id.slice(0, 8) }}</p>
          <h1 class="text-[19px] font-semibold text-ink-900 break-words">{{ sale.buyer }}</h1>
          <p class="text-[13px] text-ink-500">{{ sale.product.name }}</p>
        </div>
        <p class="text-[24px] font-semibold text-ink-900">{{ formatPrice(total) }}</p>
      </div>

      <div class="fx-grid [--fx-min:20rem] gap-4 items-start">
        <div class="fx-2 bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Detail penjualan</h2>
          <dl class="fx-grid [--fx-min:16rem] gap-x-6 gap-y-3 text-[13px]">
            <div v-for="f in fields" :key="f.label" class="flex justify-between gap-3 border-b border-ink-50 pb-2">
              <dt class="text-ink-400">{{ f.label }}</dt>
              <dd class="font-medium text-ink-800 text-right break-words">{{ f.value || '—' }}</dd>
            </div>
          </dl>
          <p class="mt-5 text-[12px] text-ink-400">
            Untuk mengubah atau menghapus transaksi ini, buka halaman detail produk.
          </p>
        </div>

        <div class="bg-white rounded-card shadow-card p-5">
          <p class="text-[12px] text-ink-400 mb-3">Produk</p>
          <router-link :to="`/produk/${sale.product.id}`" class="block group">
            <img v-if="sale.product.image" :src="sale.product.image" :alt="sale.product.name" class="w-full rounded-xl border border-ink-100 object-cover" />
            <div v-else class="w-full aspect-square rounded-xl border border-dashed border-ink-200 bg-cream-100 flex items-center justify-center text-[12px] text-ink-300">
              Belum ada gambar
            </div>
            <p class="mt-3 text-[14px] font-medium text-ink-800 group-hover:text-brand-600 transition">{{ sale.product.name }} →</p>
          </router-link>
        </div>
      </div>
    </template>
  </div>
</template>

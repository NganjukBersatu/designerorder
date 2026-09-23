<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../utils/api.js'
import { amount, monthLabel } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.vue'
import { useProducts, formatDateTime, formatPrice } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'

// ========== PESANAN (data dari API) ==========
const loading = ref(true)
const errorMsg = ref('')
const summary = ref(null)

// ========== BULAN YANG DIPILIH ==========
// PENYESUAIAN: ganti nama parameter 'month' di bawah kalau backend kamu
// mengharapkan nama query yang berbeda untuk memfilter /dashboard/summary.
const pad = (n) => String(n).padStart(2, '0')
const currentMonthKey = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
})()
const selectedMonth = ref(currentMonthKey)
const isCurrentMonth = computed(() => selectedMonth.value === currentMonthKey)

function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
function setMonth(key) {
  if (!/^\d{4}-\d{2}$/.test(key)) return
  selectedMonth.value = key
  load()
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    summary.value = await api.get(`/dashboard/summary?month=${selectedMonth.value}`)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ========== PRODUK & PENJUALAN (data dari useProducts) ==========
const { products, sales, getProduct, totalSold, isSold } = useProducts()

// Nama field gambar produk. Sesuaikan urutannya kalau field di API/data kamu berbeda.
const PRODUCT_IMAGE_KEYS = ['image', 'imageUrl', 'photo', 'thumbnail', 'coverImage']
function productImage(p) {
  for (const k of PRODUCT_IMAGE_KEYS) if (p?.[k]) return p[k]
  return null
}

const totalProducts = computed(() => products.value.length)
const soldProducts = computed(() => products.value.filter((p) => isSold(p.id)).length)
const unsoldProducts = computed(() => totalProducts.value - soldProducts.value)

// Hanya hitung penjualan yang produknya masih ada
const validSales = computed(() =>
  sales.value
    .map((s) => ({ ...s, product: getProduct(s.productId) }))
    .filter((s) => s.product)
)

const totalUnits = computed(() =>
  validSales.value.reduce((sum, s) => sum + (Number(s.qty) || 0), 0)
)

// 5 produk dengan unit terjual terbanyak
const topProducts = computed(() =>
  products.value
    .map((p) => {
      const units = totalSold(p.id)
      return { id: p.id, name: p.name, image: productImage(p), units, revenue: units * (p.price || 0) }
    })
    .filter((p) => p.units > 0)
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 5)
)

const maxUnits = computed(() => Math.max(...topProducts.value.map((p) => p.units), 1))

// Ringkasan per kategori (dulu ada di halaman Detail Kategori, dipindah ke sini)
const { optionsOf } = useOptions()

const categoryStats = computed(() => {
  const names = new Set(optionsOf('style'))
  for (const p of products.value) {
    const s = (p.style || '').trim()
    if (s) names.add(s)
  }

  return [...names].map((name) => {
    const items = products.value.filter((p) => (p.style || '').trim() === name)
    const units = items.reduce((sum, p) => sum + totalSold(p.id), 0)
    const revenue = items.reduce((sum, p) => sum + totalSold(p.id) * (p.price || 0), 0)
    return { name, count: items.length, units, revenue }
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

// 6 penjualan terbaru dari semua produk
const recentSales = computed(() =>
  [...validSales.value]
    .sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt))
    .slice(0, 6)
)

// ========== EKSPOR (CSV & Cetak) ==========
function monthKeyOf(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

// Penjualan produk pada bulan yang sedang dipilih (data lengkap, dari useProducts)
const monthSales = computed(() =>
  validSales.value
    .filter((s) => monthKeyOf(s.soldAt) === selectedMonth.value)
    .sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt))
)

const saleValue = (s) => (s.product.price || 0) * (Number(s.qty) || 0)

function downloadCsv() {
  const rows = [['Jenis', 'Tanggal', 'Nama', 'Keterangan', 'Jumlah', 'Nilai', 'Status / Platform']]

  // Pesanan terbaru yang tersedia dari ringkasan (bukan daftar penuh per bulan;
  // untuk laporan lengkap per bulan gunakan halaman Laporan)
  for (const o of summary?.value?.recentOrders || []) {
    rows.push([
      'Pesanan desain',
      formatDateTime(o.createdAt || o.orderDate || o.date),
      o.buyerName || '',
      [o.category, o.characterType].filter(Boolean).join(' / '),
      1,
      o.price || 0,
      o.status || '',
    ])
  }
  for (const s of monthSales.value) {
    rows.push([
      'Penjualan produk',
      formatDateTime(s.soldAt),
      s.buyer,
      `${s.product.name} (${s.package || 'Satuan'})`,
      s.qty,
      saleValue(s),
      s.platform || '',
    ])
  }

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '\ufeff' + rows.map((r) => r.map(escape).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `ringkasan-${selectedMonth.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="space-y-8">
    <!-- ==================== TOOLBAR BULAN & EKSPOR (tidak ikut dicetak) ==================== -->
    <div class="print-hidden bg-white rounded-card shadow-card border border-ink-100 p-4 flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="setMonth(shiftMonth(selectedMonth, -1))"
          class="w-10 h-10 flex items-center justify-center rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 transition"
          aria-label="Bulan sebelumnya"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
        </button>

        <input
          type="month"
          :value="selectedMonth"
          @change="setMonth($event.target.value)"
          class="px-3 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm"
          aria-label="Pilih bulan ringkasan"
        />

        <button
          type="button"
          @click="setMonth(shiftMonth(selectedMonth, 1))"
          class="w-10 h-10 flex items-center justify-center rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 transition"
          aria-label="Bulan berikutnya"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          v-if="!isCurrentMonth"
          type="button"
          @click="setMonth(currentMonthKey)"
          class="px-3 py-2.5 rounded-xl text-sm font-medium text-brand-600 hover:bg-ink-50 transition"
        >
          Bulan ini
        </button>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          @click="downloadCsv"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm font-medium transition"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
          Unduh CSV
        </button>
        <button
          type="button"
          @click="printReport"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v7H6z" /></svg>
          Cetak / Simpan PDF
        </button>
      </div>
    </div>

    <!-- ==================== AKSI CEPAT ==================== -->
    <div class="flex flex-wrap items-center gap-2.5">
      <router-link
        to="/orders"
        class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-medium transition shadow-sm"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        Pesanan baru
      </router-link>
      <router-link
        to="/kategori"
        class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-[13px] font-medium transition"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        Tambah produk
      </router-link>
    </div>

    <!-- ==================== PESANAN DESAIN ==================== -->
    <section class="space-y-6">
      <h2 class="text-[13px] font-medium text-ink-500">Pesanan desain</h2>

      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-24 rounded-card bg-white shadow-card animate-pulse" />
      </div>

      <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
        <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
        <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
      </div>

      <template v-else-if="summary">
        <!-- Kartu statistik -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-card shadow-card p-4">
            <p class="text-[12px] text-ink-400">Total pesanan</p>
            <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ summary.totalOrders }}</p>
          </div>
          <div class="bg-white rounded-card shadow-card p-4">
            <p class="text-[12px] text-ink-400">Pendapatan total</p>
            <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ amount(summary.totalRevenue) }}</p>
          </div>
          <div class="bg-white rounded-card shadow-card p-4">
            <p class="text-[12px] text-ink-400">Sedang dikerjakan</p>
            <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ summary.progressOrders }}</p>
            <p class="text-[11px] text-ink-400 mt-0.5">{{ summary.pendingOrders }} masih menunggu</p>
          </div>
          <div class="bg-white rounded-card shadow-card p-4">
            <p class="text-[12px] text-ink-400">Pendapatan bulan ini</p>
            <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ amount(summary.monthRevenue) }}</p>
          </div>
        </div>

        <!-- Status pesanan -->
        <div class="bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Status pesanan</h2>

          <!-- Empty state: belum ada pesanan sama sekali -->
          <div v-if="summary.totalOrders === 0" class="flex flex-col items-center text-center py-8">
            <div class="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
            </div>
            <p class="text-[13.5px] font-medium text-ink-700">Belum ada pesanan</p>
            <p class="text-[12px] text-ink-400 mt-1 max-w-[240px]">Status pesanan akan muncul di sini setelah kamu menambahkan pesanan pertama.</p>
            <router-link
              to="/orders"
              class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[12.5px] font-medium transition"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Tambah pesanan
            </router-link>
          </div>

          <div v-else class="space-y-3">
            <div v-for="row in [
              { status: 'Pending', count: summary.pendingOrders },
              { status: 'Progress', count: summary.progressOrders },
              { status: 'Done', count: summary.doneOrders },
            ]" :key="row.status" class="flex items-center gap-3">
              <StatusBadge :status="row.status" class="w-24 justify-center" />
              <div class="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                <div
                  class="h-full bg-brand-500 rounded-full"
                  :style="{ width: `${summary.totalOrders ? Math.round((row.count / summary.totalOrders) * 100) : 0}%` }"
                />
              </div>
              <span class="text-[12px] text-ink-500 w-16 text-right">{{ row.count }} / {{ summary.totalOrders }}</span>
            </div>
          </div>
        </div>

        <!-- Pendapatan per bulan -->
        <div class="bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Pendapatan per bulan</h2>

          <!-- Empty state -->
          <div v-if="summary.monthlyRevenue.length === 0 || summary.totalRevenue === 0" class="flex flex-col items-center text-center py-10">
            <div class="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 15l4-4 3 3 5-6" />
              </svg>
            </div>
            <p class="text-[13.5px] font-medium text-ink-700">Belum ada data pendapatan</p>
            <p class="text-[12px] text-ink-400 mt-1 max-w-[260px]">Grafik akan mulai terisi begitu ada pesanan dengan pendapatan tercatat.</p>
          </div>

          <div v-else class="flex items-end gap-2 h-40">
            <div
              v-for="m in summary.monthlyRevenue"
              :key="m.month"
              class="flex-1 flex flex-col items-center justify-end gap-1.5"
            >
              <div
                class="w-full bg-brand-400 rounded-t-md hover:bg-brand-500 transition"
                :style="{
                  height: `${Math.max((m.revenue / Math.max(...summary.monthlyRevenue.map((x) => x.revenue), 1)) * 100, m.revenue > 0 ? 4 : 0)}%`,
                }"
                :title="amount(m.revenue)"
              />
              <span class="text-[10px] text-ink-400">{{ monthLabel(m.month) }}</span>
            </div>
          </div>
        </div>

        <!-- Performa kategori -->
        <div v-if="summary.categoryPerformance.length" class="bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Performa kategori bulan ini</h2>
          <div class="space-y-3">
            <div v-for="c in summary.categoryPerformance" :key="c.category">
              <div class="flex items-center justify-between text-[13px] mb-1">
                <span class="font-medium text-ink-800">{{ c.category }}</span>
                <span
                  :class="c.changePercent > 0 ? 'text-ok-600' : c.changePercent < 0 ? 'text-danger-600' : 'text-ink-400'"
                >
                  {{ c.changePercent > 0 ? '↑' : c.changePercent < 0 ? '↓' : '→' }} {{ c.changePercent }}%
                </span>
              </div>
              <div class="flex items-center justify-between text-[12px] text-ink-400">
                <span>{{ c.orders }} order aktif</span>
                <span>{{ amount(c.revenue) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pesanan terbaru -->
        <div class="bg-white rounded-card shadow-card p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[15px] font-semibold text-ink-900">Pesanan terbaru</h2>
            <router-link
              v-if="summary.recentOrders.length"
              to="/orders"
              class="text-[13px] text-brand-500 hover:text-brand-600 font-medium"
            >
              Lihat semua →
            </router-link>
          </div>

          <!-- Empty state -->
          <div v-if="summary.recentOrders.length === 0" class="flex flex-col items-center text-center py-10">
            <div class="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <p class="text-[13.5px] font-medium text-ink-700">Belum ada pesanan</p>
            <p class="text-[12px] text-ink-400 mt-1 max-w-[260px]">Pesanan yang masuk akan tampil di sini. Yuk tambahkan pesanan pertamamu.</p>
            <router-link
              to="/orders"
              class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[12.5px] font-medium transition"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Tambah pesanan
            </router-link>
          </div>

          <div v-else class="divide-y divide-ink-100">
            <router-link
              v-for="o in summary.recentOrders"
              :key="o.id"
              :to="`/orders/${o.id}`"
              class="flex items-center justify-between gap-3 py-3 hover:bg-ink-50 -mx-2 px-2 rounded-lg transition"
            >
              <div class="min-w-0">
                <p class="text-[13.5px] font-medium text-ink-900 truncate">{{ o.buyerName }}</p>
                <p class="text-[12px] text-ink-400 truncate">{{ o.category }} · {{ o.characterType }}</p>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <span class="text-[13px] font-medium text-ink-800">{{ amount(o.price) }}</span>
                <StatusBadge :status="o.status" />
              </div>
            </router-link>
          </div>
        </div>
      </template>
    </section>

    <!-- ==================== PRODUK & PENJUALAN ==================== -->
    <section class="space-y-6">
      <h2 class="text-[13px] font-medium text-ink-500">Produk dan penjualan</h2>

      <!-- Kartu statistik produk -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <router-link to="/produk" class="bg-white rounded-card shadow-card p-4 hover:bg-ink-50 transition">
          <p class="text-[12px] text-ink-400">Total produk</p>
          <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ totalProducts }}</p>
        </router-link>
        <router-link to="/produk" class="bg-white rounded-card shadow-card p-4 hover:bg-ink-50 transition">
          <p class="text-[12px] text-ink-400">Produk terjual</p>
          <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ soldProducts }}</p>
          <p class="text-[11px] text-ink-400 mt-0.5">{{ unsoldProducts }} belum terjual</p>
        </router-link>
        <div class="bg-white rounded-card shadow-card p-4">
          <p class="text-[12px] text-ink-400">Unit terjual</p>
          <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ totalUnits }}</p>
          <p class="text-[11px] text-ink-400 mt-0.5">dari {{ sales.length }} transaksi</p>
        </div>
      </div>

      <!-- Ringkasan per kategori -->
      <div v-if="categoryStats.length" class="bg-white rounded-card shadow-card p-5">
        <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Ringkasan per kategori</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <router-link
            v-for="c in categoryStats"
            :key="c.name"
            :to="`/kategori/${encodeURIComponent(c.name)}`"
            class="rounded-xl border border-ink-100 p-4 hover:bg-ink-50 transition"
          >
            <p class="text-[13.5px] font-medium text-ink-800 mb-2">{{ c.name }}</p>
            <div class="flex items-center justify-between text-[12px] text-ink-500">
              <span>{{ c.count }} produk</span>
              <span>{{ c.units }} unit terjual</span>
            </div>
            <p class="text-[13px] font-semibold text-ink-900 mt-1.5">{{ formatPrice(c.revenue) }}</p>
          </router-link>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Produk terlaris -->
        <div class="bg-white rounded-card shadow-card p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[15px] font-semibold text-ink-900">Produk terlaris</h2>
            <router-link
              v-if="topProducts.length"
              to="/produk"
              class="text-[13px] text-brand-500 hover:text-brand-600 font-medium"
            >
              Lihat semua →
            </router-link>
          </div>

          <!-- Empty state -->
          <div v-if="topProducts.length === 0" class="flex flex-col items-center text-center py-10">
            <div class="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p class="text-[13.5px] font-medium text-ink-700">Belum ada penjualan produk</p>
            <p class="text-[12px] text-ink-400 mt-1 max-w-[260px]">Produk terlaris akan muncul di sini setelah ada produk yang terjual.</p>
            <router-link
              v-if="totalProducts === 0"
              to="/produk"
              class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[12.5px] font-medium transition"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Tambah produk
            </router-link>
          </div>

          <div v-else class="space-y-4">
            <router-link
              v-for="p in topProducts"
              :key="p.id"
              :to="`/produk/${p.id}`"
              class="flex items-center gap-3 group"
            >
              <img
                v-if="p.image"
                :src="p.image"
                :alt="p.name"
                class="w-10 h-10 rounded-lg object-cover border border-ink-100 shrink-0"
              />
              <div
                v-else
                class="w-10 h-10 rounded-lg bg-cream-100 border border-ink-100 flex items-center justify-center shrink-0"
              >
                <svg class="w-4.5 h-4.5 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between text-[13px] mb-1.5">
                  <span class="font-medium text-ink-800 truncate pr-3 group-hover:text-brand-600 transition">{{ p.name }}</span>
                  <span class="text-ink-500 shrink-0">{{ p.units }} unit</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      class="h-full bg-brand-500 rounded-full"
                      :style="{ width: `${Math.round((p.units / maxUnits) * 100)}%` }"
                    />
                  </div>
                  <span class="text-[12px] text-ink-400 w-16 text-right">{{ amount(p.revenue) }}</span>
                </div>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Penjualan terbaru -->
        <div class="bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Penjualan produk terbaru</h2>

          <!-- Empty state -->
          <div v-if="recentSales.length === 0" class="flex flex-col items-center text-center py-10">
            <div class="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
            </div>
            <p class="text-[13.5px] font-medium text-ink-700">Belum ada penjualan</p>
            <p class="text-[12px] text-ink-400 mt-1 max-w-[260px]">Transaksi penjualan produk akan tercatat dan tampil di sini.</p>
          </div>

          <div v-else class="divide-y divide-ink-100">
            <router-link
              v-for="s in recentSales"
              :key="s.id"
              :to="`/produk/${s.productId}`"
              class="flex items-center justify-between gap-3 py-3 hover:bg-ink-50 -mx-2 px-2 rounded-lg transition"
            >
              <div class="min-w-0">
                <p class="text-[13.5px] font-medium text-ink-900 truncate">{{ s.buyer }}</p>
                <p class="text-[12px] text-ink-400 truncate">{{ s.product.name }} · {{ formatDateTime(s.soldAt) }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-[13px] font-medium text-ink-800">{{ amount((s.product.price || 0) * s.qty) }}</p>
                <p class="text-[11px] text-ink-400">{{ s.qty }} unit<template v-if="s.platform"> · {{ s.platform }}</template></p>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Daftar transaksi bulan ini -->
      <div class="bg-white rounded-card shadow-card overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100">
          <h3 class="text-[15px] font-semibold text-ink-900">Daftar transaksi</h3>
        </div>

        <!-- Empty state -->
        <div v-if="monthSales.length === 0" class="flex flex-col items-center text-center py-10">
          <div class="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
            <svg class="w-6 h-6 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
          </div>
          <p class="text-[13.5px] font-medium text-ink-700">Belum ada transaksi</p>
          <p class="text-[12px] text-ink-400 mt-1 max-w-[260px]">Belum ada transaksi pada bulan ini.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-[13px]">
            <thead>
              <tr class="bg-cream-100 text-ink-500 text-left">
                <th class="px-4 py-3 font-medium whitespace-nowrap">Tanggal &amp; jam</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Pembeli</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Produk</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Paket</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Platform</th>
                <th class="px-4 py-3 font-medium text-right whitespace-nowrap">Jumlah</th>
                <th class="px-4 py-3 font-medium text-right whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in monthSales" :key="s.id" class="border-b border-ink-50">
                <td class="px-4 py-3 text-ink-500 whitespace-nowrap">{{ formatDateTime(s.soldAt) }}</td>
                <td class="px-4 py-3 font-medium text-ink-800">{{ s.buyer }}</td>
                <td class="px-4 py-3 text-ink-600">
                  <router-link :to="`/produk/${s.productId}`" class="hover:text-brand-600 transition">{{ s.product.name }}</router-link>
                </td>
                <td class="px-4 py-3 text-ink-600">{{ s.package || 'Satuan' }}</td>
                <td class="px-4 py-3 text-ink-600">{{ s.platform || '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-ink-700">{{ s.qty }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-ink-700 font-medium">{{ amount(saleValue(s)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* Tampilan cetak / simpan PDF: sembunyikan sidebar, header, dan toolbar */
@media print {
  aside,
  header,
  .print-hidden {
    display: none !important;
  }
  html,
  body,
  #app,
  .h-screen,
  .overflow-hidden,
  .overflow-y-auto {
    height: auto !important;
    overflow: visible !important;
  }
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  main {
    padding: 0 !important;
  }
}
</style>
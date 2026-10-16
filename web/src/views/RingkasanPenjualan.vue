<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../utils/api.js'
import { formatDateTime } from '../composables/useProducts'
import { useProductOverview, productsVersion } from '../composables/useProductOverview'
import { useOptions } from '../composables/useOptions'
import { useCurrency } from '../composables/useCurrency'
import SearchInput from '../components/SearchInput.vue'
import Pager from '../components/Pager.vue'
import FilterResetButton from '../components/FilterResetButton.vue'
import AppChart from '../components/AppChart.vue'

// Halaman ini HANYA untuk produk & penjualan di platform (Kategori). Data order/task
// desain ada di halaman terpisah: RingkasanOrder.vue.
//
// Angka agregat datang dari server (useProductOverview) dan tabel transaksi diambil per halaman,
// jadi halaman ini tetap ringan walau produk dan penjualan sudah ribuan.

// ========== BULAN YANG DIPILIH ==========
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
  salesPage.value = 1
  loadSales()
  loadDaily()
}

// ========== GRAFIK (agregat per hari dari server) ==========
const dailyRows = ref([])
const trendMetric = ref('value')
async function loadDaily() {
  try {
    const res = await api.get(`/sales/daily?month=${selectedMonth.value}`)
    dailyRows.value = res.data || []
  } catch (err) {
    dailyRows.value = []
  }
}

// ========== TRANSAKSI (berpaginasi di server) ==========
const SALES_PER_PAGE = 20
const monthSales = ref([])
const recentSales = ref([])
const salesPage = ref(1)
const salesMeta = ref({ page: 1, limit: SALES_PER_PAGE, totalPages: 1, total: 0 })
const salesLoading = ref(false)

// Cari & filter daftar transaksi (dikerjakan di server)
const txSearch = ref('')
const txPlatform = ref('')
const txStyle = ref('')
const hasTxFilter = computed(() => !!(txSearch.value || txPlatform.value || txStyle.value))
function txFilterParams() {
  const p = new URLSearchParams()
  if (txSearch.value) p.set('search', txSearch.value)
  if (txPlatform.value) p.set('platform', txPlatform.value)
  if (txStyle.value) p.set('style', txStyle.value)
  return p
}
function resetTxFilters() {
  txSearch.value = ''
  txPlatform.value = ''
  txStyle.value = ''
}
watch([txSearch, txPlatform, txStyle], () => {
  salesPage.value = 1
  loadSales()
})

async function loadSales() {
  salesLoading.value = true
  try {
    const q = txFilterParams()
    q.set('month', selectedMonth.value)
    q.set('page', salesPage.value)
    q.set('limit', SALES_PER_PAGE)
    const [pageRes, recent] = await Promise.all([
      api.get(`/sales?${q}`),
      api.get('/sales?page=1&limit=6'),
    ])
    monthSales.value = pageRes.data || []
    salesMeta.value = pageRes.pagination || { page: 1, limit: SALES_PER_PAGE, totalPages: 1, total: 0 }
    recentSales.value = recent.data || []
  } catch (err) {
    monthSales.value = []
    recentSales.value = []
  } finally {
    salesLoading.value = false
  }
}
function goSalesPage(page) {
  if (page < 1 || page > salesMeta.value.totalPages) return
  salesPage.value = page
  loadSales()
}
onMounted(() => {
  loadSales()
  loadDaily()
})
// Data produk/penjualan berubah (mis. dicatat dari halaman lain) -> muat ulang halaman ini
watch(productsVersion, () => {
  loadSales()
  loadDaily()
})

// ========== AGREGAT PRODUK & PENJUALAN (dari server) ==========
const { totals, styles, topProducts: topRaw } = useProductOverview()
const { toDisplay, shown, display, displayCurrency, missingRates } = useCurrency()
const { optionsOf } = useOptions()
const platformOptions = computed(() => optionsOf('platform'))
const styleOptions = computed(() => optionsOf('style'))

// Semua nilai di halaman ini ditampilkan dalam satu mata uang (diatur di Pengaturan > Mata Uang).
const amount = (value, from = 'USD') => display(value, from)

// Mata uang yang dipakai tapi kursnya belum diisi: nilainya belum ikut terhitung
const missingCurrencies = computed(() => {
  const used = new Set()
  for (const s of styles.value) {
    for (const [cur, value] of Object.entries(s.revenue || {})) if (value > 0) used.add(cur)
  }
  return missingRates([...used])
})

const sellableLink = (p) => (p.kind === 'bundle' ? `/bundling/${p.id}` : `/produk/${p.id}`)
const saleLink = (s) => (s.kind === 'bundle' ? `/bundling/${s.productId}/penjualan/${s.id}` : `/produk/${s.productId}/penjualan/${s.id}`)
const itemLink = (s) => (s.kind === 'bundle' ? `/bundling/${s.productId}` : `/produk/${s.productId}`)

// Bundling dihitung sebagai SATU produk di kategorinya (sudah begitu di server).
const totalProducts = computed(() => totals.value.count)
const soldProducts = computed(() => totals.value.sold)
const unsoldProducts = computed(() => totalProducts.value - soldProducts.value)
const totalUnits = computed(() => totals.value.units)
const totalTransactions = computed(() => totals.value.transactions)

// 5 produk dengan unit terjual terbanyak (sudah diurutkan server)
const topProducts = computed(() =>
  topRaw.value.map((p) => ({
    id: p.id,
    kind: p.kind,
    name: p.name,
    image: p.image || null,
    units: p.units,
    revenue: toDisplay(p.units * (p.price || 0), p.currency),
  }))
)
const maxUnits = computed(() => Math.max(...topProducts.value.map((p) => p.units), 1))

// Ringkasan per kategori: pilihan Style dari Pengaturan tetap tampil walau belum ada produknya
const categoryStats = computed(() => {
  const byName = new Map(styles.value.filter((s) => s.style).map((s) => [s.style, s]))
  const names = new Set([...optionsOf('style'), ...byName.keys()])
  return [...names].map((name) => {
    const s = byName.get(name)
    return {
      name,
      count: s?.count || 0,
      units: s?.units || 0,
      revenue: Object.entries(s?.revenue || {}).reduce((sum, [cur, v]) => sum + toDisplay(v, cur), 0),
    }
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const maxCategoryRevenue = computed(() => Math.max(...categoryStats.value.map((c) => c.revenue), 1))

// Semua hari di bulan terpilih (hari tanpa penjualan = 0), nilai dikonversi ke mata uang tampilan
const trendDays = computed(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const count = new Date(y, m, 0).getDate()
  const byDay = new Map()
  for (const r of dailyRows.value) {
    const cur = byDay.get(r.day) || { value: 0, units: 0 }
    cur.value += toDisplay(r.value, r.currency)
    cur.units += r.units
    byDay.set(r.day, cur)
  }
  return Array.from({ length: count }, (_, i) => {
    const day = `${selectedMonth.value}-${pad(i + 1)}`
    const v = byDay.get(day)
    return { day, value: v?.value || 0, units: v?.units || 0 }
  })
})
const monthRevenue = computed(() => trendDays.value.reduce((s, d) => s + d.value, 0))
const monthUnits = computed(() => trendDays.value.reduce((s, d) => s + d.units, 0))
const hasTrend = computed(() => monthUnits.value > 0 || monthRevenue.value > 0)
const bestDay = computed(() => trendDays.value.reduce((b, d) => (d.value > b.value ? d : b), { value: 0, day: '' }))
// Item grafik batang: label = tanggal, nilai sesuai metrik yang dipilih
const trendItems = computed(() =>
  trendDays.value.map((d) => ({
    label: Number(d.day.slice(8)),
    value: trendMetric.value === 'units' ? d.units : d.value,
    hint: trendMetric.value === 'value' ? `${d.units} unit` : '',
  }))
)
const trendFormat = (v) => (trendMetric.value === 'units' ? `${Math.round(v)} unit` : shown(v))

// Pendapatan bulan ini per platform
const platformShare = computed(() => {
  const map = new Map()
  for (const r of dailyRows.value) {
    const name = r.platform || 'Lainnya'
    map.set(name, (map.get(name) || 0) + toDisplay(r.value, r.currency))
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
})
// Pendapatan semua waktu per kategori (data sudah ada di ringkasan)
const categoryShare = computed(() =>
  categoryStats.value.filter((c) => c.revenue > 0).map((c) => ({ label: c.name, value: c.revenue })).sort((a, b) => b.value - a.value)
)

// ========== EKSPOR (CSV & Cetak) ==========
// Nilai penjualan dalam mata uang penjualannya: total yang tercatat, atau harga x jumlah kalau kosong
const saleValue = (s) => s.total ?? (s.product.price || 0) * (Number(s.qty) || 0)

// CSV memuat SEMUA transaksi bulan itu, jadi baru diambil (halaman demi halaman) saat tombol diklik
const exporting = ref(false)
async function fetchAllMonthSales() {
  const all = []
  let page = 1
  let totalPages = 1
  do {
    const q = txFilterParams()
    q.set('month', selectedMonth.value)
    q.set('page', page)
    q.set('limit', 200)
    const res = await api.get(`/sales?${q}`)
    all.push(...(res.data || []))
    totalPages = res.pagination?.totalPages || 1
    page++
  } while (page <= totalPages)
  return all
}

async function downloadCsv() {
  exporting.value = true
  try {
    const sales = await fetchAllMonthSales()
    const rows = [['Tanggal', 'Pembeli', 'Produk', 'Paket', 'Jumlah', `Nilai (${displayCurrency.value})`, 'Platform']]
    for (const s of sales) {
      rows.push([
        formatDateTime(s.soldAt),
        s.buyer,
        s.product.name,
        s.kind === 'bundle' ? 'Bundling' : s.package || 'Satuan',
        s.qty,
        Math.round(toDisplay(saleValue(s), s.currency) * 100) / 100,
        s.platform || '',
      ])
    }

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = '\ufeff' + rows.map((r) => r.map(escape).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `ringkasan-penjualan-${selectedMonth.value}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    alert(err.message)
  } finally {
    exporting.value = false
  }
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <!-- ==================== TOOLBAR BULAN & EKSPOR (tidak ikut dicetak) ==================== -->
    <div class="print-hidden bg-white rounded-card shadow-card border border-ink-100 p-4 flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="setMonth(shiftMonth(selectedMonth, -1))"
          class="w-10 h-10 flex items-center justify-center rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-500/5 transition"
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
          class="w-10 h-10 flex items-center justify-center rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-500/5 transition"
          aria-label="Bulan berikutnya"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          v-if="!isCurrentMonth"
          type="button"
          @click="setMonth(currentMonthKey)"
          class="px-3 py-2.5 rounded-xl text-sm font-medium text-brand-600 hover:bg-ink-500/5 transition"
        >
          Bulan ini
        </button>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          @click="downloadCsv"
          :disabled="exporting"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-500/5 text-sm font-medium transition disabled:opacity-60"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
          {{ exporting ? 'Menyiapkan...' : 'Unduh CSV' }}
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

    <p v-if="missingCurrencies.length" class="print-hidden text-[13px] text-warn-700 bg-warn-100 rounded-xl px-4 py-3">
      Kurs {{ missingCurrencies.join(', ') }} belum diisi, jadi nilainya belum ikut terhitung di ringkasan.
      Isi di <router-link to="/pengaturan?tab=mata-uang" class="underline font-medium">Pengaturan &gt; Mata Uang</router-link>.
    </p>

    <section class="space-y-5">
      <!-- Kartu statistik produk -->
      <div class="fx-grid [--fx-min:11rem] gap-4">
        <router-link to="/kategori" class="bg-white rounded-card shadow-card p-4 hover:bg-ink-500/5 transition flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <p class="text-[12px] text-ink-400">Total produk</p>
            <div class="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center text-ink-500">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
            </div>
          </div>
          <p class="text-[22px] font-semibold text-ink-900">{{ totalProducts }}</p>
        </router-link>
        <router-link to="/kategori" class="bg-white rounded-card shadow-card p-4 hover:bg-ink-500/5 transition flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <p class="text-[12px] text-ink-400">Produk terjual</p>
            <div class="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center text-ink-500">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
          </div>
          <div>
            <p class="text-[22px] font-semibold text-ink-900">{{ soldProducts }}</p>
            <p class="text-[11px] text-ink-400">{{ unsoldProducts }} belum terjual</p>
          </div>
        </router-link>
        <div class="bg-white rounded-card shadow-card p-4 flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <p class="text-[12px] text-ink-400">Unit terjual</p>
            <div class="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center text-ink-500">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
          </div>
          <div>
            <p class="text-[22px] font-semibold text-ink-900">{{ totalUnits }}</p>
            <p class="text-[11px] text-ink-400">dari {{ totalTransactions }} transaksi</p>
          </div>
        </div>
      </div>

      <!-- Grafik tren penjualan bulan ini -->
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 class="text-[15px] font-semibold text-ink-900">Tren penjualan</h2>
            <p class="text-[12px] text-ink-400 mt-0.5">
              <template v-if="hasTrend">
                {{ shown(monthRevenue) }} dari {{ monthUnits }} unit<template v-if="bestDay.value > 0"> · terbaik tanggal {{ Number(bestDay.day.slice(8)) }} ({{ shown(bestDay.value) }})</template>
              </template>
              <template v-else>Per hari di bulan terpilih</template>
            </p>
          </div>
          <div class="print-hidden inline-flex p-0.5 rounded-lg bg-cream-100 text-[12px]">
            <button
              type="button"
              @click="trendMetric = 'value'"
              :class="trendMetric === 'value' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'"
              class="px-3 py-1.5 rounded-md font-medium transition"
            >Pendapatan</button>
            <button
              type="button"
              @click="trendMetric = 'units'"
              :class="trendMetric === 'units' ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'"
              class="px-3 py-1.5 rounded-md font-medium transition"
            >Unit</button>
          </div>
        </div>
        <AppChart v-if="hasTrend" type="bar" :items="trendItems" :format="trendFormat" title-prefix="Tanggal" />
        <p v-else class="text-center text-[13px] text-ink-400 py-10">Belum ada penjualan pada bulan ini.</p>
      </div>

      <!-- Komposisi pendapatan -->
      <div class="fx-grid [--fx-min:22rem] gap-6">
        <div class="bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Pendapatan per platform <span class="text-[12px] font-normal text-ink-400">bulan ini</span></h2>
          <AppChart v-if="platformShare.length" type="donut" :items="platformShare" :format="shown" />
          <p v-else class="text-center text-[13px] text-ink-400 py-10">Belum ada data platform.</p>
        </div>
        <div class="bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Pendapatan per kategori <span class="text-[12px] font-normal text-ink-400">semua waktu</span></h2>
          <AppChart v-if="categoryShare.length" type="donut" :items="categoryShare" :format="shown" />
          <p v-else class="text-center text-[13px] text-ink-400 py-10">Belum ada data kategori.</p>
        </div>
      </div>

      <!-- Ringkasan per kategori -->
      <div v-if="categoryStats.length" class="bg-white rounded-card shadow-card p-5">
        <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Ringkasan per kategori</h2>
        <div class="fx-grid [--fx-min:14rem] gap-3">
          <router-link
            v-for="c in categoryStats"
            :key="c.name"
            :to="`/kategori/${encodeURIComponent(c.name)}`"
            class="rounded-xl border border-ink-100 p-4 hover:border-brand-200 hover:bg-ink-500/5 transition"
          >
            <p class="text-[13.5px] font-medium text-ink-800 mb-2">{{ c.name }}</p>
            <div class="flex items-center justify-between text-[12px] text-ink-500 mb-2">
              <span>{{ c.count }} produk</span>
              <span>{{ c.units }} unit terjual</span>
            </div>
            <div class="h-1.5 rounded-full bg-ink-100 overflow-hidden mb-2">
              <div
                class="h-full rounded-full bg-brand-400"
                :style="{ width: `${Math.min(Math.round((c.revenue / maxCategoryRevenue) * 100), 100)}%` }"
              />
            </div>
            <p class="text-[13px] font-semibold text-ink-900">{{ shown(c.revenue) }}</p>
          </router-link>
        </div>
      </div>

      <div class="fx-grid [--fx-min:22rem] gap-6">
        <!-- Produk terlaris -->
        <div class="bg-white rounded-card shadow-card p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[15px] font-semibold text-ink-900">Produk terlaris</h2>
            <router-link
              v-if="topProducts.length"
              to="/kategori"
              class="text-[13px] text-brand-500 hover:text-brand-600 font-medium"
            >
              Lihat semua
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
              to="/kategori"
              class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[12.5px] font-medium transition"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Tambah produk
            </router-link>
          </div>

          <div v-else class="space-y-4">
            <router-link
              v-for="(p, idx) in topProducts"
              :key="p.id"
              :to="sellableLink(p)"
              class="flex items-center gap-3 group"
            >
              <span class="w-5 text-[12px] font-medium text-ink-300 text-center shrink-0">{{ idx + 1 }}</span>

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
                  <div class="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      class="h-full bg-brand-400 rounded-full"
                      :style="{ width: `${Math.round((p.units / maxUnits) * 100)}%` }"
                    />
                  </div>
                  <span class="text-[12px] text-ink-400 w-16 text-right">{{ shown(p.revenue) }}</span>
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
              :to="saleLink(s)"
              class="flex items-center justify-between gap-3 py-3 hover:bg-ink-500/5 -mx-2 px-2 rounded-lg transition"
            >
              <div class="min-w-0">
                <p class="text-[13.5px] font-medium text-ink-900 truncate">{{ s.buyer }}</p>
                <p class="text-[12px] text-ink-400 truncate">{{ s.product.name }} · {{ formatDateTime(s.soldAt) }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-[13px] font-medium text-ink-800">{{ amount(saleValue(s), s.currency) }}</p>
                <p class="text-[11px] text-ink-400">{{ s.qty }} unit<template v-if="s.platform"> · {{ s.platform }}</template></p>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Daftar transaksi bulan ini -->
      <div class="bg-white rounded-card shadow-card overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100 flex flex-col lg:flex-row lg:items-center gap-3">
          <h3 class="text-[15px] font-semibold text-ink-900 lg:mr-auto">Daftar transaksi</h3>

          <!-- Cari & filter (tidak ikut dicetak) -->
          <div class="print-hidden flex flex-col sm:flex-row sm:items-center gap-3 lg:justify-end">
            <SearchInput v-model="txSearch" class="sm:w-72" placeholder="Cari pembeli, produk, platform..." />
            <select
              v-model="txStyle"
              aria-label="Filter kategori"
              class="px-3 py-2 rounded-lg border border-ink-200 bg-white text-[13px] text-ink-700 outline-none focus:border-brand-400 shrink-0"
            >
              <option value="">Semua kategori</option>
              <option v-for="c in styleOptions" :key="c" :value="c">{{ c }}</option>
            </select>
            <select
              v-model="txPlatform"
              aria-label="Filter platform"
              class="px-3 py-2 rounded-lg border border-ink-200 bg-white text-[13px] text-ink-700 outline-none focus:border-brand-400 shrink-0"
            >
              <option value="">Semua platform</option>
              <option v-for="o in platformOptions" :key="o" :value="o">{{ o }}</option>
            </select>
            <FilterResetButton v-if="hasTxFilter" @click="resetTxFilters" />
          </div>
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
          <p class="text-[13.5px] font-medium text-ink-700">{{ hasTxFilter ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi' }}</p>
          <p class="text-[12px] text-ink-400 mt-1 max-w-[260px]">{{ hasTxFilter ? 'Coba ubah kata kunci atau filter.' : 'Belum ada transaksi pada bulan ini.' }}</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table v-rtable class="rtable w-full text-[13px]">
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
              <tr
                v-for="s in monthSales"
                :key="s.id"
                class="border-b border-ink-50 hover:bg-ink-500/5 transition cursor-pointer"
                @click="$router.push(saleLink(s))"
              >
                <td class="px-4 py-3 text-ink-500 whitespace-nowrap">{{ formatDateTime(s.soldAt) }}</td>
                <td class="px-4 py-3 font-medium text-ink-800">{{ s.buyer }}</td>
                <td class="px-4 py-3 text-ink-600">
                  <router-link :to="itemLink(s)" class="hover:text-brand-600 transition" @click.stop>{{ s.product.name }}</router-link>
                </td>
                <td class="px-4 py-3 text-ink-600">{{ s.package || 'Satuan' }}</td>
                <td class="px-4 py-3 text-ink-600">{{ s.platform || '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-ink-700">{{ s.qty }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-ink-700 font-medium">{{ amount(saleValue(s), s.currency) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Pager :pagination="salesMeta" label="transaksi" :loading="salesLoading" @page="goSalesPage" />
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

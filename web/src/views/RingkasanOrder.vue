<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../utils/api.js'
import { monthLabel } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.vue'
import { formatDateTime } from '../composables/useProducts'
import { useCurrency } from '../composables/useCurrency'

// Halaman ini HANYA untuk order/task desain (tabel orders). Data penjualan produk
// ada di halaman terpisah: RingkasanPenjualan.vue.

const loading = ref(true)
const errorMsg = ref('')
const summary = ref(null)

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
  load()
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    // Ringkasan dihitung di server (agregat, di-cache); daftar order lengkap TIDAK ikut dimuat di sini
    summary.value = await api.get(`/dashboard/summary?month=${selectedMonth.value}`)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ========== MATA UANG ==========
// Order tercatat dalam USD; ditampilkan dalam mata uang tampilan (Pengaturan > Mata Uang).
const { toDisplay, display, displayCurrency, missingRates } = useCurrency()
const amount = (value, from = 'USD') => display(value, from)
const missingCurrencies = computed(() => missingRates(['USD']))

// ========== TURUNAN UNTUK TAMPILAN ==========

// Status pesanan sebagai satu bar tersegmentasi + legenda
const statusSegments = computed(() => {
  if (!summary.value) return []
  const total = summary.value.totalOrders || 0
  const rows = [
    { key: 'pending', label: 'Menunggu', count: summary.value.pendingOrders, bar: 'bg-amber-400', dot: 'bg-amber-400' },
    { key: 'progress', label: 'Dikerjakan', count: summary.value.progressOrders, bar: 'bg-sky-400', dot: 'bg-sky-400' },
    { key: 'done', label: 'Selesai', count: summary.value.doneOrders, bar: 'bg-ok-500', dot: 'bg-ok-500' },
  ]
  return rows.map((r) => ({ ...r, pct: total ? Math.round((r.count / total) * 100) : 0 }))
})

// Rata-rata nilai per pesanan, pelengkap kartu KPI
const avgOrderValue = computed(() => {
  if (!summary.value || !summary.value.totalOrders) return 0
  return summary.value.totalRevenue / summary.value.totalOrders
})

// Bulan dengan pendapatan tertinggi, untuk disorot pada grafik batang
const peakMonth = computed(() => {
  if (!summary.value || !summary.value.monthlyRevenue?.length) return null
  return summary.value.monthlyRevenue.reduce((a, b) => (b.revenue > a.revenue ? b : a))
})

// Pembanding lebar bar "Performa kategori" (berdasarkan order, bukan penjualan produk)
const maxCategoryRevenue = computed(() =>
  Math.max(...(summary.value?.categoryPerformance || []).map((c) => c.revenue), 1)
)

// ========== EKSPOR (CSV & Cetak) ==========
// CSV memuat SEMUA order bulan itu, jadi baru diambil (halaman demi halaman, 200 per halaman)
// saat tombol diklik — bukan setiap kali halaman dibuka.
const exporting = ref(false)

async function fetchAllMonthOrders() {
  const all = []
  let page = 1
  let totalPages = 1
  do {
    const res = await api.get(`/orders?month=${selectedMonth.value}&page=${page}&limit=200`)
    all.push(...(res.data || []))
    totalPages = res.pagination?.totalPages || 1
    page++
  } while (page <= totalPages)
  return all
}

async function downloadCsv() {
  exporting.value = true
  try {
    const orders = await fetchAllMonthOrders()
    const rows = [['Tanggal', 'Judul', 'Pembeli', 'Kategori', 'Karakter', `Nilai (${displayCurrency.value})`, 'Status']]
    for (const o of orders) {
      rows.push([
        formatDateTime(o.orderDate || o.date || o.createdAt),
        o.title || '',
        o.buyerName || '',
        o.category || '',
        o.characterType || '',
        Math.round(toDisplay(o.price || 0, 'USD') * 100) / 100,
        o.status || '',
      ])
    }

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = '\ufeff' + rows.map((r) => r.map(escape).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `ringkasan-order-${selectedMonth.value}.csv`
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
      <div v-if="loading" class="fx-grid [--fx-min:11rem] gap-4">
        <div class="fx-2 h-28 rounded-card bg-white shadow-card animate-pulse" />
        <div v-for="i in 4" :key="i" class="h-28 rounded-card bg-white shadow-card animate-pulse" />
      </div>

      <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
        <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
        <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
      </div>

      <template v-else-if="summary">
        <!-- Kartu KPI: pendapatan total jadi sorotan, sisanya melengkapi di sampingnya -->
        <div class="fx-grid [--fx-min:11rem] gap-4">
          <div class="fx-2 bg-brand-500 rounded-card p-5 flex flex-col justify-between text-white relative overflow-hidden">
            <div class="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10"></div>
            <div class="absolute -right-2 top-14 w-16 h-16 rounded-full bg-white/10"></div>
            <div class="flex items-start justify-between relative">
              <p class="text-[12.5px] text-white/75">Pendapatan total</p>
              <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              </div>
            </div>
            <p class="text-[32px] font-semibold leading-tight relative">{{ amount(summary.totalRevenue) }}</p>
            <div class="flex items-center gap-2 text-[12px] text-white/75 relative">
              <span class="w-1.5 h-1.5 rounded-full bg-white/75"></span>
              {{ amount(summary.monthRevenue) }} bulan ini
            </div>
          </div>

          <div class="bg-white rounded-card shadow-card p-4 flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <p class="text-[12px] text-ink-400">Total pesanan</p>
              <div class="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center text-ink-500">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
              </div>
            </div>
            <p class="text-[22px] font-semibold text-ink-900">{{ summary.totalOrders }}</p>
          </div>

          <div class="bg-white rounded-card shadow-card p-4 flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <p class="text-[12px] text-ink-400">Sedang dikerjakan</p>
              <div class="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center text-ink-500">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
              </div>
            </div>
            <div>
              <p class="text-[22px] font-semibold text-ink-900">{{ summary.progressOrders }}</p>
              <p class="text-[11px] text-ink-400">{{ summary.pendingOrders }} masih menunggu</p>
            </div>
          </div>

          <div class="bg-white rounded-card shadow-card p-4 flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <p class="text-[12px] text-ink-400">Pendapatan bulan ini</p>
              <div class="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center text-ink-500">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
              </div>
            </div>
            <p class="text-[22px] font-semibold text-ink-900">{{ amount(summary.monthRevenue) }}</p>
          </div>

          <div class="bg-white rounded-card shadow-card p-4 flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <p class="text-[12px] text-ink-400">Rata-rata per pesanan</p>
              <div class="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center text-ink-500">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V10M11 19V5M18 19v-7" /></svg>
              </div>
            </div>
            <p class="text-[22px] font-semibold text-ink-900">{{ amount(avgOrderValue) }}</p>
          </div>
        </div>

        <!-- Status pesanan -->
        <div class="bg-white rounded-card shadow-card p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[15px] font-semibold text-ink-900">Status pesanan</h2>
            <span class="text-[12px] text-ink-400">{{ summary.totalOrders }} total</span>
          </div>

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

          <div v-else>
            <!-- Satu bar tersegmentasi, gantinya tiga bar terpisah -->
            <div class="flex h-3 rounded-full overflow-hidden bg-ink-100">
              <div
                v-for="seg in statusSegments"
                :key="seg.key"
                :class="seg.bar"
                class="h-full transition-all"
                :style="{ width: seg.pct + '%' }"
                :title="`${seg.label}: ${seg.count}`"
              />
            </div>

            <div class="flex flex-wrap gap-x-6 gap-y-2 mt-4">
              <div v-for="seg in statusSegments" :key="seg.key" class="flex items-center gap-2 text-[12.5px]">
                <span class="w-2 h-2 rounded-full" :class="seg.dot"></span>
                <span class="text-ink-600">{{ seg.label }}</span>
                <span class="text-ink-400">{{ seg.count }} · {{ seg.pct }}%</span>
              </div>
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

          <div v-else class="flex items-stretch gap-1 sm:gap-2 h-44 sm:h-56">
            <div
              v-for="m in summary.monthlyRevenue"
              :key="m.month"
              class="flex-1 min-w-0 flex flex-col items-center gap-1.5 group"
            >
              <span
                class="text-[11px] font-medium text-ink-500 transition-opacity"
                :class="peakMonth && m.month === peakMonth.month ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
              >{{ amount(m.revenue) }}</span>
              <div class="flex-1 min-h-0 w-full flex items-end">
              <div
                class="w-full rounded-t-md transition-all"
                :class="peakMonth && m.month === peakMonth.month ? 'bg-brand-500' : 'bg-brand-200 group-hover:bg-brand-400'"
                :style="{
                  height: `${Math.max((m.revenue / Math.max(...summary.monthlyRevenue.map((x) => x.revenue), 1)) * 100, m.revenue > 0 ? 4 : 0)}%`,
                }"
                :title="amount(m.revenue)"
              />
              </div>
              <span class="text-[10px] text-ink-400">{{ monthLabel(m.month) }}</span>
            </div>
          </div>
        </div>

        <!-- Performa kategori -->
        <div v-if="summary.categoryPerformance.length" class="bg-white rounded-card shadow-card p-5">
          <h2 class="text-[15px] font-semibold text-ink-900 mb-4">Performa kategori bulan ini</h2>
          <div class="space-y-4">
            <div v-for="c in summary.categoryPerformance" :key="c.category">
              <div class="flex items-center justify-between text-[13px] mb-1.5">
                <span class="font-medium text-ink-800">{{ c.category }}</span>
                <span
                  class="inline-flex items-center gap-1 text-[12px] font-medium"
                  :class="c.changePercent > 0 ? 'text-ok-600' : c.changePercent < 0 ? 'text-danger-600' : 'text-ink-400'"
                >
                  {{ c.changePercent > 0 ? '↑' : c.changePercent < 0 ? '↓' : '→' }} {{ Math.abs(c.changePercent) }}%
                </span>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :class="c.changePercent < 0 ? 'bg-danger-400' : 'bg-brand-400'"
                    :style="{ width: `${Math.min(Math.round((c.revenue / maxCategoryRevenue) * 100), 100)}%` }"
                  />
                </div>
                <span class="text-[12px] text-ink-400 shrink-0">{{ c.orders }} order</span>
                <span class="text-[12px] text-ink-600 font-medium shrink-0 w-20 text-right">{{ amount(c.revenue) }}</span>
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
              Lihat semua
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
              class="flex items-center justify-between gap-3 py-3 hover:bg-ink-500/5 -mx-2 px-2 rounded-lg transition"
            >
              <div class="min-w-0">
                <p class="text-[13.5px] font-medium text-ink-900 truncate">{{ o.title || o.buyerName }}</p>
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

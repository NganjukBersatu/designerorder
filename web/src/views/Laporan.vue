<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../utils/api.js'
import { amount } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.vue'
import { useProducts, formatDateTime } from '../composables/useProducts'

// =====================================================================
// PENYESUAIAN DATA PESANAN
// Endpoint & nama field di bawah adalah tebakan dari halaman Ringkasan.
// Kalau API kamu berbeda, cukup ubah bagian ini.
// =====================================================================
const ORDERS_ENDPOINT = '/orders'
const ORDER_DATE_KEYS = ['orderDate', 'createdAt', 'date', 'created_at', 'tanggal']

function orderDate(o) {
  for (const k of ORDER_DATE_KEYS) if (o[k]) return o[k]
  return null
}
function toList(res) {
  if (Array.isArray(res)) return res
  return res?.orders || res?.data || res?.items || []
}
const orderValue = (o) => Number(o.price) || 0

// ========== DATA ==========
const { products, sales, getProduct } = useProducts()

const orders = ref([])
const ordersLoading = ref(true)
const ordersError = ref('')

async function loadOrders() {
  ordersLoading.value = true
  ordersError.value = ''
  try {
    orders.value = toList(await api.get(ORDERS_ENDPOINT))
  } catch (err) {
    ordersError.value = err.message || 'Gagal memuat pesanan'
  } finally {
    ordersLoading.value = false
    pickInitialMonth()
  }
}
onMounted(loadOrders)

// Penjualan produk + data produknya (yang produknya sudah dihapus dilewati)
const allSales = computed(() =>
  sales.value.map((s) => ({ ...s, product: getProduct(s.productId) })).filter((s) => s.product)
)
const saleValue = (s) => (s.product.price || 0) * (Number(s.qty) || 0)

// ========== BULAN ==========
const pad = (n) => String(n).padStart(2, '0')

function monthKeyOf(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
function monthName(key, opts) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', opts)
}

const currentMonthKey = monthKeyOf(new Date())
const selectedMonth = ref(currentMonthKey)
let userPicked = false

function setMonth(key) {
  if (!/^\d{4}-\d{2}$/.test(key)) return
  userPicked = true
  selectedMonth.value = key
}

// Kalau bulan ini kosong tapi ada data di bulan lain, buka bulan terakhir yang punya data
function pickInitialMonth() {
  if (userPicked) return
  const keys = new Set()
  orders.value.forEach((o) => keys.add(monthKeyOf(orderDate(o))))
  allSales.value.forEach((s) => keys.add(monthKeyOf(s.soldAt)))
  products.value.forEach((p) => keys.add(monthKeyOf(p.date)))
  keys.delete('')
  if (keys.size === 0 || keys.has(currentMonthKey)) return
  const sorted = [...keys].sort()
  selectedMonth.value = sorted[sorted.length - 1]
}

const monthTitle = computed(() => monthName(selectedMonth.value, { month: 'long', year: 'numeric' }))
const isCurrentMonth = computed(() => selectedMonth.value === currentMonthKey)
const generatedAt = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

// ========== AGREGAT PER BULAN ==========
const sum = (list, fn) => list.reduce((t, x) => t + fn(x), 0)
const ordersOf = (key) => orders.value.filter((o) => monthKeyOf(orderDate(o)) === key)
const salesOfMonth = (key) => allSales.value.filter((s) => monthKeyOf(s.soldAt) === key)

function revenueOf(key) {
  const o = sum(ordersOf(key), orderValue)
  const p = sum(salesOfMonth(key), saleValue)
  return { orders: o, products: p, total: o + p }
}

const monthOrders = computed(() =>
  [...ordersOf(selectedMonth.value)].sort((a, b) => new Date(orderDate(b)) - new Date(orderDate(a)))
)
const monthSales = computed(() =>
  [...salesOfMonth(selectedMonth.value)].sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt))
)
const monthNewProducts = computed(() =>
  products.value
    .filter((p) => monthKeyOf(p.date) === selectedMonth.value)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
)

const cur = computed(() => revenueOf(selectedMonth.value))
const prev = computed(() => revenueOf(shiftMonth(selectedMonth.value, -1)))
const change = computed(() => {
  if (!prev.value.total) return null
  return Math.round(((cur.value.total - prev.value.total) / prev.value.total) * 100)
})

const unitsSold = computed(() => sum(monthSales.value, (s) => Number(s.qty) || 0))
const undatedOrders = computed(() => orders.value.filter((o) => !monthKeyOf(orderDate(o))).length)

// ========== RINCIAN ==========
const statusRows = computed(() =>
  ['Pending', 'Progress', 'Done'].map((status) => {
    const list = monthOrders.value.filter((o) => o.status === status)
    return { status, count: list.length, value: sum(list, orderValue) }
  })
)

const categoryRows = computed(() => {
  const map = new Map()
  for (const o of monthOrders.value) {
    const name = o.category || 'Tanpa kategori'
    const row = map.get(name) || { name, count: 0, value: 0 }
    row.count += 1
    row.value += orderValue(o)
    map.set(name, row)
  }
  return [...map.values()].sort((a, b) => b.value - a.value || b.count - a.count)
})

const topProductRows = computed(() => {
  const map = new Map()
  for (const s of monthSales.value) {
    const row = map.get(s.productId) || { id: s.productId, name: s.product.name, units: 0, value: 0 }
    row.units += Number(s.qty) || 0
    row.value += saleValue(s)
    map.set(s.productId, row)
  }
  return [...map.values()].sort((a, b) => b.units - a.units || b.value - a.value)
})

const platformRows = computed(() => {
  const map = new Map()
  for (const s of monthSales.value) {
    const name = s.platform || 'Tidak dicatat'
    const row = map.get(name) || { name, units: 0, value: 0 }
    row.units += Number(s.qty) || 0
    row.value += saleValue(s)
    map.set(name, row)
  }
  return [...map.values()].sort((a, b) => b.value - a.value)
})

// ========== TREN 6 BULAN ==========
const trend = computed(() => {
  const out = []
  for (let i = 5; i >= 0; i--) {
    const key = shiftMonth(selectedMonth.value, -i)
    out.push({ key, label: monthName(key, { month: 'short' }), ...revenueOf(key) })
  }
  return out
})
const trendMax = computed(() => Math.max(...trend.value.map((t) => t.total), 1))

// ========== EKSPOR ==========
function downloadCsv() {
  const rows = [['Jenis', 'Tanggal', 'Nama', 'Keterangan', 'Jumlah', 'Nilai', 'Status / Platform']]

  for (const o of monthOrders.value) {
    rows.push([
      'Pesanan desain',
      formatDateTime(orderDate(o)),
      o.buyerName || '',
      [o.category, o.characterType].filter(Boolean).join(' / '),
      1,
      orderValue(o),
      o.status || '',
    ])
  }
  for (const s of monthSales.value) {
    rows.push([
      'Penjualan produk',
      formatDateTime(s.soldAt),
      s.buyer,
      s.product.name,
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
  a.download = `laporan-${selectedMonth.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <!-- ==================== TOOLBAR (tidak ikut dicetak) ==================== -->
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
          aria-label="Pilih bulan laporan"
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

    <!-- ==================== JUDUL LAPORAN ==================== -->
    <div>
      <h2 class="text-[22px] font-semibold text-ink-900">Laporan {{ monthTitle }}</h2>
      <p class="text-[13px] text-ink-500 mt-1">Designer Orders, ruang kerja produksi. Dibuat {{ generatedAt }}.</p>
    </div>

    <!-- Peringatan data pesanan -->
    <div
      v-if="ordersError"
      class="print-hidden flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-warn-100 text-warn-700 text-sm"
      role="alert"
    >
      <span>Data pesanan gagal dimuat ({{ ordersError }}). Bagian produk tetap ditampilkan.</span>
      <button type="button" @click="loadOrders" class="px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white text-[13px] font-medium transition">
        Coba lagi
      </button>
    </div>
    <div
      v-else-if="!ordersLoading && undatedOrders > 0"
      class="print-hidden px-4 py-3 rounded-xl bg-warn-100 text-warn-700 text-sm"
      role="alert"
    >
      {{ undatedOrders }} pesanan tidak punya tanggal yang terbaca, jadi tidak masuk laporan. Cek daftar
      <code>ORDER_DATE_KEYS</code> di bagian atas file ini.
    </div>

    <!-- ==================== RINGKASAN BULAN ==================== -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-card shadow-card p-4">
        <p class="text-[12px] text-ink-400">Total pendapatan</p>
        <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ amount(cur.total) }}</p>
        <p
          v-if="change !== null"
          :class="['text-[11px] mt-0.5', change > 0 ? 'text-ok-600' : change < 0 ? 'text-danger-600' : 'text-ink-400']"
        >
          {{ change > 0 ? 'Naik' : change < 0 ? 'Turun' : 'Sama' }}
          <template v-if="change !== 0">{{ Math.abs(change) }}%</template>
          dari bulan lalu
        </p>
        <p v-else class="text-[11px] text-ink-400 mt-0.5">Bulan lalu belum ada pendapatan</p>
      </div>

      <div class="bg-white rounded-card shadow-card p-4">
        <p class="text-[12px] text-ink-400">Pesanan desain</p>
        <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ monthOrders.length }}</p>
        <p class="text-[11px] text-ink-400 mt-0.5">Nilai {{ amount(cur.orders) }}</p>
      </div>

      <div class="bg-white rounded-card shadow-card p-4">
        <p class="text-[12px] text-ink-400">Penjualan produk</p>
        <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ unitsSold }} <span class="text-[13px] font-normal text-ink-400">unit</span></p>
        <p class="text-[11px] text-ink-400 mt-0.5">{{ amount(cur.products) }} dari {{ monthSales.length }} transaksi</p>
      </div>

      <div class="bg-white rounded-card shadow-card p-4">
        <p class="text-[12px] text-ink-400">Produk baru dipesan</p>
        <p class="text-[22px] font-semibold text-ink-900 mt-1">{{ monthNewProducts.length }}</p>
        <p class="text-[11px] text-ink-400 mt-0.5">Dipesan ke designer bulan ini</p>
      </div>
    </div>

    <!-- ==================== TREN 6 BULAN ==================== -->
    <div class="bg-white rounded-card shadow-card p-5">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h3 class="text-[15px] font-semibold text-ink-900">Pendapatan 6 bulan terakhir</h3>
        <div class="flex items-center gap-4 text-[12px] text-ink-500">
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-brand-500"></span>Pesanan desain</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-gold-500"></span>Penjualan produk</span>
        </div>
      </div>

      <div class="flex items-end gap-3 h-36">
        <div v-for="t in trend" :key="t.key" class="flex-1 h-full flex flex-col justify-end">
          <div
            v-if="t.total > 0"
            class="w-full flex flex-col-reverse rounded-t-md overflow-hidden"
            :style="{ height: `${Math.max((t.total / trendMax) * 100, 4)}%` }"
            :title="`${monthName(t.key, { month: 'long', year: 'numeric' })}: ${amount(t.total)}`"
          >
            <div class="bg-brand-500" :style="{ flexGrow: t.orders }"></div>
            <div class="bg-gold-500" :style="{ flexGrow: t.products }"></div>
          </div>
        </div>
      </div>
      <div class="flex gap-3 mt-2">
        <div
          v-for="t in trend"
          :key="t.key"
          :class="['flex-1 text-center text-[11px]', t.key === selectedMonth ? 'font-semibold text-ink-800' : 'text-ink-400']"
        >
          {{ t.label }}
        </div>
      </div>
    </div>

    <!-- ==================== PESANAN DESAIN ==================== -->
    <section class="space-y-4">
      <h2 class="text-[13px] font-medium text-ink-500">Pesanan desain</h2>

      <div v-if="ordersLoading" class="bg-white rounded-card shadow-card p-6 text-center text-[13px] text-ink-400">
        Memuat pesanan...
      </div>

      <template v-else>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Per status -->
          <div class="bg-white rounded-card shadow-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900 mb-3">Per status</h3>
            <table class="w-full text-[13px]">
              <thead>
                <tr class="text-ink-400 text-left border-b border-ink-100">
                  <th class="py-2 font-medium">Status</th>
                  <th class="py-2 font-medium text-right">Jumlah</th>
                  <th class="py-2 font-medium text-right">Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in statusRows" :key="r.status" class="border-b border-ink-50 last:border-0">
                  <td class="py-2.5"><StatusBadge :status="r.status" /></td>
                  <td class="py-2.5 text-right tabular-nums text-ink-700">{{ r.count }}</td>
                  <td class="py-2.5 text-right tabular-nums text-ink-700">{{ amount(r.value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Per kategori -->
          <div class="bg-white rounded-card shadow-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900 mb-3">Per kategori</h3>
            <p v-if="categoryRows.length === 0" class="text-[13px] text-ink-400 py-6 text-center">
              Tidak ada pesanan pada bulan ini.
            </p>
            <table v-else class="w-full text-[13px]">
              <thead>
                <tr class="text-ink-400 text-left border-b border-ink-100">
                  <th class="py-2 font-medium">Kategori</th>
                  <th class="py-2 font-medium text-right">Jumlah</th>
                  <th class="py-2 font-medium text-right">Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in categoryRows" :key="r.name" class="border-b border-ink-50 last:border-0">
                  <td class="py-2.5 font-medium text-ink-800">{{ r.name }}</td>
                  <td class="py-2.5 text-right tabular-nums text-ink-700">{{ r.count }}</td>
                  <td class="py-2.5 text-right tabular-nums text-ink-700">{{ amount(r.value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Daftar pesanan -->
        <div class="bg-white rounded-card shadow-card overflow-hidden">
          <div class="px-5 py-4 border-b border-ink-100">
            <h3 class="text-[15px] font-semibold text-ink-900">Daftar pesanan</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-[13px]">
              <thead>
                <tr class="bg-cream-100 text-ink-500 text-left">
                  <th class="px-4 py-3 font-medium whitespace-nowrap">Tanggal</th>
                  <th class="px-4 py-3 font-medium whitespace-nowrap">Pembeli</th>
                  <th class="px-4 py-3 font-medium whitespace-nowrap">Kategori</th>
                  <th class="px-4 py-3 font-medium whitespace-nowrap">Karakter</th>
                  <th class="px-4 py-3 font-medium text-right whitespace-nowrap">Harga</th>
                  <th class="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in monthOrders" :key="o.id" class="border-b border-ink-50">
                  <td class="px-4 py-3 text-ink-500 whitespace-nowrap">{{ formatDateTime(orderDate(o)) }}</td>
                  <td class="px-4 py-3 font-medium text-ink-800">{{ o.buyerName || '—' }}</td>
                  <td class="px-4 py-3 text-ink-600">{{ o.category || '—' }}</td>
                  <td class="px-4 py-3 text-ink-600">{{ o.characterType || '—' }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-ink-700">{{ amount(orderValue(o)) }}</td>
                  <td class="px-4 py-3"><StatusBadge :status="o.status" /></td>
                </tr>
                <tr v-if="monthOrders.length === 0">
                  <td colspan="6" class="px-4 py-10 text-center text-ink-400">Tidak ada pesanan pada bulan ini.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </section>

    <!-- ==================== PENJUALAN PRODUK ==================== -->
    <section class="space-y-4">
      <h2 class="text-[13px] font-medium text-ink-500">Penjualan produk</h2>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Produk terlaris -->
        <div class="bg-white rounded-card shadow-card p-5">
          <h3 class="text-[15px] font-semibold text-ink-900 mb-3">Produk terlaris</h3>
          <p v-if="topProductRows.length === 0" class="text-[13px] text-ink-400 py-6 text-center">
            Belum ada penjualan produk pada bulan ini.
          </p>
          <table v-else class="w-full text-[13px]">
            <thead>
              <tr class="text-ink-400 text-left border-b border-ink-100">
                <th class="py-2 font-medium">Produk</th>
                <th class="py-2 font-medium text-right">Unit</th>
                <th class="py-2 font-medium text-right">Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in topProductRows" :key="r.id" class="border-b border-ink-50 last:border-0">
                <td class="py-2.5 font-medium text-ink-800">
                  <router-link :to="`/produk/${r.id}`" class="hover:text-brand-600 transition">{{ r.name }}</router-link>
                </td>
                <td class="py-2.5 text-right tabular-nums text-ink-700">{{ r.units }}</td>
                <td class="py-2.5 text-right tabular-nums text-ink-700">{{ amount(r.value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Per platform -->
        <div class="bg-white rounded-card shadow-card p-5">
          <h3 class="text-[15px] font-semibold text-ink-900 mb-3">Per platform</h3>
          <p v-if="platformRows.length === 0" class="text-[13px] text-ink-400 py-6 text-center">
            Belum ada penjualan produk pada bulan ini.
          </p>
          <table v-else class="w-full text-[13px]">
            <thead>
              <tr class="text-ink-400 text-left border-b border-ink-100">
                <th class="py-2 font-medium">Platform</th>
                <th class="py-2 font-medium text-right">Unit</th>
                <th class="py-2 font-medium text-right">Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in platformRows" :key="r.name" class="border-b border-ink-50 last:border-0">
                <td class="py-2.5 font-medium text-ink-800">{{ r.name }}</td>
                <td class="py-2.5 text-right tabular-nums text-ink-700">{{ r.units }}</td>
                <td class="py-2.5 text-right tabular-nums text-ink-700">{{ amount(r.value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Daftar transaksi -->
      <div class="bg-white rounded-card shadow-card overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100">
          <h3 class="text-[15px] font-semibold text-ink-900">Daftar transaksi</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-[13px]">
            <thead>
              <tr class="bg-cream-100 text-ink-500 text-left">
                <th class="px-4 py-3 font-medium whitespace-nowrap">Tanggal &amp; jam</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Pembeli</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Produk</th>
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
                <td class="px-4 py-3 text-ink-600">{{ s.platform || '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-ink-700">{{ s.qty }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-ink-700 font-medium">{{ amount(saleValue(s)) }}</td>
              </tr>
              <tr v-if="monthSales.length === 0">
                <td colspan="6" class="px-4 py-10 text-center text-ink-400">Belum ada transaksi pada bulan ini.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ==================== PRODUK BARU DIPESAN ==================== -->
    <section class="space-y-4">
      <h2 class="text-[13px] font-medium text-ink-500">Produk baru dipesan</h2>

      <div class="bg-white rounded-card shadow-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-[13px]">
            <thead>
              <tr class="bg-cream-100 text-ink-500 text-left">
                <th class="px-4 py-3 font-medium whitespace-nowrap">Tanggal pesan</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Produk</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Style</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Designer</th>
                <th class="px-4 py-3 font-medium whitespace-nowrap">Status produksi</th>
                <th class="px-4 py-3 font-medium text-right whitespace-nowrap">Harga</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in monthNewProducts" :key="p.id" class="border-b border-ink-50">
                <td class="px-4 py-3 text-ink-500 whitespace-nowrap">{{ formatDateTime(p.date) }}</td>
                <td class="px-4 py-3 font-medium text-ink-800">
                  <router-link :to="`/produk/${p.id}`" class="hover:text-brand-600 transition">{{ p.name }}</router-link>
                </td>
                <td class="px-4 py-3 text-ink-600">{{ [p.style, p.substyle].filter(Boolean).join(' / ') || '—' }}</td>
                <td class="px-4 py-3 text-ink-600">{{ p.designer || '—' }}</td>
                <td class="px-4 py-3 text-ink-600">{{ p.productionStatus || '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-ink-700">{{ p.price ? amount(p.price) : '—' }}</td>
              </tr>
              <tr v-if="monthNewProducts.length === 0">
                <td colspan="6" class="px-4 py-10 text-center text-ink-400">Tidak ada produk yang dipesan pada bulan ini.</td>
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
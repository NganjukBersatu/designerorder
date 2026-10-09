<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBundles } from '../composables/useBundles'
import { fetchProductPage, formatPrice, formatDateTime, nowLocal } from '../composables/useProducts'
import { useProductOverview } from '../composables/useProductOverview'
import { useOptions } from '../composables/useOptions'
import BundleForm from '../components/BundleForm.vue'
import PlatformBadges from '../components/PlatformBadges.vue'
import PlatformPicker from '../components/PlatformPicker.vue'
import SearchInput from '../components/SearchInput.vue'
import Pager from '../components/Pager.vue'
import { api } from '../utils/api.js'

const route = useRoute()
const router = useRouter()
const { loadBundle, updateBundle, removeBundle, addSale, updateSale, removeSale } = useBundles()
const { substyles: usedSubstyles } = useProductOverview()
const { optionsOf, mergeOptions } = useOptions()

const bundle = ref(null)
const loading = ref(true)
const errorMsg = ref('')
const actionError = ref('')

async function load() {
  errorMsg.value = ''
  try {
    bundle.value = await loadBundle(route.params.id)
    await loadSaleRows()
    if (route.query.jual) {
      router.replace({ query: {} }) // buka form sekali saja
      openSale()
    }
  } catch (err) {
    bundle.value = null
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
watch(() => route.params.id, load, { immediate: true })

const input = 'w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white text-ink-800 focus:border-brand-400 outline-none text-sm transition'
// ===== Riwayat penjualan (cari + halaman dikerjakan di server) =====
const saleSearch = ref('')
const salePage = ref(1)
const saleRows = ref([])
const saleMeta = ref({ page: 1, limit: 20, totalPages: 1, total: 0 })
const saleLoading = ref(false)
const salesCount = computed(() => bundle.value?.salesCount || 0)

async function loadSaleRows() {
  saleLoading.value = true
  try {
    const q = new URLSearchParams({ page: salePage.value, limit: saleMeta.value.limit })
    if (saleSearch.value) q.set('search', saleSearch.value)
    const res = await api.get(`/bundles/${route.params.id}/sales?${q}`)
    saleRows.value = res.data
    saleMeta.value = res.pagination
  } catch (err) {
    saleRows.value = []
  } finally {
    saleLoading.value = false
  }
}
function goSalePage(p) {
  salePage.value = p
  loadSaleRows()
}
watch(saleSearch, () => { salePage.value = 1; loadSaleRows() })
watch(() => route.params.id, () => { saleSearch.value = ''; salePage.value = 1 })
const itemsTotal = computed(() => (bundle.value?.items || []).reduce((s, p) => s + (p.price || 0), 0))
const substyleOptions = computed(() => mergeOptions('substyle', [...usedSubstyles.value].sort()))

// Kandidat isi bundling dimuat dari server saat dialog dibuka (filter kategori + mata uang di server),
// per halaman dan bisa dicari — bukan menyaring semua produk di browser.
const candidates = ref([])
const candidateSearch = ref('')
const candidateMeta = ref({ page: 1, totalPages: 1, total: 0 })
const candidatesLoading = ref(false)
const CANDIDATE_PAGE = 30
let candidateTimer = null

async function loadCandidates(page = 1) {
  if (!bundle.value) return
  candidatesLoading.value = true
  try {
    const res = await fetchProductPage({
      style: bundle.value.style,
      currency: bundle.value.currency,
      search: candidateSearch.value.trim(),
      page,
      limit: CANDIDATE_PAGE,
    })
    candidates.value = page === 1 ? res.data : [...candidates.value, ...res.data]
    candidateMeta.value = res.pagination || { page, totalPages: 1, total: res.data.length }
  } catch (err) {
    actionError.value = err.message
  } finally {
    candidatesLoading.value = false
  }
}
function onCandidateSearch() {
  clearTimeout(candidateTimer)
  candidateTimer = setTimeout(() => loadCandidates(1), 250)
}
function openAddItems() {
  toAdd.value = []
  candidateSearch.value = ''
  candidates.value = []
  showAddItems.value = true
  loadCandidates(1)
}

// ===== Edit info =====
const showEdit = ref(false)
const saving = ref(false)
async function saveEdit(payload) {
  saving.value = true
  actionError.value = ''
  try {
    await updateBundle(bundle.value.id, payload)
    showEdit.value = false
    await load()
  } catch (err) {
    actionError.value = err.message
  } finally {
    saving.value = false
  }
}

// ===== Isi bundling =====
const showAddItems = ref(false)
const toAdd = ref([])
async function change(patch) {
  actionError.value = ''
  try {
    await updateBundle(bundle.value.id, patch)
    await load()
    return true
  } catch (err) {
    actionError.value = err.message
    return false
  }
}
async function removeItem(item) {
  if (bundle.value.items.length <= 2) {
    actionError.value = 'Bundling minimal berisi 2 produk. Hapus bundlingnya kalau sudah tidak diperlukan.'
    return
  }
  await change({ removeProductIds: [item.id] })
}
async function confirmAddItems() {
  if (!toAdd.value.length) return
  if (await change({ addProductIds: toAdd.value })) {
    showAddItems.value = false
    toAdd.value = []
  }
}

// ===== Hapus bundling =====
const showDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')
async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await removeBundle(bundle.value.id)
    router.replace(`/kategori/${encodeURIComponent(bundle.value.style)}`)
  } catch (err) {
    deleteError.value = err.message
  } finally {
    deleting.value = false
  }
}

// ===== Penjualan =====
const showSale = ref(false)
const editingSaleId = ref(null)
const saleForm = ref({})
const saleError = ref('')
function openSale(sale = null) {
  editingSaleId.value = sale?.id || null
  saleError.value = ''
  saleForm.value = sale
    ? { buyer: sale.buyer, qty: sale.qty, platform: sale.platform || '', total: sale.total ?? '', soldAt: String(sale.soldAt).slice(0, 16) }
    : { buyer: '', qty: 1, platform: '', total: '', soldAt: nowLocal() }
  showSale.value = true
}
async function saveSale() {
  const f = saleForm.value
  if (!f.buyer.trim()) return (saleError.value = 'Nama pembeli wajib diisi')
  if (!f.soldAt) return (saleError.value = 'Tanggal & jam terjual wajib diisi')
  const payload = { buyer: f.buyer.trim(), qty: Number(f.qty) || 1, platform: f.platform.trim(), soldAt: f.soldAt }
  if (f.total !== '' && f.total !== null) payload.total = Number(f.total)
  try {
    if (editingSaleId.value) await updateSale(bundle.value.id, editingSaleId.value, payload)
    else await addSale(bundle.value.id, payload)
    showSale.value = false
    await load()
  } catch (err) {
    saleError.value = err.message
  }
}
async function deleteSale(sale) {
  actionError.value = ''
  try {
    await removeSale(bundle.value.id, sale.id)
    await load()
  } catch (err) {
    actionError.value = err.message
  }
}
</script>

<template>
  <div class="space-y-4">
    <button
      class="text-[13px] text-ink-500 hover:text-ink-700 flex items-center gap-1.5"
      @click="router.push(bundle ? `/kategori/${encodeURIComponent(bundle.style)}` : '/kategori')"
    >
      ← Kembali ke kategori
    </button>

    <div v-if="loading" class="h-48 rounded-card bg-white shadow-card animate-pulse" />
    <div v-else-if="errorMsg" class="bg-white rounded-card shadow-card p-6 text-center">
      <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
      <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="router.push('/kategori')">Ke Kategori</button>
    </div>

    <template v-else-if="bundle">
      <!-- Kepala -->
      <div class="bg-white rounded-card shadow-card p-5 flex flex-wrap items-start gap-5">
        <div class="w-28 h-28 shrink-0 rounded-xl overflow-hidden border border-ink-100 bg-cream-100 flex items-center justify-center">
          <img v-if="bundle.image" :src="bundle.image" :alt="bundle.name" class="w-full h-full object-cover" />
          <span v-else class="text-[11px] text-ink-300">Belum ada gambar</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="inline-flex px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-[12px] font-medium">Bundling</span>
            <span class="inline-flex px-2.5 py-1 rounded-full bg-cream-100 text-ink-600 text-[12px] font-medium">{{ bundle.style }}<template v-if="bundle.substyle"> · {{ bundle.substyle }}</template></span>
          </div>
          <h1 class="text-[21px] font-semibold text-ink-900 break-words">{{ bundle.name }}</h1>
          <p class="text-[24px] font-semibold text-ink-900 mt-1">{{ formatPrice(bundle.price, bundle.currency) }}</p>
          <p class="text-[12px] text-ink-400">Jika dibeli satuan: {{ formatPrice(itemsTotal, bundle.currency) }}</p>
          <div class="mt-2"><PlatformBadges :platform="bundle.platform" /></div>
          <div v-if="bundle.linkDbs.length" class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a v-for="(l, i) in bundle.linkDbs" :key="i" :href="l" target="_blank" rel="noopener noreferrer" class="text-[13px] text-brand-600 hover:underline">
              {{ bundle.linkDbs.length > 1 ? `Dropbox ${i + 1}` : 'Buka Dropbox' }}
            </a>
          </div>
          <p v-if="bundle.note" class="mt-3 text-[13px] text-ink-500 whitespace-pre-line">{{ bundle.note }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium shadow-sm transition" @click="openSale()">Catat Penjualan</button>
          <button class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-500/5 text-sm font-medium transition" @click="showEdit = true">Edit</button>
          <button class="px-4 py-2.5 rounded-xl text-danger-600 hover:bg-danger-50 text-sm font-medium transition" @click="deleteError = ''; showDelete = true">Hapus</button>
        </div>
      </div>

      <p v-if="actionError" class="text-sm text-danger-600 bg-danger-50 rounded-xl px-4 py-3">{{ actionError }}</p>

      <div class="fx-grid [--fx-min:11rem] gap-4">
        <div class="bg-white rounded-card shadow-card p-5">
          <p class="text-[13px] text-ink-500 mb-1.5">Total Terjual</p>
          <p class="text-[26px] font-semibold text-ink-900">{{ bundle.soldQty }}</p>
        </div>
        <div class="bg-white rounded-card shadow-card p-5">
          <p class="text-[13px] text-ink-500 mb-1.5">Transaksi</p>
          <p class="text-[26px] font-semibold text-ink-900">{{ bundle.salesCount }}</p>
        </div>
        <div class="bg-white rounded-card shadow-card p-5">
          <p class="text-[13px] text-ink-500 mb-1.5">Status</p>
          <span :class="['inline-flex px-2.5 py-1 rounded-full text-[12px] font-medium', bundle.soldQty > 0 ? 'bg-ok-100 text-ok-700' : 'bg-warn-100 text-warn-700']">
            {{ bundle.soldQty > 0 ? 'Terjual' : 'Belum Terjual' }}
          </span>
        </div>
      </div>

      <!-- Isi bundling -->
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h2 class="text-[15px] font-semibold text-ink-900">Isi bundling <span class="text-ink-400 font-normal">({{ bundle.items.length }} produk)</span></h2>
          <button class="text-sm font-medium text-brand-600 hover:underline" @click="openAddItems">+ Tambah produk</button>
        </div>
        <ul class="divide-y divide-ink-100">
          <li v-for="p in bundle.items" :key="p.id" class="flex items-center gap-3 py-2.5">
            <router-link :to="`/produk/${p.id}`" class="flex items-center gap-3 min-w-0 flex-1 group">
              <div class="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-ink-100 bg-cream-100">
                <img v-if="p.image" :src="p.image" :alt="p.name" class="w-full h-full object-cover" loading="lazy" />
              </div>
              <span class="truncate text-sm font-medium text-ink-800 group-hover:text-brand-600 transition">{{ p.name }}</span>
            </router-link>
            <span class="text-[13px] text-ink-500 tabular-nums">{{ formatPrice(p.price, p.currency) }}</span>
            <button class="px-3 py-1.5 rounded-lg text-[13px] text-danger-600 hover:bg-danger-50 transition" @click="removeItem(p)">Keluarkan</button>
          </li>
        </ul>
      </div>

      <!-- Penjualan -->
      <div class="bg-white rounded-card shadow-card overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h2 class="text-[15px] font-semibold text-ink-900">Riwayat penjualan</h2>
          <SearchInput
            v-if="salesCount || saleSearch"
            v-model="saleSearch"
            variant="soft"
            class="w-full lg:w-72 shrink-0"
            placeholder="Cari pembeli atau platform..."
          />
        </div>
        <div v-if="!saleRows.length" class="py-10 text-center text-sm text-ink-400">
          <template v-if="salesCount === 0 && !saleSearch">Belum ada penjualan. Klik <strong>Catat Penjualan</strong> untuk pembeli pertama.</template>
          <template v-else>Tidak ada transaksi yang cocok dengan pencarian.</template>
        </div>
        <div v-else class="overflow-x-auto">
          <table v-rtable class="rtable w-full text-sm">
            <thead>
              <tr class="bg-cream-100 text-ink-500 border-b border-ink-100">
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap">Pembeli</th>
                <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap">Jumlah</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap">Platform</th>
                <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap">Total</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap">Tanggal &amp; Jam</th>
                <th class="px-4 py-3.5 text-center font-medium whitespace-nowrap w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in saleRows" :key="s.id" class="border-b border-ink-50 hover:bg-cream-50/70 transition cursor-pointer" @click="router.push(`/bundling/${bundle.id}/penjualan/${s.id}`)">
                <td class="px-4 py-4 font-medium text-ink-800">{{ s.buyer }}</td>
                <td class="px-4 py-4 text-right tabular-nums">{{ s.qty }}</td>
                <td class="px-4 py-4"><PlatformBadges :platform="s.platform" /></td>
                <td class="px-4 py-4 text-right tabular-nums font-medium">{{ formatPrice(s.total ?? bundle.price * s.qty, s.currency || bundle.currency) }}</td>
                <td class="px-4 py-4 text-ink-500 text-[13px] whitespace-nowrap">{{ formatDateTime(s.soldAt) }}</td>
                <td class="px-4 py-4 text-center cursor-default" @click.stop>
                  <div class="flex items-center justify-center gap-1">
                    <button class="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition" title="Edit transaksi" aria-label="Edit transaksi" @click="openSale(s)">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button class="p-1.5 rounded-lg hover:bg-danger-50 text-danger-600 transition" title="Hapus transaksi" aria-label="Hapus transaksi" @click="deleteSale(s)">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pager :pagination="saleMeta" label="transaksi" :loading="saleLoading" @page="goSalePage" />
      </div>
    </template>

    <BundleForm
      :open="showEdit"
      mode="edit"
      :category="bundle?.style || ''"
      :bundle="bundle"
      :substyle-options="substyleOptions"
      :platform-options="optionsOf('platform')"
      :saving="saving"
      :error="actionError"
      @close="showEdit = false"
      @save="saveEdit"
    />

    <!-- Tambah isi -->
    <Teleport to="body">
      <div v-if="showAddItems" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="showAddItems = false"></div>
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h3 class="text-base font-semibold text-ink-900 mb-1">Tambah produk ke bundling</h3>
          <p class="text-[13px] text-ink-500 mb-3">Hanya produk satuan di kategori {{ bundle?.style }} dengan mata uang {{ bundle?.currency }}.</p>
          <input
            v-model="candidateSearch"
            type="text"
            placeholder="Cari produk..."
            class="w-full mb-2 px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm outline-none focus:border-brand-400"
            @input="onCandidateSearch"
          />
          <div class="max-h-64 overflow-y-auto rounded-xl border border-ink-200 divide-y divide-ink-100">
            <label v-for="p in candidates" :key="p.id" class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-cream-50">
              <input v-model="toAdd" type="checkbox" :value="p.id" class="w-4 h-4 accent-brand-500" />
              <span class="flex-1 min-w-0 truncate text-sm">{{ p.name }}</span>
              <span class="text-[13px] text-ink-500 tabular-nums">{{ formatPrice(p.price, p.currency) }}</span>
            </label>
            <p v-if="!candidates.length && !candidatesLoading" class="px-3 py-6 text-center text-sm text-ink-400">Tidak ada produk satuan lain di kategori ini.</p>
            <button
              v-if="candidateMeta.page < candidateMeta.totalPages"
              type="button"
              class="w-full px-3 py-2 text-[13px] text-brand-600 hover:bg-cream-50 disabled:opacity-50"
              :disabled="candidatesLoading"
              @click="loadCandidates(candidateMeta.page + 1)"
            >Muat lebih banyak ({{ candidateMeta.total - candidates.length }} lagi)</button>
          </div>
          <div class="flex justify-end gap-3 mt-4">
            <button class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 text-sm font-medium" @click="showAddItems = false">Batal</button>
            <button :disabled="!toAdd.length" class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium disabled:opacity-50" @click="confirmAddItems">Tambahkan</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Hapus bundling -->
    <Teleport to="body">
      <div v-if="showDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="showDelete = false"></div>
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-base font-semibold text-ink-900 mb-1.5">Hapus bundling?</h3>
          <p class="text-[13.5px] text-ink-500 mb-3">
            Bundling "<strong>{{ bundle?.name }}</strong>" dihapus. Produk di dalamnya kembali menjadi produk satuan (tidak ikut terhapus).
          </p>
          <p v-if="deleteError" class="text-[13px] text-danger-600 mb-3">{{ deleteError }}</p>
          <div class="flex justify-end gap-3">
            <button class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 text-[13.5px] font-medium" @click="showDelete = false">Batal</button>
            <button :disabled="deleting" class="px-4 py-2.5 rounded-xl bg-danger-500 hover:bg-danger-600 text-white text-[13.5px] font-medium disabled:opacity-60" @click="confirmDelete">
              {{ deleting ? 'Menghapus…' : 'Ya, hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Catat / edit penjualan -->
    <Teleport to="body">
      <div v-if="showSale" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" @click="showSale = false"></div>
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-ink-100"><h2 class="text-lg font-semibold text-ink-900">{{ editingSaleId ? 'Edit Penjualan' : 'Catat Penjualan' }}</h2></div>
          <div class="px-6 py-5 fx-grid [--fx-min:12rem] gap-4">
            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Nama Pembeli</label>
              <input v-model="saleForm.buyer" type="text" :class="input" placeholder="Nama pembeli" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Jumlah</label>
              <input v-model.number="saleForm.qty" type="number" min="1" :class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Total ({{ bundle?.currency }})</label>
              <input v-model="saleForm.total" type="number" min="0" step="0.5" :class="input" :placeholder="`Otomatis ${formatPrice((bundle?.price || 0) * (Number(saleForm.qty) || 1), bundle?.currency)}`" />
            </div>
            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Platform</label>
              <PlatformPicker v-model="saleForm.platform" :options="optionsOf('platform')" />
            </div>
            <div class="fx-full">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Tanggal &amp; Jam Terjual</label>
              <input v-model="saleForm.soldAt" type="datetime-local" :class="input" />
            </div>
            <p v-if="saleError" class="fx-full text-sm text-danger-600">{{ saleError }}</p>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-ink-100 bg-cream-50 rounded-b-2xl">
            <button class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 text-sm font-medium" @click="showSale = false">Batal</button>
            <button class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium shadow-sm" @click="saveSale">Simpan</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

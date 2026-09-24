<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../utils/api.js'
import { amount, shortDate, STATUS_LABEL } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.vue'
import Modal from '../components/Modal.vue'
import OrderForm from '../components/OrderForm.vue'

const router = useRouter()
const orders = ref([])
const loading = ref(true)
const errorMsg = ref('')
const search = ref('')
const status = ref('all')
const showCreate = ref(false)

// --- Statistik status (kartu ringkasan, seperti di halaman Tugas) ---
const stats = ref({ pending: 0, progress: 0, done: 0 })

async function loadStats() {
  try {
    const [pending, progress, done] = await Promise.all([
      api.get('/orders?status=Pending&page=1&limit=1'),
      api.get('/orders?status=Progress&page=1&limit=1'),
      api.get('/orders?status=Done&page=1&limit=1'),
    ])
    stats.value = {
      pending: pending.pagination?.total ?? 0,
      progress: progress.pagination?.total ?? 0,
      done: done.pagination?.total ?? 0,
    }
  } catch {
    // statistik bukan data kritikal, diamkan saja kalau gagal
  }
}

// --- Dropdown status custom ---
const statusOptions = [
  { value: 'all', label: 'Semua status' },
  { value: 'Pending', label: 'Menunggu' },
  { value: 'Progress', label: 'Dikerjakan' },
  { value: 'Done', label: 'Selesai' },
]
const statusOpen = ref(false)
const statusDropdownRef = ref(null)
const statusLabel = computed(() => statusOptions.find((o) => o.value === status.value)?.label || 'Semua status')

function selectStatus(value) {
  status.value = value
  statusOpen.value = false
}

function onClickOutsideStatus(e) {
  if (statusDropdownRef.value && !statusDropdownRef.value.contains(e.target)) {
    statusOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickOutsideStatus))
onUnmounted(() => document.removeEventListener('click', onClickOutsideStatus))

// --- Pagination ---
const page = ref(1)
const limit = ref(10)
const pagination = ref(null) // { page, limit, total, totalPages }

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = new URLSearchParams()
    if (search.value) params.set('search', search.value)
    if (status.value !== 'all') params.set('status', status.value)
    params.set('page', page.value)
    params.set('limit', limit.value)
    const qs = params.toString()
    const res = await api.get(`/orders${qs ? `?${qs}` : ''}`)
    orders.value = res.data
    pagination.value = res.pagination
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

// Reset ke halaman 1 setiap kali filter berubah, lalu muat ulang
function resetAndLoad() {
  page.value = 1
  load()
}

let debounceTimer
watch(search, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(resetAndLoad, 300)
})
watch(status, resetAndLoad)
watch(page, load)
onMounted(load)
onMounted(loadStats)

// Fungsi remove() lama sudah digantikan askDelete() + confirmDelete() di atas

function onCreated() {
  showCreate.value = false
  resetAndLoad()
  loadStats()
}

// --- Konfirmasi hapus custom (ganti confirm() bawaan browser) ---
const deleteTarget = ref(null) // order yang mau dihapus, null = modal tertutup
const deleting = ref(false)

function askDelete(order) {
  deleteTarget.value = order
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/orders/${deleteTarget.value.id}`)
    showToast(`Pesanan untuk ${deleteTarget.value.buyerName} berhasil dihapus`, 'success')
    if (orders.value.length === 1 && page.value > 1) {
      page.value -= 1
    } else {
      load()
    }
    loadStats()
  } catch (err) {
    showToast(err.message || 'Gagal menghapus pesanan', 'error')
  } finally {
    deleting.value = false
    deleteTarget.value = null
  }
}

// --- Toast notification custom (ganti alert() bawaan browser) ---
const toast = ref(null) // { message, type }
let toastTimer
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

function goToPage(p) {
  if (p < 1 || (pagination.value && p > pagination.value.totalPages)) return
  page.value = p
}
</script>

<template>
  <div class="space-y-4">
    <!-- Tombol tambah, berdiri sendiri di baris atas (seperti halaman Tugas) -->
    <div class="flex justify-end">
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[13.5px] font-medium transition shrink-0"
        @click="showCreate = true"
      >
        + Pesanan baru
      </button>
    </div>

    <!-- Kartu statistik status pesanan -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-white rounded-card shadow-card border border-ink-100 px-5 py-4">
        <p class="text-[12.5px] text-ink-400">Menunggu</p>
        <p class="text-2xl font-semibold text-ink-900 mt-1 tabular-nums">{{ stats.pending }}</p>
      </div>
      <div class="bg-white rounded-card shadow-card border border-ink-100 px-5 py-4">
        <p class="text-[12.5px] text-ink-400">Dikerjakan</p>
        <p class="text-2xl font-semibold text-ink-900 mt-1 tabular-nums">{{ stats.progress }}</p>
      </div>
      <div class="bg-white rounded-card shadow-card border border-ink-100 px-5 py-4">
        <p class="text-[12.5px] text-ink-400">Selesai</p>
        <p class="text-2xl font-semibold text-ink-900 mt-1 tabular-nums">{{ stats.done }}</p>
      </div>
    </div>

    <!-- Search & filter status -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <input
        v-model="search"
        type="search"
        placeholder="Cari pembeli, kategori, atau toko..."
        class="w-full sm:w-72 rounded-lg border border-ink-200 px-3 py-2 text-[13.5px] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
      />
      <div ref="statusDropdownRef" class="relative w-full sm:w-44">
        <button
          type="button"
          class="w-full flex items-center justify-between rounded-lg border border-ink-200 pl-3 pr-2.5 py-2 text-[13.5px] text-ink-700 bg-white hover:border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer transition"
          @click="statusOpen = !statusOpen"
        >
          <span>{{ statusLabel }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="text-ink-400 transition-transform"
            :class="{ 'rotate-180': statusOpen }"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div
          v-if="statusOpen"
          class="absolute z-10 mt-1.5 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover overflow-hidden py-1"
        >
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            type="button"
            class="w-full text-left px-3 py-2 text-[13.5px] transition"
            :class="opt.value === status
              ? 'bg-brand-50 text-brand-700 font-medium'
              : 'text-ink-700 hover:bg-ink-50'"
            @click="selectStatus(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-card shadow-card-hover border border-ink-100 overflow-hidden">
      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 rounded-lg bg-ink-100 animate-pulse" />
      </div>
      <div v-else-if="errorMsg" class="p-6 text-center">
        <p class="text-danger-600 text-[13.5px] mb-3">{{ errorMsg }}</p>
        <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-[13px]" @click="load">Coba lagi</button>
      </div>
      <div v-else-if="orders.length === 0" class="p-10 text-center text-[13.5px] text-ink-400">
        Belum ada pesanan yang cocok.
      </div>
      <template v-else>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-cream-100 text-ink-500 border-b border-ink-100">
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap w-12">No</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Kategori</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Jenis Karakter</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Style</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Designer</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Platform</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Pembeli</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Tanggal</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Harga</th>
                <th class="px-5 py-3.5 text-left font-medium whitespace-nowrap">Status</th>
                <th class="px-5 py-3.5 text-right font-medium whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100 text-[13.5px]">
              <tr v-for="(o, index) in orders" :key="o.id" class="hover:bg-ink-50 transition">
                <td class="px-5 py-4 text-ink-400 tabular-nums">
                  {{ pagination ? (pagination.page - 1) * pagination.limit + index + 1 : index + 1 }}
                </td>
                <td class="px-5 py-4 text-ink-800 whitespace-nowrap">{{ o.category || '—' }}</td>
                <td class="px-5 py-4 text-ink-600 whitespace-nowrap">{{ o.characterType || '—' }}</td>
                <td class="px-5 py-4 text-ink-600 whitespace-nowrap">{{ o.style || '—' }}</td>
                <td class="px-5 py-4 text-ink-600 whitespace-nowrap">{{ o.designerName || '—' }}</td>
                <td class="px-5 py-4 text-ink-600 whitespace-nowrap">{{ o.storeName || '—' }}</td>
                <td class="px-5 py-4">
                  <p class="text-ink-800">{{ o.buyerName }}</p>
                  <p class="text-[12px] text-ink-400 mt-0.5">{{ o.buyerReference || '—' }}</p>
                </td>
                <td class="px-5 py-4 text-ink-500">{{ shortDate(o.orderDate) }}</td>
                <td class="px-5 py-4 font-medium text-ink-900">{{ amount(o.price) }}</td>
                <td class="px-5 py-4"><StatusBadge :status="o.status" /></td>
                <td class="px-5 py-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    class="text-brand-600 hover:underline text-[12.5px] font-medium transition mr-3"
                    @click="router.push(`/orders/${o.id}`)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="text-danger-500 hover:underline text-[12.5px] font-medium transition"
                    @click="askDelete(o)"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer: info jumlah data + navigasi halaman -->
        <div
          v-if="pagination"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-ink-100 text-[12.5px] text-ink-400"
        >
          <p>
            Menampilkan
            <span class="font-medium text-ink-600">
              {{ (pagination.page - 1) * pagination.limit + 1 }}–{{ Math.min(pagination.page * pagination.limit, pagination.total) }}
            </span>
            dari
            <span class="font-medium text-ink-600">{{ pagination.total }}</span>
            pesanan
          </p>

          <div v-if="pagination.totalPages > 1" class="flex items-center gap-1">
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-lg border border-ink-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-50 transition"
              :disabled="pagination.page <= 1"
              @click="goToPage(pagination.page - 1)"
            >
              Sebelumnya
            </button>
            <span class="px-2 text-ink-500">
              Hal {{ pagination.page }} / {{ pagination.totalPages }}
            </span>
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-lg border border-ink-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-50 transition"
              :disabled="pagination.page >= pagination.totalPages"
              @click="goToPage(pagination.page + 1)"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </template>
    </div>

    <Modal v-if="showCreate" title="Catat pesanan baru" @close="showCreate = false">
      <OrderForm @saved="onCreated" @cancel="showCreate = false" />
    </Modal>

    <!-- Modal konfirmasi hapus custom -->
    <Modal v-if="deleteTarget" title="Hapus pesanan?" @close="deleteTarget = null">
      <div class="space-y-5">
        <p class="text-[13.5px] text-ink-600">
          Pesanan <span class="font-medium text-ink-900">{{ deleteTarget.category }}</span>
          untuk <span class="font-medium text-ink-900">{{ deleteTarget.buyerName }}</span>
          akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div class="flex justify-end gap-2.5">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-ink-200 text-ink-600 text-[13.5px] font-medium hover:bg-ink-50 transition"
            :disabled="deleting"
            @click="deleteTarget = null"
          >
            Batal
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-danger-500 hover:bg-danger-600 text-white text-[13.5px] font-medium transition disabled:opacity-60"
            :disabled="deleting"
            @click="confirmDelete"
          >
            {{ deleting ? 'Menghapus...' : 'Ya, hapus' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Toast notification custom -->
    <Transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-card-hover text-[13.5px] font-medium text-white"
        :class="toast.type === 'error' ? 'bg-danger-600' : 'bg-brand-600'"
      >
        <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
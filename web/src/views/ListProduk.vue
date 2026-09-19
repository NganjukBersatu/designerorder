<template>
  <div class="w-full">
    <!-- Header hanya tombol -->
    <div class="mb-6 flex justify-end">
      <button
        @click="openAddModal"
        class="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Produk
      </button>
    </div>

    <!-- Search & Filter Bar -->
    <div class="mb-5 bg-white rounded-card shadow-card border border-ink-100 p-4">
      <div class="flex flex-col lg:flex-row gap-3">
        <div class="relative flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama, style, designer, platform..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm transition"
          />
        </div>

        <select
          v-model="filterSold"
          class="px-3 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm min-w-[150px]"
        >
          <option value="all">Semua Status</option>
          <option value="sold">Terjual</option>
          <option value="unsold">Belum Terjual</option>
        </select>

        <select
          v-model="filterStyle"
          class="px-3 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm min-w-[140px]"
        >
          <option value="all">Semua Style</option>
          <option v-for="style in uniqueStyles" :key="style" :value="style">
            {{ style }}
          </option>
        </select>

        <select
          v-model="filterPlatform"
          class="px-3 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm min-w-[150px]"
        >
          <option value="all">Semua Platform</option>
          <option v-for="plat in uniquePlatforms" :key="plat" :value="plat">
            {{ plat }}
          </option>
        </select>

        <button
          v-if="hasActiveFilter"
          @click="resetFilters"
          class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 text-sm font-medium transition whitespace-nowrap"
        >
          Reset
        </button>
      </div>

      <div v-if="hasActiveFilter" class="mt-3 text-xs text-ink-500">
        Menampilkan <span class="font-semibold text-ink-700">{{ filteredProducts.length }}</span> dari {{ products.length }} produk
      </div>
    </div>

    <!-- Table Card -->
    <div class="bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-cream-100 text-ink-700 border-b border-ink-100">
              <!-- Kolom No (sticky) -->
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap w-12 sticky left-0 z-20 bg-cream-100">
                No
              </th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[200px]">Nama Produk</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[110px]">Style</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[130px]">Substyle</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[110px]">Designer</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[160px]">Tanggal</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[130px]">Status Produksi</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[120px]">Platform</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[160px]">Link DB</th>
              <th class="px-4 py-3 text-right font-semibold whitespace-nowrap min-w-[100px]">Harga</th>
              <th class="px-4 py-3 text-center font-semibold whitespace-nowrap w-20">Sales</th>
              <th class="px-4 py-3 text-center font-semibold whitespace-nowrap min-w-[120px]">Status Jual</th>
              <th class="px-4 py-3 text-center font-semibold whitespace-nowrap w-28">Aksi</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[140px]">Catatan</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(item, index) in filteredProducts"
              :key="item.id"
              class="border-b border-ink-50 hover:bg-cream-50 transition group"
            >
              <!-- Kolom No (sticky) -->
              <td class="px-4 py-3 text-ink-500 sticky left-0 z-10 bg-white group-hover:bg-cream-50">
                {{ index + 1 }}
              </td>

              <td class="px-4 py-3 font-medium text-ink-800">{{ item.name || '—' }}</td>
              <td class="px-4 py-3 text-ink-700">{{ item.style || '—' }}</td>
              <td class="px-4 py-3 text-ink-700">{{ item.substyle || '—' }}</td>
              <td class="px-4 py-3 text-ink-700">{{ item.designer || '—' }}</td>
              <td class="px-4 py-3 text-ink-600 text-[13px]">
                {{ formatDate(item.date) }}
              </td>
              <td class="px-4 py-3 text-ink-700">{{ item.productionStatus || '—' }}</td>
              <td class="px-4 py-3 text-ink-700">{{ item.platform || '—' }}</td>
              <td class="px-4 py-3">
                <a
                  v-if="item.linkDb"
                  :href="item.linkDb"
                  target="_blank"
                  class="text-brand-600 hover:underline truncate block max-w-[160px]"
                >
                  {{ item.linkDb }}
                </a>
                <span v-else class="text-ink-400">—</span>
              </td>
              <td class="px-4 py-3 text-right text-ink-700">
                {{ item.price ? `$${item.price}` : '—' }}
              </td>
              <td class="px-4 py-3 text-center text-ink-700">{{ item.sales ?? 0 }}</td>
              <td class="px-4 py-3 text-center">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                    item.isSold ? 'bg-ok-100 text-ok-600' : 'bg-warn-100 text-warn-600'
                  ]"
                >
                  {{ item.isSold ? 'Terjual' : 'Belum Terjual' }}
                </span>
              </td>

              <!-- Aksi -->
              <td class="px-4 py-3 relative">
                <div class="flex items-center justify-center gap-1">
                  <button
                    v-if="!item.isSold"
                    @click="markAsSold(item)"
                    class="p-1.5 rounded-lg hover:bg-ok-100 text-ok-600 transition"
                    title="Tandai terjual"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    v-else
                    class="p-1.5 rounded-lg text-ink-300 cursor-default"
                    title="Sudah terjual"
                    disabled
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>

                  <button
                    @click.stop="toggleMenu(item.id, $event)"
                    class="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition"
                    title="Aksi lainnya"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6h.01M12 12h.01M12 18h.01" />
                    </svg>
                  </button>

                  <Teleport to="body">
                    <div
                      v-if="openMenuId === item.id"
                      class="aksi-menu fixed z-50 w-44 bg-white border border-ink-100 rounded-xl shadow-lg py-1 text-left"
                      :style="{ top: menuPos.top + 'px', left: menuPos.left + 'px' }"
                    >
                      <button
                        @click="openEditModal(item)"
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-cream-100 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        @click="removeRow(item.id)"
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </Teleport>
                </div>
              </td>

              <td class="px-4 py-3 text-ink-600">{{ item.note || '—' }}</td>
            </tr>

            <tr v-if="filteredProducts.length === 0">
              <td colspan="14" class="px-4 py-16 text-center text-ink-400">
                <template v-if="products.length === 0">
                  Belum ada data. Klik tombol <strong>Tambah Produk</strong> untuk mulai.
                </template>
                <template v-else>
                  Tidak ada produk yang cocok dengan filter / pencarian.
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== MODAL TAMBAH / EDIT ==================== -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
          @click="closeModal"
        ></div>

        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-ink-100">
            <h2 class="text-lg font-semibold text-ink-900">
              {{ isEditMode ? 'Edit Produk' : 'Tambah Produk Baru' }}
            </h2>
            <button
              @click="closeModal"
              class="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Nama Produk</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="Contoh: Bunny knit Sweater Outfit"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Style</label>
              <input
                v-model="form.style"
                type="text"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="Casual / Fantasy / Formal..."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Substyle</label>
              <input
                v-model="form.substyle"
                type="text"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="Daily outfit / Cyber..."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Designer</label>
              <input
                v-model="form.designer"
                type="text"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="Nama designer"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Tanggal</label>
              <input
                v-model="form.date"
                type="datetime-local"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Status Produksi</label>
              <input
                v-model="form.productionStatus"
                type="text"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="Preview / Done / Ready..."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Platform</label>
              <input
                v-model="form.platform"
                type="text"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="Booth / Etsy / Both"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Link DB</label>
              <input
                v-model="form.linkDb"
                type="url"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="https://..."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Harga ($)</label>
              <input
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.5"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="0.00"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Sales</label>
              <input
                v-model.number="form.sales"
                type="number"
                min="0"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                placeholder="0"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Catatan</label>
              <textarea
                v-model="form.note"
                rows="2"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition resize-none"
                placeholder="Catatan tambahan..."
              ></textarea>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-100 bg-cream-50 rounded-b-2xl">
            <button
              @click="closeModal"
              class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-white text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              @click="submitForm"
              class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
            >
              {{ isEditMode ? 'Simpan Perubahan' : 'Simpan Produk' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const products = ref([
  {
    id: 1,
    name: 'Bunny knit Sweater Outfit',
    style: 'Casual',
    substyle: 'Daily outfit',
    designer: 'Reni',
    date: '2026-04-10T14:30',
    productionStatus: 'Preview',
    platform: 'Etsy & Booth',
    linkDb: '',
    price: 12,
    sales: 2,
    isSold: false,
    note: ''
  },
  {
    id: 2,
    name: 'Mocha Street Set',
    style: 'Casual',
    substyle: 'Daily outfit',
    designer: 'Reni',
    date: '2026-04-15T09:00',
    productionStatus: 'Preview',
    platform: 'Booth',
    linkDb: '',
    price: 9,
    sales: 1,
    isSold: false,
    note: ''
  }
])

let nextId = 3

// ========== SEARCH & FILTER ==========
const searchQuery = ref('')
const filterSold = ref('all')
const filterStyle = ref('all')
const filterPlatform = ref('all')

const uniqueStyles = computed(() => {
  const styles = products.value.map(p => p.style).filter(Boolean)
  return [...new Set(styles)].sort()
})

const uniquePlatforms = computed(() => {
  const platforms = products.value.map(p => p.platform).filter(Boolean)
  return [...new Set(platforms)].sort()
})

const hasActiveFilter = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    filterSold.value !== 'all' ||
    filterStyle.value !== 'all' ||
    filterPlatform.value !== 'all'
  )
})

const filteredProducts = computed(() => {
  let result = products.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.style || '').toLowerCase().includes(q) ||
      (p.substyle || '').toLowerCase().includes(q) ||
      (p.designer || '').toLowerCase().includes(q) ||
      (p.platform || '').toLowerCase().includes(q) ||
      (p.productionStatus || '').toLowerCase().includes(q) ||
      (p.note || '').toLowerCase().includes(q)
    )
  }

  if (filterSold.value === 'sold') {
    result = result.filter(p => p.isSold === true)
  } else if (filterSold.value === 'unsold') {
    result = result.filter(p => p.isSold === false)
  }

  if (filterStyle.value !== 'all') {
    result = result.filter(p => p.style === filterStyle.value)
  }

  if (filterPlatform.value !== 'all') {
    result = result.filter(p => p.platform === filterPlatform.value)
  }

  return result
})

function resetFilters() {
  searchQuery.value = ''
  filterSold.value = 'all'
  filterStyle.value = 'all'
  filterPlatform.value = 'all'
}

// ========== MODAL ==========
const showModal = ref(false)
const isEditMode = ref(false)
const editingId = ref(null)

const form = ref({
  name: '',
  style: '',
  substyle: '',
  designer: '',
  date: '',
  productionStatus: '',
  platform: '',
  linkDb: '',
  price: 0,
  sales: 0,
  note: ''
})

function resetForm() {
  form.value = {
    name: '',
    style: '',
    substyle: '',
    designer: '',
    date: '',
    productionStatus: '',
    platform: '',
    linkDb: '',
    price: 0,
    sales: 0,
    note: ''
  }
}

function openAddModal() {
  isEditMode.value = false
  editingId.value = null
  resetForm()
  showModal.value = true
}

function openEditModal(item) {
  isEditMode.value = true
  editingId.value = item.id
  form.value = {
    name: item.name || '',
    style: item.style || '',
    substyle: item.substyle || '',
    designer: item.designer || '',
    date: item.date || '',
    productionStatus: item.productionStatus || '',
    platform: item.platform || '',
    linkDb: item.linkDb || '',
    price: item.price || 0,
    sales: item.sales || 0,
    note: item.note || ''
  }
  openMenuId.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function submitForm() {
  if (!form.value.name.trim()) {
    alert('Nama Produk wajib diisi')
    return
  }

  if (isEditMode.value) {
    const index = products.value.findIndex(p => p.id === editingId.value)
    if (index !== -1) {
      products.value[index] = {
        ...products.value[index],
        name: form.value.name.trim(),
        style: form.value.style.trim(),
        substyle: form.value.substyle.trim(),
        designer: form.value.designer.trim(),
        date: form.value.date,
        productionStatus: form.value.productionStatus.trim(),
        platform: form.value.platform.trim(),
        linkDb: form.value.linkDb.trim(),
        price: form.value.price || 0,
        sales: form.value.sales || 0,
        note: form.value.note.trim()
      }
    }
  } else {
    products.value.push({
      id: nextId++,
      name: form.value.name.trim(),
      style: form.value.style.trim(),
      substyle: form.value.substyle.trim(),
      designer: form.value.designer.trim(),
      date: form.value.date,
      productionStatus: form.value.productionStatus.trim(),
      platform: form.value.platform.trim(),
      linkDb: form.value.linkDb.trim(),
      price: form.value.price || 0,
      sales: form.value.sales || 0,
      isSold: false,
      note: form.value.note.trim()
    })
  }

  closeModal()
}

// ========== AKSI ==========
function markAsSold(item) {
  item.isSold = true
  openMenuId.value = null
}

function removeRow(id) {
  products.value = products.value.filter(p => p.id !== id)
  openMenuId.value = null
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// ========== DROPDOWN MENU ==========
const openMenuId = ref(null)
const menuPos = ref({ top: 0, left: 0 })

function toggleMenu(id, event) {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  const rect = event.currentTarget.getBoundingClientRect()
  const menuWidth = 176
  let left = rect.right - menuWidth
  if (left < 8) left = 8
  let top = rect.bottom + 4
  const menuHeight = 100
  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 4
  }
  menuPos.value = { top, left }
  openMenuId.value = id
}

function handleClickOutside(e) {
  const clickedToggleButton = e.target.closest('button[title="Aksi lainnya"]')
  const clickedInsideMenu = e.target.closest('.aksi-menu')
  if (!clickedToggleButton && !clickedInsideMenu) {
    openMenuId.value = null
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
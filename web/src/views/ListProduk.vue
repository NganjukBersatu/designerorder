<template>
  <div class="min-h-screen bg-cream-200 p-6">
    <!-- Header -->
    <div class="mb-6 flex justify-end">
      <button
        @click="addNewRow"
        class="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Produk
      </button>
    </div>

    <!-- Table Card -->
    <div class="bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-cream-100 text-ink-700 border-b border-ink-100">
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap w-12">No</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[200px]">Nama Produk</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[110px]">Style</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[130px]">Substyle</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[110px]">Designer</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[190px]">Tanggal</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[140px]">Status Produksi</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[120px]">Platform</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[180px]">Link DB</th>
              <th class="px-4 py-3 text-right font-semibold whitespace-nowrap min-w-[120px]">Harga</th>
              <th class="px-4 py-3 text-center font-semibold whitespace-nowrap w-20">Sales</th>
              <th class="px-4 py-3 text-center font-semibold whitespace-nowrap min-w-[120px]">Status Jual</th>
              <th class="px-4 py-3 text-center font-semibold whitespace-nowrap w-28">Aksi</th>
              <th class="px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[160px]">Catatan</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(item, index) in products"
              :key="item.id"
              class="border-b border-ink-50 hover:bg-cream-50 transition"
            >
              <!-- No -->
              <td class="px-4 py-3 text-ink-500">{{ index + 1 }}</td>

              <!-- Nama Produk -->
              <td class="px-4 py-3">
                <input
                  v-model="item.name"
                  :ref="(el) => setNameInputRef(item.id, el)"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                  placeholder="Nama outfit..."
                />
              </td>

              <!-- Style -->
              <td class="px-4 py-3">
                <input
                  v-model="item.style"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                  placeholder="Casual / Fantasy..."
                />
              </td>

              <!-- Substyle -->
              <td class="px-4 py-3">
                <input
                  v-model="item.substyle"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                  placeholder="Daily outfit / Cyber..."
                />
              </td>

              <!-- Designer -->
              <td class="px-4 py-3">
                <input
                  v-model="item.designer"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                  placeholder="Nama designer"
                />
              </td>

              <!-- Tanggal & Jam -->
              <td class="px-4 py-3">
                <input
                  v-model="item.date"
                  type="datetime-local"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition text-[13px]"
                />
              </td>

              <!-- Status Produksi -->
              <td class="px-4 py-3">
                <input
                  v-model="item.productionStatus"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                  placeholder="Preview / Done..."
                />
              </td>

              <!-- Platform -->
              <td class="px-4 py-3">
                <input
                  v-model="item.platform"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                  placeholder="Booth / Etsy / Both"
                />
              </td>

              <!-- Link DB -->
              <td class="px-4 py-3">
                <input
                  v-model="item.linkDb"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition text-brand-600"
                  placeholder="https://..."
                />
              </td>

              <!-- Harga -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-0.5">
                  <span
                    v-if="item.price"
                    class="text-ink-400 text-[13px] shrink-0"
                  >$</span>
                  <input
                    v-model.number="item.price"
                    type="number"
                    min="0"
                    step="0.5"
                    class="w-16 text-right bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                    placeholder="0.00"
                  />
                </div>
              </td>

              <!-- Sales -->
              <td class="px-4 py-3 text-center">
                <input
                  v-model.number="item.sales"
                  type="number"
                  min="0"
                  class="w-16 text-center bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                />
              </td>

              <!-- Status Jual -->
              <td class="px-4 py-3 text-center">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                    item.isSold
                      ? 'bg-ok-100 text-ok-600'
                      : 'bg-warn-100 text-warn-600'
                  ]"
                >
                  {{ item.isSold ? 'Terjual' : 'Belum Terjual' }}
                </span>
              </td>

              <!-- Aksi -->
              <td class="px-4 py-3 relative">
                <div class="flex items-center justify-center gap-1">
                  <!-- Tombol Tandai Terjual -->
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

                  <!-- Tombol titik tiga -->
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
                        @click="editItem(item)"
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

              <!-- Catatan -->
              <td class="px-4 py-3">
                <input
                  v-model="item.note"
                  class="w-full bg-transparent border border-transparent hover:border-ink-200 focus:border-brand-400 focus:bg-white rounded-lg px-0 py-1.5 outline-none transition"
                  placeholder="Catatan..."
                />
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="products.length === 0">
              <td colspan="14" class="px-4 py-16 text-center text-ink-400">
                Belum ada data. Klik tombol <strong>Tambah Produk</strong> untuk mulai.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

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

function addNewRow() {
  products.value.push({
    id: nextId++,
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
    isSold: false,
    note: ''
  })
}

function markAsSold(item) {
  item.isSold = true
  openMenuId.value = null
}

function removeRow(id) {
  products.value = products.value.filter(p => p.id !== id)
  openMenuId.value = null
}

// --- Dropdown menu titik tiga (Aksi) ---
const openMenuId = ref(null)
const menuPos = ref({ top: 0, left: 0 })
const nameInputs = {}

function setNameInputRef(id, el) {
  if (el) nameInputs[id] = el
}

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

function editItem(item) {
  openMenuId.value = null
  nextTick(() => {
    nameInputs[item.id]?.focus()
  })
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
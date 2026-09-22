<template>
  <div class="w-full">
    <!-- ==================== KATEGORI DITEMUKAN ==================== -->
    <template v-if="categoryExists">
      <!-- Kembali -->
      <div class="mb-6">
        <button
          @click="goBack"
          class="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Kategori
        </button>
      </div>

      <!-- Judul kategori -->
      <div class="mb-6">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-2xl font-semibold text-ink-900">{{ name }}</h2>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-cream-100 text-ink-600 text-[12px] font-medium tabular-nums">
            {{ items.length }} produk
          </span>
        </div>
        <p class="text-sm text-ink-500 mt-1">Semua produk dengan Style {{ name }}.</p>
      </div>

      <!-- Ringkasan kategori -->
      <div class="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
          <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>
          <p class="text-[13px] text-ink-500 mb-1.5">Jumlah Produk</p>
          <p class="text-[28px] leading-none font-semibold text-ink-900">{{ items.length }}</p>
        </div>

        <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
          <span class="absolute left-0 top-0 bottom-0 w-1 bg-ok-500"></span>
          <p class="text-[13px] text-ink-500 mb-1.5">Total Terjual</p>
          <p class="text-[28px] leading-none font-semibold text-ok-600">
            {{ totalUnits }} <span class="text-sm font-normal text-ink-400">unit</span>
          </p>
        </div>

        <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
          <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>
          <p class="text-[13px] text-ink-500 mb-1.5">Total Pendapatan</p>
          <p class="text-[28px] leading-none font-semibold text-ink-900">{{ formatPrice(totalRevenue) }}</p>
        </div>
      </div>

      <!-- Isi kategori: daftar produk -->
      <div class="bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-ink-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <!-- Filter Substyle -->
          <div v-if="substyleChips.length > 1" class="flex flex-wrap gap-2">
            <button
              v-for="chip in substyleChips"
              :key="chip.key"
              type="button"
              @click="activeSub = chip.key"
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition',
                activeSub === chip.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-cream-100 text-ink-600 hover:bg-ink-100'
              ]"
            >
              {{ chip.label }}
              <span :class="['text-xs tabular-nums', activeSub === chip.key ? 'text-white/70' : 'text-ink-400']">
                {{ chip.count }}
              </span>
            </button>
          </div>
          <h3 v-else class="text-base font-semibold text-ink-900">Daftar Produk</h3>

          <!-- Cari -->
          <div class="relative w-full lg:w-72">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari produk di kategori ini..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm transition"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-cream-100 text-ink-500 border-b border-ink-100">
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap w-12">No</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[240px]">Nama Produk</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[130px]">Substyle</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[110px]">Designer</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[170px]">Platform</th>
                <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[130px]">Status Produksi</th>
                <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap min-w-[90px]">Harga</th>
                <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap w-24">Terjual</th>
                <th class="px-4 py-3.5 text-center font-medium whitespace-nowrap min-w-[120px]">Status Jual</th>
              </tr>
            </thead>

            <tbody>
              <!-- Klik baris → buka halaman detail produk -->
              <tr
                v-for="(item, index) in filteredItems"
                :key="item.id"
                @click="goToProduct(item.id)"
                class="border-b border-ink-50 hover:bg-cream-50/70 transition cursor-pointer"
              >
                <td class="px-4 py-4 text-ink-400">{{ index + 1 }}</td>

                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-ink-100 bg-cream-100 flex items-center justify-center">
                      <img
                        v-if="item.image"
                        :src="item.image"
                        :alt="item.name"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span class="font-medium text-ink-800">{{ item.name || '—' }}</span>
                  </div>
                </td>

                <td class="px-4 py-4 text-ink-600">{{ item.substyle || '—' }}</td>
                <td class="px-4 py-4 text-ink-600">{{ item.designer || '—' }}</td>
                <td class="px-4 py-4"><PlatformBadges :platform="item.platform" /></td>
                <td class="px-4 py-4 text-ink-600">{{ item.productionStatus || '—' }}</td>
                <td class="px-4 py-4 text-right text-ink-700 font-medium tabular-nums">
                  {{ item.price ? formatPrice(item.price) : '—' }}
                </td>
                <td class="px-4 py-4 text-right text-ink-700 tabular-nums">{{ totalSold(item.id) }}</td>
                <td class="px-4 py-4 text-center">
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium',
                      isSold(item.id) ? 'bg-ok-100 text-ok-700' : 'bg-warn-100 text-warn-700'
                    ]"
                  >
                    {{ isSold(item.id) ? 'Terjual' : 'Belum Terjual' }}
                  </span>
                </td>
              </tr>

              <tr v-if="filteredItems.length === 0">
                <td colspan="9" class="px-4 py-16 text-center text-ink-400">
                  <template v-if="items.length === 0">
                    Belum ada produk di kategori ini. Isi Style produk dengan <strong>{{ name }}</strong> dari halaman detail produk.
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
    </template>

    <!-- ==================== KATEGORI TIDAK DITEMUKAN ==================== -->
    <div v-else class="bg-white rounded-card shadow-card border border-ink-100 px-6 py-16 text-center">
      <p class="text-ink-800 font-medium mb-1">Kategori tidak ditemukan</p>
      <p class="text-sm text-ink-500 mb-5">Kategori ini mungkin sudah dihapus atau namanya berubah.</p>
      <button
        @click="goBack"
        class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
      >
        Kembali ke Kategori
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProducts, formatPrice } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'
import PlatformBadges from '../components/PlatformBadges.vue'

const route = useRoute()
const router = useRouter()
const { products, totalSold, isSold } = useProducts()
const { optionsOf } = useOptions()

const NONE = '__none' // produk di kategori ini yang belum punya Substyle

// ========== DATA KATEGORI ==========
// Kategori = Style. Nama kategori diambil dari alamat halaman (/kategori/:name).
const name = computed(() => String(route.params.name || ''))

const items = computed(() =>
  products.value.filter(p => (p.style || '').trim() === name.value)
)

// Kategori tetap ada walau kosong, selama Style-nya masih terdaftar di Pengaturan
const categoryExists = computed(
  () => items.value.length > 0 || optionsOf('style').includes(name.value)
)

const totalUnits = computed(() => items.value.reduce((sum, p) => sum + totalSold(p.id), 0))
const totalRevenue = computed(() =>
  items.value.reduce((sum, p) => sum + totalSold(p.id) * (p.price || 0), 0)
)

// ========== FILTER SUBSTYLE & PENCARIAN ==========
const activeSub = ref('all')
const searchQuery = ref('')

// Buka dari kartu Substyle di halaman Kategori (?substyle=...) atau saat pindah kategori
watch(
  () => [route.params.name, route.query.substyle],
  () => {
    const sub = route.query.substyle
    activeSub.value = typeof sub === 'string' && sub ? sub : 'all'
    searchQuery.value = ''
  },
  { immediate: true }
)

const substyleChips = computed(() => {
  const chips = [{ key: 'all', label: 'Semua', count: items.value.length }]

  const subs = new Map()
  let none = 0
  for (const p of items.value) {
    const sub = (p.substyle || '').trim()
    if (sub) subs.set(sub, (subs.get(sub) || 0) + 1)
    else none++
  }

  const sorted = [...subs.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  for (const [label, count] of sorted) chips.push({ key: label, label, count })
  if (none && subs.size) chips.push({ key: NONE, label: 'Tanpa substyle', count: none })

  return chips
})

const filteredItems = computed(() => {
  let result = items.value

  if (activeSub.value === NONE) {
    result = result.filter(p => !(p.substyle || '').trim())
  } else if (activeSub.value !== 'all') {
    result = result.filter(p => (p.substyle || '').trim() === activeSub.value)
  }

  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    result = result.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.substyle || '').toLowerCase().includes(q) ||
      (p.designer || '').toLowerCase().includes(q) ||
      (p.platform || '').toLowerCase().includes(q) ||
      (p.productionStatus || '').toLowerCase().includes(q) ||
      (p.note || '').toLowerCase().includes(q)
    )
  }

  return result
})

// ========== NAVIGASI ==========
function goBack() {
  router.push('/kategori')
}

function goToProduct(id) {
  router.push(`/produk/${id}`)
}
</script>
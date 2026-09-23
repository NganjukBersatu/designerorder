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
          <option v-for="style in styleOptions" :key="style" :value="style">
            {{ style }}
          </option>
        </select>

        <select
          v-model="filterSubstyle"
          class="px-3 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm min-w-[150px]"
        >
          <option value="all">Semua Substyle</option>
          <option v-for="sub in substyleOptions" :key="sub" :value="sub">
            {{ sub }}
          </option>
        </select>

        <select
          v-model="filterPlatform"
          class="px-3 py-2.5 rounded-xl border border-ink-200 bg-cream-50 focus:bg-white focus:border-brand-400 outline-none text-sm min-w-[150px]"
        >
          <option value="all">Semua Platform</option>
          <option v-for="plat in platformOptions" :key="plat" :value="plat">
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
            <tr class="bg-cream-100 text-ink-500 border-b border-ink-100">
              <!-- Kolom No (sticky) -->
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap w-12 sticky left-0 z-20 bg-cream-100">
                No
              </th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[260px]">Nama Produk</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[110px]">Style</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[130px]">Substyle</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[110px]">Designer</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[160px]">Tanggal Dibuat</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[170px]">Tanggal Upload Platform</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[130px]">Status Produksi</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[170px]">Platform</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[160px]">Link DB</th>
              <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap min-w-[100px]">Harga</th>
              <th class="px-4 py-3.5 text-right font-medium whitespace-nowrap w-28">Jumlah Terjual</th>
              <th class="px-4 py-3.5 text-center font-medium whitespace-nowrap min-w-[120px]">Status Jual</th>
              <th class="px-4 py-3.5 text-center font-medium whitespace-nowrap w-20">Aksi</th>
              <th class="px-4 py-3.5 text-left font-medium whitespace-nowrap min-w-[140px]">Catatan</th>
            </tr>
          </thead>

          <tbody>
            <!-- Klik baris → buka halaman detail (edit & hapus ada di halaman detail) -->
            <tr
              v-for="(item, index) in filteredProducts"
              :key="item.id"
              @click="goToDetail(item.id)"
              class="border-b border-ink-50 hover:bg-cream-50/70 transition group cursor-pointer"
            >
              <!-- Kolom No (sticky) -->
              <td class="px-4 py-4 text-ink-400 sticky left-0 z-10 bg-white group-hover:bg-cream-50">
                {{ index + 1 }}
              </td>

              <!-- Gambar + nama produk -->
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

              <td class="px-4 py-4 text-ink-600">{{ item.style || '—' }}</td>
              <td class="px-4 py-4 text-ink-600">{{ item.substyle || '—' }}</td>
              <td class="px-4 py-4 text-ink-600">{{ item.designer || '—' }}</td>
              <td class="px-4 py-4 text-ink-500 text-[13px]">
                {{ item.date ? formatDateTime(item.date) : '—' }}
              </td>
              <td class="px-4 py-4 text-ink-500 text-[13px]">
                {{ item.uploadDate ? formatDateTime(item.uploadDate) : '—' }}
              </td>
              <td class="px-4 py-4 text-ink-600">{{ item.productionStatus || '—' }}</td>
              <td class="px-4 py-4">
                <PlatformBadges :platform="item.platform" />
              </td>
              <td class="px-4 py-4">
                <div v-if="getLinks(item).length" class="flex flex-col gap-1">
                  <a
                    v-for="(link, i) in getLinks(item)"
                    :key="i"
                    :href="link"
                    :title="link"
                    target="_blank"
                    rel="noopener noreferrer"
                    @click.stop
                    class="inline-flex items-center gap-1.5 text-brand-600 hover:underline whitespace-nowrap"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {{ getLinks(item).length > 1 ? `Dropbox ${i + 1}` : 'Buka Dropbox' }}
                  </a>
                </div>
                <span v-else class="text-ink-300">—</span>
              </td>
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

              <!-- Aksi: hanya catat penjualan (klik di sini tidak membuka detail) -->
              <td class="px-4 py-4" @click.stop>
                <div class="flex items-center justify-center">
                  <button
                    @click="recordSale(item.id)"
                    class="p-1.5 rounded-lg hover:bg-ok-100 text-ok-600 transition"
                    title="Catat penjualan"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </td>

              <td class="px-4 py-4 text-ink-500">{{ item.note || '—' }}</td>
            </tr>

            <tr v-if="filteredProducts.length === 0">
              <td colspan="15" class="px-4 py-16 text-center text-ink-400">
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

    <!-- ==================== MODAL TAMBAH PRODUK ==================== -->
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
            <h2 class="text-lg font-semibold text-ink-900">Tambah Produk Baru</h2>
            <button
              @click="closeModal"
              class="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition"
              aria-label="Tutup"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Gambar produk -->
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Gambar Produk</label>
              <div class="flex items-center gap-4">
                <div class="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-ink-200 bg-cream-100 flex items-center justify-center">
                  <img v-if="form.image" :src="form.image" alt="Pratinjau gambar" class="w-full h-full object-cover" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <div class="flex flex-col items-start gap-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm font-medium transition cursor-pointer">
                      {{ form.image ? 'Ganti Gambar' : 'Pilih Gambar' }}
                      <input type="file" accept="image/*" class="hidden" @change="onPickImage" />
                    </label>
                    <button
                      v-if="form.image"
                      type="button"
                      @click="clearImage"
                      class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-50 text-sm font-medium transition"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                  <p v-if="imageError" class="text-xs text-danger-600">{{ imageError }}</p>
                  <p v-else class="text-xs text-ink-400">JPG, PNG, atau WEBP. Ukuran otomatis diperkecil.</p>
                </div>
              </div>
            </div>

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
              <OptionSelect v-model="form.style" :options="optionsOf('style')" placeholder="Pilih style" />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Substyle</label>
              <select
                v-model="form.substyle"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih substyle</option>
                <option v-for="sub in substyleOptions" :key="sub" :value="sub">{{ sub }}</option>
              </select>
              <p v-if="!substyleOptions.length" class="text-[12px] text-ink-400 mt-1">
                Belum ada pilihan substyle, tambahkan dulu di halaman Pengaturan.
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Designer</label>
              <select
                v-model="form.designer"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih designer</option>
                <option v-for="d in designerOptions" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Status Produksi</label>
              <select
                v-model="form.productionStatus"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white focus:border-brand-400 outline-none text-sm transition"
              >
                <option value="">Pilih status produksi</option>
                <option v-for="s in productionStatusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Tanggal Dibuat</label>
              <input
                v-model="form.date"
                type="datetime-local"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Tanggal Upload ke Platform</label>
              <input
                v-model="form.uploadDate"
                type="datetime-local"
                class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Platform</label>
              <PlatformPicker v-model="form.platform" :options="optionsOf('platform')" />
            </div>

            <div class="sm:col-span-2">
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-sm font-medium text-ink-700">Link DB</label>
                <button
                  type="button"
                  @click="addLinkField"
                  class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Link
                </button>
              </div>
              <div class="space-y-2">
                <div v-for="(link, i) in form.linkDbs" :key="i" class="flex items-center gap-2">
                  <input
                    v-model="form.linkDbs[i]"
                    type="text"
                    class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
                    :placeholder="`https://www.dropbox.com/... (link ${i + 1})`"
                  />
                  <button
                    v-if="form.linkDbs.length > 1"
                    type="button"
                    @click="removeLinkField(i)"
                    class="p-2 rounded-lg hover:bg-danger-50 text-danger-600 transition"
                    title="Hapus link"
                    aria-label="Hapus link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="sm:col-span-2">
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
              Simpan Produk
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProducts, formatDateTime, formatPrice, normalizeUrl } from '../composables/useProducts'
import { fileToCompressedDataUrl } from '../utils/imageFile'
import { getLinks, cleanLinks } from '../utils/links'
import { splitPlatforms } from '../utils/platforms'
import { useOptions } from '../composables/useOptions'
import { useTeamMembers } from '../composables/useTeamMembers'
import OptionSelect from '../components/OptionSelect.vue'
import PlatformPicker from '../components/PlatformPicker.vue'
import PlatformBadges from '../components/PlatformBadges.vue'

const route = useRoute()
const router = useRouter()
const { products, addProduct, totalSold, isSold } = useProducts()
const { optionsOf, mergeOptions } = useOptions()
const { members } = useTeamMembers()

// Designer diambil dari anggota tim + pilihan manual yang sudah diatur di Pengaturan
const designerOptions = computed(() =>
  mergeOptions('designer', members.value.map(m => m.username))
)
const productionStatusOptions = computed(() =>
  mergeOptions('productionStatus', [...new Set(products.value.map(p => p.productionStatus).filter(Boolean))].sort())
)

// ========== NAVIGASI ==========
function goToDetail(id) {
  router.push(`/produk/${id}`)
}

// Tombol centang: buka halaman detail + langsung tampilkan form catat penjualan
function recordSale(id) {
  router.push({ path: `/produk/${id}`, query: { jual: 1 } })
}

// ========== SEARCH & FILTER ==========
const searchQuery = ref('')
const filterSold = ref('all')
const filterStyle = ref('all')
const filterSubstyle = ref('all')
const filterPlatform = ref('all')

// Pilihan filter = pilihan dari Pengaturan + nilai lain yang sudah terpakai di data produk
const styleOptions = computed(() =>
  mergeOptions('style', [...new Set(products.value.map(p => p.style).filter(Boolean))].sort())
)

const substyleOptions = computed(() =>
  mergeOptions('substyle', [...new Set(products.value.map(p => p.substyle).filter(Boolean))].sort())
)

const platformOptions = computed(() =>
  mergeOptions('platform', [...new Set(products.value.flatMap(p => splitPlatforms(p.platform)))].sort())
)

const hasActiveFilter = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    filterSold.value !== 'all' ||
    filterStyle.value !== 'all' ||
    filterSubstyle.value !== 'all' ||
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
    result = result.filter(p => isSold(p.id))
  } else if (filterSold.value === 'unsold') {
    result = result.filter(p => !isSold(p.id))
  }

  if (filterStyle.value !== 'all') {
    result = result.filter(p => p.style === filterStyle.value)
  }

  if (filterSubstyle.value !== 'all') {
    result = result.filter(p => p.substyle === filterSubstyle.value)
  }

  if (filterPlatform.value !== 'all') {
    result = result.filter(p => splitPlatforms(p.platform).includes(filterPlatform.value))
  }

  return result
})

function resetFilters() {
  searchQuery.value = ''
  filterSold.value = 'all'
  filterStyle.value = 'all'
  filterSubstyle.value = 'all'
  filterPlatform.value = 'all'
}

// Dibuka dari halaman Kategori (/produk?style=...&substyle=...): terapkan filternya.
// Kalau query dihapus (mis. klik "Semua Produk" di sidebar), filter Style/Substyle ikut direset.
watch(
  () => route.query,
  q => {
    filterStyle.value = typeof q.style === 'string' && q.style ? q.style : 'all'
    filterSubstyle.value = typeof q.substyle === 'string' && q.substyle ? q.substyle : 'all'
  },
  { immediate: true }
)

// ========== MODAL TAMBAH PRODUK ==========
// Edit & hapus produk dilakukan di halaman detail, bukan di list.
const showModal = ref(false)
const imageError = ref('')

const emptyForm = () => ({
  image: '',
  name: '',
  style: '',
  substyle: '',
  designer: '',
  date: '',        // Tanggal Dibuat
  uploadDate: '',  // Tanggal Upload ke Platform
  productionStatus: '',
  platform: '',
  linkDbs: [''],   // bisa lebih dari satu link
  price: 0,
  note: ''
})

const form = ref(emptyForm())

function openAddModal() {
  form.value = emptyForm()

  // Kalau lagi lihat produk hasil filter dari kategori (mis. buka dari halaman Kategori
  // atau filter Style/Substyle di list ini), produk baru langsung mengikuti filter itu.
  if (filterStyle.value !== 'all') {
    form.value.style = filterStyle.value
  }
  if (filterSubstyle.value !== 'all') {
    form.value.substyle = filterSubstyle.value
  }

  imageError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // supaya file yang sama bisa dipilih ulang
  if (!file) return
  try {
    form.value.image = await fileToCompressedDataUrl(file)
    imageError.value = ''
  } catch (err) {
    imageError.value = err.message
  }
}

function clearImage() {
  form.value.image = ''
  imageError.value = ''
}

function addLinkField() {
  form.value.linkDbs.push('')
}

function removeLinkField(index) {
  form.value.linkDbs.splice(index, 1)
  if (form.value.linkDbs.length === 0) form.value.linkDbs.push('')
}

function submitForm() {
  if (!form.value.name.trim()) {
    alert('Nama Produk wajib diisi')
    return
  }

  const links = cleanLinks(form.value.linkDbs, normalizeUrl)

  addProduct({
    image: form.value.image,
    name: form.value.name.trim(),
    style: form.value.style.trim(),
    substyle: form.value.substyle.trim(),
    designer: form.value.designer.trim(),
    date: form.value.date,
    uploadDate: form.value.uploadDate,
    productionStatus: form.value.productionStatus.trim(),
    platform: form.value.platform.trim(),
    linkDb: links[0] || '', // link pertama, supaya kompatibel dengan data lama
    linkDbs: links,
    price: form.value.price || 0,
    note: form.value.note.trim()
  })

  closeModal()
}
</script>
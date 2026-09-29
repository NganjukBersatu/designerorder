<template>
  <div class="w-full">
    <!-- Bar atas -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-ink-500">
        Pilih kategori untuk melihat produk di dalamnya. Kategori mengikuti
        <span class="font-medium text-ink-700">Style</span> produk.
      </p>

      <button
        type="button"
        @click="openAddModal"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Kategori
      </button>
    </div>

    <!-- Ringkasan -->
    <div class="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4 flex items-center justify-between gap-3">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>
        <div>
          <p class="text-[13px] text-ink-500 mb-1.5">Jumlah Kategori</p>
          <p class="text-[28px] leading-none font-semibold text-ink-900">{{ categories.length }}</p>
        </div>
        <div class="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
        </div>
      </div>

      <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4 flex items-center justify-between gap-3">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-ok-500"></span>
        <div>
          <p class="text-[13px] text-ink-500 mb-1.5">Total Produk</p>
          <p class="text-[28px] leading-none font-semibold text-ink-900">{{ products.length }}</p>
        </div>
        <div class="w-9 h-9 rounded-lg bg-ok-50 flex items-center justify-center text-ok-600 shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        </div>
      </div>

      <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4 flex items-center justify-between gap-3">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-warn-400"></span>
        <div>
          <p class="text-[13px] text-ink-500 mb-1.5">Belum Punya Style</p>
          <p class="text-[28px] leading-none font-semibold text-ink-900">{{ uncategorizedCount }}</p>
        </div>
        <div class="w-9 h-9 rounded-lg bg-warn-50 flex items-center justify-center text-warn-500 shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
        </div>
      </div>
    </div>

    <!-- Daftar kategori -->
    <div v-if="categories.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <article
        v-for="cat in categories"
        :key="cat.name"
        class="flex flex-col bg-white rounded-card shadow-card border border-ink-100 overflow-hidden"
      >
        <div class="px-5 pt-4 pb-4">
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-base font-semibold text-ink-900">
              <button type="button" @click="openCategory(cat.name)" class="text-left hover:text-brand-600 transition">
                {{ cat.name }}
              </button>
            </h3>
            <span class="shrink-0 text-xs text-ink-500 tabular-nums mt-1">{{ cat.count }} produk</span>
          </div>

          <!-- Cuplikan gambar produk -->
          <div v-if="cat.images.length" class="flex items-center gap-2 mt-3">
            <div
              v-for="img in cat.images"
              :key="img.id"
              class="w-12 h-12 rounded-lg overflow-hidden border border-ink-100 bg-cream-100"
              :title="img.name"
            >
              <img :src="img.src" :alt="img.name" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <div
              v-if="cat.more > 0"
              class="w-12 h-12 rounded-lg border border-ink-100 bg-cream-100 flex items-center justify-center text-xs font-medium text-ink-500 tabular-nums"
            >
              +{{ cat.more }}
            </div>
          </div>

          <!-- Substyle -->
          <div class="mt-3">
            <p class="text-[13px] text-ink-500 mb-1.5">Substyle</p>
            <div v-if="cat.substyles.length" class="flex flex-wrap gap-1.5">
              <button
                v-for="sub in cat.substyles"
                :key="sub.label"
                type="button"
                @click="openCategory(cat.name, sub.label)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-100 hover:bg-ink-500/10 text-ink-700 text-xs font-medium transition"
                :title="`Buka ${cat.name}, substyle ${sub.label}`"
              >
                {{ sub.label }}
                <span class="text-ink-400 tabular-nums">{{ sub.count }}</span>
              </button>
            </div>
            <p v-else class="text-sm text-ink-300">—</p>
          </div>
        </div>

        <!-- Statistik penjualan -->
        <dl class="grid grid-cols-2 gap-4 px-5 py-3 border-t border-ink-100 text-sm">
          <div>
            <dt class="text-[13px] text-ink-500 mb-0.5">Terjual</dt>
            <dd class="font-semibold text-ink-900 tabular-nums">
              {{ cat.units }} <span class="text-xs font-normal text-ink-400">unit</span>
            </dd>
          </div>
          <div>
            <dt class="text-[13px] text-ink-500 mb-0.5">Pendapatan</dt>
            <dd class="font-semibold text-ink-900 tabular-nums">{{ formatPrice(cat.revenue) }}</dd>
          </div>
        </dl>

        <!-- Aksi -->
        <div class="mt-auto px-5 py-3 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="openCategory(cat.name)"
            class="w-full px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
          >
            Lihat isi kategori
          </button>
        </div>
      </article>
    </div>

    <!-- Kosong -->
    <div
      v-else
      class="bg-white rounded-card shadow-card border border-ink-100 px-6 py-16 text-center"
    >
      <p class="text-ink-800 font-medium mb-1">Belum ada kategori</p>
      <p class="text-sm text-ink-500">
        Isi Style pada produk, atau tambahkan pilihan Style di Pengaturan.
      </p>
    </div>

    <!-- Modal Tambah Kategori -->
    <Teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        @click.self="closeAddModal"
      >
        <div class="w-full max-w-sm bg-white rounded-card shadow-card border border-ink-100 p-5">
          <h3 class="text-base font-semibold text-ink-900 mb-1">Tambah Kategori</h3>
          <p class="text-sm text-ink-500 mb-4">
            Kategori baru akan tersedia sebagai pilihan Style pada form produk.
          </p>

          <input
            ref="addInputRef"
            v-model="newCategoryName"
            type="text"
            placeholder="Nama kategori, mis. Streetwear"
            class="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
            @keyup.enter="submitAddCategory"
          />
          <p v-if="addError" class="text-xs text-red-500 mt-1.5">{{ addError }}</p>

          <div class="flex justify-end gap-2 mt-5">
            <button
              type="button"
              @click="closeAddModal"
              class="px-4 py-2 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-500/5 text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              type="button"
              @click="submitAddCategory"
              class="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition"
            >
              Tambah
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useProducts, formatPrice } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'

const router = useRouter()
const { products, totalSold } = useProducts()
const { mergeOptions, addOption } = useOptions()

const MAX_THUMBS = 4

// Kategori = Style. Pilihan Style dari Pengaturan tetap tampil walau belum ada produknya.
const categories = computed(() => {
  const byStyle = new Map()
  for (const p of products.value) {
    const style = (p.style || '').trim()
    if (!style) continue
    if (!byStyle.has(style)) byStyle.set(style, [])
    byStyle.get(style).push(p)
  }

  const names = mergeOptions('style', [...byStyle.keys()].sort())

  return names.map(name => {
    const items = byStyle.get(name) || []

    const subs = new Map()
    for (const p of items) {
      const sub = (p.substyle || '').trim()
      if (sub) subs.set(sub, (subs.get(sub) || 0) + 1)
    }

    const images = items
      .filter(p => p.image)
      .slice(0, MAX_THUMBS)
      .map(p => ({ id: p.id, src: p.image, name: p.name }))

    return {
      name,
      count: items.length,
      units: items.reduce((sum, p) => sum + totalSold(p.id), 0),
      revenue: items.reduce((sum, p) => sum + totalSold(p.id) * (p.price || 0), 0),
      substyles: [...subs.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, count]) => ({ label, count })),
      images,
      more: images.length ? items.length - images.length : 0
    }
  })
})

const uncategorizedCount = computed(
  () => products.value.filter(p => !(p.style || '').trim()).length
)

// Buka isi kategori (daftar produk di dalamnya, bisa kosong), opsional langsung ke satu Substyle
function openCategory(style, substyle) {
  router.push({
    path: '/kategori/' + encodeURIComponent(style),
    query: substyle ? { substyle } : {}
  })
}

// --- Tambah Kategori ---
const showAddModal = ref(false)
const newCategoryName = ref('')
const addError = ref('')
const addInputRef = ref(null)

function openAddModal() {
  newCategoryName.value = ''
  addError.value = ''
  showAddModal.value = true
  nextTick(() => addInputRef.value?.focus())
}

function closeAddModal() {
  showAddModal.value = false
}

function submitAddCategory() {
  const result = addOption('style', newCategoryName.value)
  if (!result.ok) {
    addError.value = result.message
    return
  }
  closeAddModal()
}
</script>
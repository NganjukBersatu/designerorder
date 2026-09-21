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
        @click="router.push('/pengaturan')"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm font-medium transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
        </svg>
        Atur kategori di Pengaturan
      </button>
    </div>

    <!-- Ringkasan -->
    <div class="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>
        <p class="text-[13px] text-ink-500 mb-1.5">Jumlah Kategori</p>
        <p class="text-[28px] leading-none font-semibold text-ink-900">{{ categories.length }}</p>
      </div>

      <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-ok-500"></span>
        <p class="text-[13px] text-ink-500 mb-1.5">Total Produk</p>
        <p class="text-[28px] leading-none font-semibold text-ink-900">{{ products.length }}</p>
      </div>

      <div class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden pl-5 pr-4 py-4">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-warn-400"></span>
        <p class="text-[13px] text-ink-500 mb-1.5">Belum Punya Style</p>
        <p class="text-[28px] leading-none font-semibold text-ink-900">{{ uncategorizedCount }}</p>
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
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-100 hover:bg-ink-100 text-ink-700 text-xs font-medium transition"
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
            :disabled="!cat.count"
            class="w-full px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-ink-100 disabled:text-ink-400 disabled:cursor-not-allowed text-white text-sm font-medium transition shadow-sm disabled:shadow-none"
          >
            {{ cat.count ? 'Lihat isi kategori' : 'Belum ada produk' }}
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProducts, formatPrice } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'

const router = useRouter()
const { products, totalSold } = useProducts()
const { mergeOptions } = useOptions()

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

// Buka isi kategori (daftar produk di dalamnya), opsional langsung ke satu Substyle
function openCategory(style, substyle) {
  router.push({
    path: '/kategori/' + encodeURIComponent(style),
    query: substyle ? { substyle } : {}
  })
}
</script>
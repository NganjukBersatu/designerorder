<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mobileOpen = ref(false)

const menu = [
  { to: '/', label: 'Ringkasan', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/orders', label: 'Semua Pesanan', icon: 'M9 5h6M9 3v2M9 19h6M4 7h16v13H4zM4 7l2-4h12l2 4' },
  { to: '/produk', label: 'List Produk', icon: 'M4 6h16M4 10h16M4 14h10M4 18h10' },
]

function handleResize() {
  if (window.innerWidth >= 1024) mobileOpen.value = false
}
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/50 lg:hidden" @click="mobileOpen = false" />

    <!-- SIDEBAR -->
    <aside
      :class="[
        'bg-brand-700 text-white h-screen flex flex-col shrink-0 w-64 z-50 transition-transform duration-300',
        'hidden lg:flex',
        mobileOpen ? '!flex fixed inset-y-0 left-0 shadow-2xl' : '',
      ]"
    >
      <div class="h-16 flex items-center gap-2.5 px-4 border-b border-white/10">
        <div class="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center text-brand-900 shrink-0 text-sm font-bold">
          DO
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-[13.5px] leading-tight truncate">Designer Orders</p>
          <p class="text-[11.5px] text-white/70 leading-tight mt-0.5 truncate">Aka Studio</p>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-1 text-[13.5px]">
        <router-link
          v-for="m in menu"
          :key="m.to"
          :to="m.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition"
          exact-active-class="bg-white text-brand-700 font-semibold hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
            <path :d="m.icon" />
          </svg>
          <span>{{ m.label }}</span>
        </router-link>
      </nav>

      <div class="px-4 py-4 border-t border-white/10 text-[12px] text-white/60">
        Ruang kerja produksi desain
      </div>
    </aside>

    <!-- KONTEN -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <header class="h-16 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-ink-100 shrink-0">
        <button
          type="button"
          class="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 transition shrink-0"
          @click="mobileOpen = true"
          aria-label="Buka menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div class="min-w-0 flex-1">
          <h1 class="text-[16px] sm:text-[18px] font-semibold text-ink-900 truncate">{{ route.meta.title }}</h1>
          <p class="text-[12px] text-ink-400 truncate hidden sm:block">{{ route.meta.subtitle }}</p>
        </div>
        <div class="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          AK
        </div>
      </header>
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 bg-cream">
        <router-view />
      </main>
    </div>
  </div>
</template>
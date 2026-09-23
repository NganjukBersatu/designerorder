<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProducts } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'

const route = useRoute()
const router = useRouter()
const { logout: clearSession } = useAuth()
const { products } = useProducts()
const { mergeOptions } = useOptions()

const mobileOpen = ref(false)
const showLogoutConfirm = ref(false)
const kategoriOpen = ref(false)

// Mode ciut (icon-only) — hanya berlaku di desktop. Di mobile, sidebar
// selalu tampil penuh sebagai overlay, jadi collapsed diabaikan di sana.
const collapsed = ref(false)
const isCollapsed = computed(() => collapsed.value && !mobileOpen.value)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  // Kalau lagi ciut, submenu Kategori tidak ada tempat untuk ditampilkan
  if (collapsed.value) kategoriOpen.value = false
}

// Auto buka submenu kalau sedang di halaman kategori / produk
const isKategoriRelated = computed(() => {
  return route.path.startsWith('/kategori') || route.path.startsWith('/produk')
})

watch(isKategoriRelated, (val) => {
  if (val) {
    // Halaman ini punya submenu (Kategori) -> pastikan sidebar terbuka
    // supaya submenu-nya kelihatan, lalu buka submenu-nya.
    collapsed.value = false
    kategoriOpen.value = true
  }
}, { immediate: true })

// Ambil daftar kategori (Style) secara dinamis
const categoryList = computed(() => {
  const styles = new Set()
  for (const p of products.value) {
    const s = (p.style || '').trim()
    if (s) styles.add(s)
  }
  return mergeOptions('style', [...styles].sort())
})

const menu = [
  {
    to: '/',
    label: 'Ringkasan',
    icon: 'M3 12l9-9 9 9M5 10v10h14V10'
  },
  {
    to: '/orders',
    label: 'Semua Pesanan',
    icon: 'M9 5h6M9 3v2M9 19h6M4 7h16v13H4zM4 7l2-4h12l2 4'
  },
  {
    to: '/tugas',
    label: 'Tugas',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'
  },
  {
    label: 'Kategori',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    children: true // penanda punya submenu dinamis
  },
  {
    to: '/pengaturan',
    label: 'Pengaturan',
    icon: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'
  },
]

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

function isParentActive(item) {
  if (!item.children) return false
  // aktif kalau sedang di /kategori/...
  return route.path.startsWith('/kategori')
}

// Kalau sidebar sedang ciut, klik "Kategori" langsung ke /kategori
// (tidak ada tempat untuk menampilkan submenu-nya).
function onKategoriClick() {
  if (isCollapsed.value) {
    router.push('/kategori')
  } else {
    kategoriOpen.value = !kategoriOpen.value
  }
}

function handleResize() {
  if (window.innerWidth >= 1024) mobileOpen.value = false
}
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))

function askLogout() {
  showLogoutConfirm.value = true
}

function logout() {
  clearSession()
  showLogoutConfirm.value = false
  mobileOpen.value = false
  router.push('/login')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-cream">
    <!-- Overlay mobile -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm lg:hidden"
      @click="mobileOpen = false"
    />

    <!-- ==================== SIDEBAR ==================== -->
    <aside
      :class="[
        'bg-sidebar text-white h-screen flex flex-col shrink-0 z-50 transition-all duration-300',
        'hidden lg:flex',
        isCollapsed ? 'lg:w-20' : 'lg:w-64',
        'w-64',
        mobileOpen ? '!flex fixed inset-y-0 left-0 shadow-sidebar !w-64' : '',
      ]"
    >
      <!-- Logo + toggle collapse -->
      <div
        :class="[
          'h-16 flex items-center border-b border-white/10 shrink-0',
          isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-4'
        ]"
      >
        <img
          src="/favicon.png"
          alt="Designer Orders"
          class="w-8 h-8 rounded-lg object-contain shrink-0"
        />
        <div v-if="!isCollapsed" class="min-w-0 flex-1">
          <p class="font-semibold text-[13.5px] leading-tight truncate">Designer Orders</p>
          <p class="text-[11.5px] text-white/60 leading-tight mt-0.5 truncate">Ruang kerja produksi</p>
        </div>

        <!-- Tombol ciutkan: hanya muncul saat sidebar terbuka, di posisi semula (sebelah logo) -->
        <button
          v-if="!isCollapsed && !mobileOpen"
          type="button"
          @click="toggleCollapsed"
          class="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition shrink-0 ml-auto"
          aria-label="Ciutkan sidebar"
          title="Ciutkan sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <!-- Tombol buka: hanya muncul saat sidebar ciut, di baris sendiri tepat di atas ikon Ringkasan -->
      <div v-if="isCollapsed && !mobileOpen" class="px-2.5 pt-2 shrink-0">
        <button
          type="button"
          @click="toggleCollapsed"
          class="hidden lg:flex w-full items-center justify-center px-0 py-2.5 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition"
          aria-label="Buka sidebar"
          title="Buka sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <!-- Menu -->
      <nav class="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 text-[13.5px]">
        <template v-for="m in menu" :key="m.label">
          <!-- Menu biasa -->
          <router-link
            v-if="!m.children"
            :to="m.to"
            :title="isCollapsed ? m.label : ''"
            class="flex items-center px-3 py-2.5 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition"
            :class="[
              isActive(m.to) ? '!bg-white !text-brand-700 font-semibold shadow-sm' : '',
              isCollapsed ? 'justify-center px-0' : 'gap-3'
            ]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
              <path :d="m.icon" />
            </svg>
            <span v-if="!isCollapsed" class="truncate">{{ m.label }}</span>
          </router-link>

          <!-- Menu Kategori (submenu dinamis = daftar kategori) -->
          <div v-else>
            <button
              type="button"
              @click="onKategoriClick"
              :title="isCollapsed ? m.label : ''"
              class="w-full flex items-center px-3 py-2.5 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition"
              :class="[
                isParentActive(m) || kategoriOpen ? '!bg-white/15 !text-white font-semibold' : '',
                isCollapsed ? 'justify-center px-0' : 'gap-3'
              ]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
                <path :d="m.icon" />
              </svg>
              <span v-if="!isCollapsed" class="flex-1 text-left truncate">{{ m.label }}</span>
              <svg
                v-if="!isCollapsed"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                class="transition-transform duration-200 shrink-0"
                :class="kategoriOpen ? 'rotate-180' : ''"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <!-- Submenu: daftar kategori langsung (disembunyikan saat sidebar ciut) -->
            <div v-show="kategoriOpen && !isCollapsed" class="mt-1 ml-3 pl-3 border-l border-white/20 space-y-0.5">
              <!-- Link Semua Kategori (opsional, bisa dihapus kalau tidak mau) -->
              <router-link
                to="/kategori"
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/70 hover:bg-white/10 hover:text-white transition"
                :class="route.path === '/kategori' ? '!bg-white !text-brand-700 font-semibold' : ''"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                Semua Kategori
              </router-link>

              <!-- Daftar kategori dinamis -->
              <router-link
                v-for="cat in categoryList"
                :key="cat"
                :to="`/kategori/${encodeURIComponent(cat)}`"
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/70 hover:bg-white/10 hover:text-white transition"
                :class="route.path === `/kategori/${encodeURIComponent(cat)}` ? '!bg-white !text-brand-700 font-semibold' : ''"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                {{ cat }}
              </router-link>

              <!-- Kalau belum ada kategori sama sekali -->
              <p v-if="!categoryList.length" class="px-3 py-2 text-[12px] text-white/40">
                Belum ada kategori
              </p>
            </div>
          </div>
        </template>
      </nav>

      <!-- Footer sidebar: keluar akun -->
      <div class="px-2.5 py-3 border-t border-white/10">
        <button
          type="button"
          @click="askLogout"
          :title="isCollapsed ? 'Keluar' : ''"
          class="w-full flex items-center px-3 py-2.5 rounded-xl text-[13.5px] text-white/80 hover:bg-white/10 hover:text-white transition"
          :class="isCollapsed ? 'justify-center px-0' : 'gap-3'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span v-if="!isCollapsed">Keluar</span>
        </button>

        <p v-if="!isCollapsed" class="px-3 pt-3 text-[12px] text-white/50">Ruang kerja produksi desain</p>
      </div>
    </aside>

    <!-- ==================== KONTEN ==================== -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <!-- Header -->
      <header class="h-16 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-ink-100 shrink-0">
        <button
          type="button"
          class="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-ink-600 hover:bg-ink-100 transition shrink-0"
          @click="mobileOpen = true"
          aria-label="Buka menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div class="min-w-0 flex-1">
          <h1 class="text-[16px] sm:text-[18px] font-semibold text-ink-900 truncate">
            {{ route.meta.title }}
          </h1>
          <p class="text-[12px] text-ink-400 truncate hidden sm:block">
            {{ route.meta.subtitle }}
          </p>
        </div>

        <div class="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm">
          AK
        </div>
      </header>

      <!-- Main content -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 bg-cream">
        <router-view />
      </main>
    </div>

    <!-- ==================== KONFIRMASI KELUAR ==================== -->
    <Teleport to="body">
      <div v-if="showLogoutConfirm" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
          @click="showLogoutConfirm = false"
        ></div>

        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h2 class="text-lg font-semibold text-ink-900 mb-1">Keluar dari akun?</h2>
          <p class="text-sm text-ink-500 mb-6">Kamu perlu masuk lagi untuk mengakses dashboard.</p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="showLogoutConfirm = false"
              class="px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50 text-sm font-medium transition"
            >
              Batal
            </button>
            <button
              type="button"
              @click="logout"
              class="px-5 py-2.5 rounded-xl bg-danger-600 hover:opacity-90 text-white text-sm font-medium transition shadow-sm"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { logout: clearSession } = useAuth()
const mobileOpen = ref(false)
const showLogoutConfirm = ref(false)

const menu = [
  { to: '/', label: 'Ringkasan', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/orders', label: 'Semua Pesanan', icon: 'M9 5h6M9 3v2M9 19h6M4 7h16v13H4zM4 7l2-4h12l2 4' },
  { to: '/produk', label: 'List Produk', icon: 'M4 6h16M4 10h16M4 14h10M4 18h10' },
  { to: '/laporan', label: 'Laporan', icon: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h6' },
  { to: '/pengaturan', label: 'Pengaturan', icon: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6' },
]

// Menu tetap menyala di halaman turunannya (mis. /produk/1 → List Produk)
function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

function handleResize() {
  if (window.innerWidth >= 1024) mobileOpen.value = false
}
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))

// ========== KELUAR AKUN ==========
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
        'bg-sidebar text-white h-screen flex flex-col shrink-0 w-64 z-50 transition-transform duration-300',
        'hidden lg:flex',
        mobileOpen ? '!flex fixed inset-y-0 left-0 shadow-sidebar' : '',
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center gap-2.5 px-4 border-b border-white/10">
        <img
          src="/logo.png"
          alt="Designer Orders"
          class="w-8 h-8 rounded-lg object-contain shrink-0"
        />
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-[13.5px] leading-tight truncate">Designer Orders</p>
          <p class="text-[11.5px] text-white/60 leading-tight mt-0.5 truncate">Ruang kerja produksi</p>
        </div>
      </div>

      <!-- Menu -->
      <nav class="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 text-[13.5px]">
        <router-link
          v-for="m in menu"
          :key="m.to"
          :to="m.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition"
          :class="isActive(m.to) ? '!bg-white !text-brand-700 font-semibold shadow-sm' : ''"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0"
          >
            <path :d="m.icon" />
          </svg>
          <span>{{ m.label }}</span>
        </router-link>
      </nav>

      <!-- Footer sidebar: keluar akun -->
      <div class="px-2.5 py-3 border-t border-white/10">
        <button
          type="button"
          @click="askLogout"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] text-white/80 hover:bg-white/10 hover:text-white transition"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span>Keluar</span>
        </button>

        <p class="px-3 pt-3 text-[12px] text-white/50">Ruang kerja produksi desain</p>
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
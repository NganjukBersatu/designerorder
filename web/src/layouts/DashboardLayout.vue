<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProducts } from '../composables/useProducts'
import { useOptions } from '../composables/useOptions'
import { useAppSettings } from '../composables/useAppSettings'
import { useProfile } from '../composables/useProfile'

const route = useRoute()
const router = useRouter()
const { logout: clearSession, user } = useAuth()
const { products } = useProducts()
const { mergeOptions } = useOptions()
const { settings } = useAppSettings()
const { profile, displayNameOrUsername } = useProfile()

const mobileOpen = ref(false)
const showLogoutConfirm = ref(false)
const kategoriOpen = ref(false)
const profileOpen = ref(false)

// ========== THEME (dark / light) ==========
const isDark = ref(false)

function applyTheme(dark) {
  isDark.value = dark
  const root = document.documentElement
  if (dark) {
    root.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    root.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

function toggleTheme() {
  applyTheme(!isDark.value)
}

function initTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') {
    applyTheme(true)
  } else if (saved === 'light') {
    applyTheme(false)
  } else {
    // Ikuti preferensi sistem kalau belum pernah diset
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark)
  }
}

// Mode ciut (icon-only) — hanya berlaku di desktop
const collapsed = ref(false)
const isCollapsed = computed(() => collapsed.value && !mobileOpen.value)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  if (collapsed.value) kategoriOpen.value = false
}

// Auto buka submenu kalau sedang di halaman kategori / produk
const isKategoriRelated = computed(() => {
  return route.path.startsWith('/kategori') || route.path.startsWith('/produk')
})

watch(isKategoriRelated, (val) => {
  if (val) {
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

// Ambil username (bisa string atau object { username })
function getUsername() {
  const u = user?.value
  if (!u) return ''
  if (typeof u === 'string') return u
  return u.username || u.name || ''
}

const userInitials = computed(() => {
  const name = (displayNameOrUsername.value || '').trim()
  if (!name) return 'AK'
  const parts = name.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const displayName = computed(() => displayNameOrUsername.value)

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
    children: true
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
  return route.path.startsWith('/kategori')
}

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

function handleClickOutside(e) {
  if (profileOpen.value && !e.target.closest('[data-profile-menu]')) {
    profileOpen.value = false
  }
}

onMounted(() => {
  initTheme()
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleClickOutside)
})

function toggleProfile() {
  profileOpen.value = !profileOpen.value
}

function goToProfile() {
  profileOpen.value = false
  router.push({ path: '/pengaturan', query: { tab: 'akun' } })
}

function goToSettings() {
  profileOpen.value = false
  router.push('/pengaturan')
}

function askLogout() {
  profileOpen.value = false
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
  <div class="flex h-screen overflow-hidden bg-cream dark:bg-ink-950">
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
          :alt="settings.appName"
          class="w-8 h-8 rounded-lg object-contain shrink-0"
        />
        <div v-if="!isCollapsed" class="min-w-0 flex-1">
          <p class="font-semibold text-[13.5px] leading-tight truncate">{{ settings.appName }}</p>
          <p class="text-[11.5px] text-white/60 leading-tight mt-0.5 truncate">{{ settings.appTagline }}</p>
        </div>

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

      <!-- Tombol buka (saat sidebar ciut) -->
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

            <div v-show="kategoriOpen && !isCollapsed" class="mt-1 ml-3 pl-3 border-l border-white/20 space-y-0.5">
              <router-link
                to="/kategori"
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/70 hover:bg-white/10 hover:text-white transition"
                :class="route.path === '/kategori' ? '!bg-white !text-brand-700 font-semibold' : ''"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                Semua Kategori
              </router-link>

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

              <p v-if="!categoryList.length" class="px-3 py-2 text-[12px] text-white/40">
                Belum ada kategori
              </p>
            </div>
          </div>
        </template>
      </nav>

      <!-- Footer sidebar -->
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

        <p v-if="!isCollapsed" class="px-3 pt-3 text-[12px] text-white/50">{{ settings.appTagline }} desain</p>
      </div>
    </aside>

    <!-- ==================== KONTEN ==================== -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <!-- Header -->
      <header class="h-16 flex items-center gap-3 px-4 sm:px-6 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-800 shrink-0">
        <button
          type="button"
          class="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition shrink-0"
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
          <h1 class="text-[16px] sm:text-[18px] font-semibold text-ink-900 dark:text-white truncate">
            {{ route.meta.title }}
          </h1>
          <p class="text-[12px] text-ink-400 dark:text-ink-500 truncate hidden sm:block">
            {{ route.meta.subtitle }}
          </p>
        </div>

        <!-- Tombol dark / light mode -->
        <button
          type="button"
          @click="toggleTheme"
          class="w-9 h-9 flex items-center justify-center rounded-xl text-ink-500 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition shrink-0"
          :aria-label="isDark ? 'Mode terang' : 'Mode gelap'"
          :title="isDark ? 'Mode terang' : 'Mode gelap'"
        >
          <!-- Ikon matahari (tampil saat dark mode → klik untuk ke light) -->
          <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <!-- Ikon bulan (tampil saat light mode → klik untuk ke dark) -->
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </button>

        <!-- Avatar + dropdown profil -->
        <div class="relative shrink-0" data-profile-menu>
          <button
            type="button"
            @click.stop="toggleProfile"
            class="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm hover:bg-brand-600 transition focus:outline-none focus:ring-2 focus:ring-brand-400/40 overflow-hidden"
            :aria-expanded="profileOpen"
            aria-haspopup="true"
            title="Profil akun"
          >
            <img v-if="profile.photo" :src="profile.photo" alt="" class="w-full h-full object-cover" />
            <span v-else>{{ userInitials }}</span>
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-1"
          >
            <div
              v-if="profileOpen"
              class="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-ink-900 rounded-xl shadow-lg border border-ink-100 dark:border-ink-800 py-1.5 z-50 origin-top-right"
            >
              <div class="px-3.5 py-2.5 border-b border-ink-100 dark:border-ink-800">
                <p class="text-sm font-semibold text-ink-900 dark:text-white truncate">{{ displayName }}</p>
                <p class="text-[12px] text-ink-400 mt-0.5">Akun aktif</p>
              </div>

              <button
                type="button"
                @click="goToProfile"
                class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-ink-700 dark:text-ink-200 hover:bg-cream-50 dark:hover:bg-ink-800 transition text-left"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="text-ink-400 shrink-0">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profil akun
              </button>

              <button
                type="button"
                @click="goToSettings"
                class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-ink-700 dark:text-ink-200 hover:bg-cream-50 dark:hover:bg-ink-800 transition text-left"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="text-ink-400 shrink-0">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                Pengaturan
              </button>

              <div class="border-t border-ink-100 dark:border-ink-800 my-1"></div>

              <button
                type="button"
                @click="askLogout"
                class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition text-left"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Keluar
              </button>
            </div>
          </Transition>
        </div>
      </header>

      <!-- Main content -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 bg-cream dark:bg-ink-950">
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

        <div class="relative bg-white dark:bg-ink-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-transparent dark:border-ink-800">
          <h2 class="text-lg font-semibold text-ink-900 dark:text-white mb-1">Keluar dari akun?</h2>
          <p class="text-sm text-ink-500 dark:text-ink-400 mb-6">Kamu perlu masuk lagi untuk mengakses dashboard.</p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="showLogoutConfirm = false"
              class="px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 text-sm font-medium transition"
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
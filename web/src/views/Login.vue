<template>
  <div class="min-h-screen flex bg-cream">
    <!-- ==================== PANEL KIRI (brand) ==================== -->
    <aside class="hidden lg:flex relative w-[46%] max-w-[640px] bg-sidebar text-white overflow-hidden flex-col p-12">
      <!-- Hiasan: jahitan benang + kancing -->
      <svg
        class="absolute inset-0 w-full h-full text-gold-500 pointer-events-none"
        viewBox="0 0 520 900"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M-30 700 C 90 640, 170 780, 300 720 S 500 600, 560 520"
          stroke="currentColor"
          stroke-opacity="0.35"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-dasharray="11 10"
        />
        <path
          d="M-30 748 C 100 690, 180 826, 310 768 S 500 650, 560 572"
          stroke="currentColor"
          stroke-opacity="0.16"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-dasharray="11 10"
        />
        <g transform="translate(408 596)" stroke="currentColor">
          <circle r="34" stroke-opacity="0.55" stroke-width="2.5" />
          <circle r="25" stroke-opacity="0.25" stroke-width="2" />
          <circle cx="-9" cy="-9" r="3" fill="currentColor" fill-opacity="0.7" stroke="none" />
          <circle cx="9" cy="-9" r="3" fill="currentColor" fill-opacity="0.7" stroke="none" />
          <circle cx="-9" cy="9" r="3" fill="currentColor" fill-opacity="0.7" stroke="none" />
          <circle cx="9" cy="9" r="3" fill="currentColor" fill-opacity="0.7" stroke="none" />
          <path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round" />
        </g>
      </svg>

      <!-- Logo -->
      <div class="relative flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center text-brand-900 text-sm font-bold shrink-0">
          DO
        </div>
        <div>
          <p class="font-semibold text-[15px] leading-tight">Designer Orders</p>
          <p class="text-[12px] text-white/60 leading-tight mt-0.5">Ruang kerja produksi</p>
        </div>
      </div>

      <!-- Kalimat utama -->
      <div class="relative max-w-md mt-16 xl:mt-24">
        <h2 class="text-[34px] leading-[1.15] font-semibold tracking-tight">
          Semua pesanan dan produk desain, dalam satu ruang kerja.
        </h2>
        <p class="mt-4 text-[15px] leading-relaxed text-white/65">
          Pantau status produksi dan lihat siapa saja yang sudah membeli, lengkap dengan jam terjualnya.
        </p>
      </div>
    </aside>

    <!-- ==================== PANEL KANAN (form) ==================== -->
    <main class="flex-1 flex items-center justify-center p-6 sm:p-10">
      <div class="w-full max-w-[380px]">
        <!-- Logo (mobile saja) -->
        <div class="lg:hidden flex items-center gap-3 mb-10">
          <div class="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center text-brand-900 text-sm font-bold shrink-0">
            DO
          </div>
          <div>
            <p class="font-semibold text-[15px] leading-tight text-ink-900">Designer Orders</p>
            <p class="text-[12px] text-ink-500 leading-tight mt-0.5">Ruang kerja produksi</p>
          </div>
        </div>

        <h1 class="text-[26px] font-semibold text-ink-900 tracking-tight">
          {{ mode === 'login' ? 'Selamat datang kembali' : 'Buat tim baru' }}
        </h1>
        <p class="text-sm text-ink-500 mt-1.5 mb-8">
          {{ mode === 'login' ? 'Masuk untuk membuka dashboard.' : 'Bikin workspace tim, akun ini otomatis jadi owner-nya.' }}
        </p>

        <form @submit.prevent="submit" class="space-y-5" novalidate>
          <!-- Pesan error -->
          <div
            v-if="error"
            class="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-danger-50 text-danger-600 text-sm"
            role="alert"
          >
            <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{{ error }}</span>
          </div>

          <!-- Nama tim (cuma pas daftar) -->
          <div v-if="mode === 'register'">
            <label for="teamName" class="block text-sm font-medium text-ink-700 mb-1.5">Nama tim</label>
            <input
              id="teamName"
              v-model="teamNameInput"
              type="text"
              class="w-full px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15 outline-none transition"
              placeholder="mis. Client A Studio"
            />
          </div>

          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-ink-700 mb-1.5">Username</label>
            <div class="relative">
              <svg
                class="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-400 pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="username"
                v-model="username"
                type="text"
                autocomplete="username"
                autofocus
                class="w-full pl-11 pr-3 py-3 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15 outline-none transition"
                placeholder="Masukkan username"
              />
            </div>
          </div>

          <!-- Kata sandi -->
          <div>
            <label for="password" class="block text-sm font-medium text-ink-700 mb-1.5">Kata sandi</label>
            <div class="relative">
              <svg
                class="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-400 pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="w-full pl-11 pr-12 py-3 rounded-xl border border-ink-200 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15 outline-none transition"
                placeholder="Masukkan kata sandi"
                @keyup="checkCapsLock"
                @keydown="checkCapsLock"
              />
              <!-- Ikon mata -->
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                :aria-pressed="showPassword"
              >
                <!-- mata terbuka -->
                <svg v-if="!showPassword" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <!-- mata dicoret -->
                <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0112 19C5 19 1 12 1 12a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" />
                  <path d="M1 1l22 22" />
                </svg>
              </button>
            </div>
            <p v-if="capsLock" class="mt-1.5 text-xs text-warn-700">Caps Lock sedang aktif</p>
          </div>

          <!-- Tombol masuk -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            {{ loading ? 'Memeriksa...' : mode === 'login' ? 'Masuk' : 'Buat tim & masuk' }}
          </button>
        </form>

        <p class="text-center text-sm text-ink-500 mt-6">
          <template v-if="mode === 'login'">
            Belum punya tim?
            <button type="button" class="font-medium text-brand-600 hover:underline" @click="toggleMode">Buat tim baru</button>
          </template>
          <template v-else>
            Sudah punya akun?
            <button type="button" class="font-medium text-brand-600 hover:underline" @click="toggleMode">Masuk di sini</button>
          </template>
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { login, register } = useAuth()

const mode = ref('login') // 'login' | 'register'
const teamNameInput = ref('')
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const capsLock = ref(false)

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
  password.value = ''
}

function checkCapsLock(e) {
  capsLock.value = e.getModifierState ? e.getModifierState('CapsLock') : false
}

// Hanya izinkan redirect ke halaman di dalam aplikasi ini
function safeRedirect() {
  const target = route.query.redirect
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return '/'
}

async function submit() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = 'Isi username dan kata sandi'
    return
  }
  if (mode.value === 'register' && !teamNameInput.value.trim()) {
    error.value = 'Isi nama tim'
    return
  }

  loading.value = true
  const result = mode.value === 'login'
    ? await login(username.value, password.value)
    : await register(teamNameInput.value, username.value, password.value)
  loading.value = false

  if (!result.ok) {
    error.value = result.message
    password.value = ''
    return
  }

  router.replace(safeRedirect())
}
</script>
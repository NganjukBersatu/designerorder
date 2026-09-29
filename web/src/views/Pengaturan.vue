<template>
  <div class="w-full max-w-4xl space-y-6">
    <!-- Kategori pengaturan -->
    <div>
      <div
        class="inline-flex p-1 rounded-xl bg-cream-100 border border-ink-100"
        role="tablist"
        aria-label="Kategori pengaturan"
      >
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          role="tab"
          :id="`tab-${tab.key}`"
          :aria-selected="activeTab === tab.key"
          :aria-controls="`panel-${tab.key}`"
          @click="activeTab = tab.key"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition',
            activeTab === tab.key
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-800'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
      <p class="text-[13px] text-ink-500 mt-2.5">{{ activeTabInfo }}</p>
    </div>

    <!-- ==================== KATEGORI: PILIHAN DROPDOWN (Produk / Tugas) ==================== -->
    <div
      v-show="activeTab === 'dropdown-produk' || activeTab === 'dropdown-tugas'"
      :id="`panel-${activeTab}`"
      role="tabpanel"
      :aria-labelledby="`tab-${activeTab}`"
      class="grid grid-cols-1 md:grid-cols-2 gap-5"
    >
      <section
        v-for="group in currentGroups"
        :key="group.id"
        :class="[
          'relative flex flex-col bg-white rounded-card shadow-card border border-ink-100 overflow-hidden',
          group.id === 'platform' ? 'md:col-span-2' : ''
        ]"
      >
        <span class="absolute left-0 top-0 bottom-0 w-1" :class="TONES[group.id]"></span>

        <div class="pl-6 pr-5 pt-4 pb-3 border-b border-ink-100">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-ink-900">{{ group.label }}</h2>
            <span class="text-xs text-ink-400 tabular-nums">{{ optionsOf(group.key).length }} pilihan</span>
          </div>
          <p class="text-[13px] text-ink-500 mt-0.5">{{ group.description }}</p>
          <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span class="text-xs text-ink-400">Dipakai di</span>
            <span
              v-for="use in group.usedIn"
              :key="use"
              class="inline-flex items-center px-2 py-0.5 rounded-full bg-cream-100 text-ink-600 text-[11px] font-medium"
            >
              {{ use }}
            </span>
          </div>
        </div>

        <div class="flex-1 pl-6 pr-5 py-4">
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="opt in optionsOf(group.key)"
              :key="opt"
              class="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-cream-100 text-ink-700 text-sm"
            >
              {{ opt }}
              <button
                type="button"
                @click="removeOption(group.key, opt)"
                class="p-0.5 rounded-full hover:bg-ink-100 text-ink-500 transition"
                :aria-label="`Hapus ${opt}`"
                :title="`Hapus ${opt}`"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
            <span v-if="!optionsOf(group.key).length" class="text-sm text-ink-400">Belum ada pilihan.</span>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="newOption[group.id]"
              type="text"
              @keydown.enter.prevent="submitOption(group)"
              class="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              :placeholder="`Tambah ${group.label.toLowerCase()} baru`"
            />
            <button
              type="button"
              @click="submitOption(group)"
              class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
            >
              Tambah
            </button>
          </div>

          <p
            v-if="optionMsg.id === group.id && optionMsg.text"
            :class="['text-xs mt-2', optionMsg.ok ? 'text-ok-700' : 'text-danger-600']"
            role="status"
          >
            {{ optionMsg.text }}
          </p>
        </div>

        <div class="flex items-center justify-between gap-3 pl-6 pr-5 py-3 border-t border-ink-100 bg-cream-50 text-xs">
          <button
            v-if="group.scope === 'produk'"
            type="button"
            @click="importFromProducts(group)"
            class="font-medium text-brand-600 hover:underline"
          >
            Ambil dari produk
          </button>
          <span v-else></span>
          <button
            type="button"
            @click="resetGroup(group)"
            class="text-ink-500 hover:text-ink-800 transition"
          >
            Reset ke bawaan
          </button>
        </div>
      </section>
    </div>

    <!-- ==================== KATEGORI: AKUN / PROFIL ==================== -->
    <div
      v-show="activeTab === 'akun'"
      id="panel-akun"
      role="tabpanel"
      aria-labelledby="tab-akun"
      class="max-w-2xl space-y-6"
    >
      <!-- Kartu profil -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></span>

        <div class="pl-6 pr-5 py-5">
          <div class="flex items-center gap-4">
            <!-- Avatar -->
            <div class="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-xl font-bold shadow-sm shrink-0 overflow-hidden">
              <img v-if="profile.photo" :src="profile.photo" alt="Foto profil" class="w-full h-full object-cover" />
              <span v-else>{{ userInitials }}</span>
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-ink-900 truncate">{{ displayNameOrUsername || '—' }}</h2>
              <p class="text-sm text-ink-500 mt-0.5">
                {{ roleLabel(role) }}
                <span v-if="teamName"> · Tim {{ teamName }}</span>
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-cream-100 text-ink-600 text-[11px] font-medium">
                  {{ roleLabel(role) }}
                </span>
                <span v-if="teamName" class="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-medium">
                  {{ teamName }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="pl-6 pr-5 pt-4 pb-5 border-t border-ink-100 space-y-4">
          <div
            v-if="profileMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              profileMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ profileMsg.text }}
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Foto Profil</label>
            <div class="flex flex-wrap items-center gap-2">
              <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm font-medium transition cursor-pointer">
                {{ profile.photo ? 'Ganti Foto' : 'Unggah Foto' }}
                <input type="file" accept="image/*" class="hidden" @change="onPickProfilePhoto" />
              </label>
              <button
                v-if="profile.photo"
                type="button"
                @click="removeProfilePhoto"
                class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-50 text-sm font-medium transition"
              >
                Hapus Foto
              </button>
            </div>
            <p class="text-xs text-ink-400 mt-1.5">JPG, PNG, atau WEBP. Hanya tersimpan di browser ini.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Nama Tampilan</label>
            <input
              v-model="displayNameForm"
              type="text"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              :placeholder="user"
            />
            <p class="text-xs text-ink-400 mt-1.5">Tampil di header & dropdown profil. Username login tetap {{ user }}.</p>
          </div>
        </div>

        <div class="flex justify-end pl-6 pr-5 py-4 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="submitProfile"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
          >
            Simpan Profil
          </button>
        </div>
      </section>

      <!-- Nama Aplikasi -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-gold-500"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Nama Aplikasi</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">
            Nama dan tagline yang tampil di sidebar serta judul tab browser.
          </p>
        </div>

        <div class="pl-6 pr-5 py-5 space-y-4">
          <div
            v-if="appSettingsMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              appSettingsMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ appSettingsMsg.text }}
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Nama Aplikasi</label>
            <input
              v-model="appSettingsForm.appName"
              type="text"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="mis. Designer Orders"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Tagline</label>
            <input
              v-model="appSettingsForm.appTagline"
              type="text"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="mis. Ruang kerja produksi"
            />
            <p class="text-xs text-ink-400 mt-1.5">Tampil di bawah nama aplikasi, di sidebar.</p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 pl-6 pr-5 py-4 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="resetAppName"
            class="text-xs text-ink-500 hover:text-ink-800 transition"
          >
            Reset ke bawaan
          </button>
          <button
            type="button"
            @click="submitAppSettings"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
          >
            Simpan Nama Aplikasi
          </button>
        </div>
      </section>

      <!-- Username -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Username</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">
            Username yang dipakai untuk masuk. Saat ini:
            <span class="font-medium text-ink-700">{{ user }}</span>
          </p>
        </div>

        <div class="pl-6 pr-5 py-5 space-y-4">
          <div
            v-if="usernameMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              usernameMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ usernameMsg.text }}
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Username baru</label>
            <input
              v-model="usernameForm.username"
              type="text"
              autocomplete="username"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="Minimal 3 karakter"
            />
            <p class="text-xs text-ink-400 mt-1.5">Huruf, angka, titik, garis bawah, dan strip.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Kata sandi saat ini</label>
            <input
              v-model="usernameForm.password"
              :type="showUsernamePw ? 'text' : 'password'"
              autocomplete="current-password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="Untuk konfirmasi perubahan"
            />
            <label class="inline-flex items-center gap-2 mt-2 text-xs text-ink-500 cursor-pointer select-none">
              <input v-model="showUsernamePw" type="checkbox" class="rounded border-ink-300" />
              Tampilkan kata sandi
            </label>
          </div>
        </div>

        <div class="flex justify-end pl-6 pr-5 py-4 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="submitUsername"
            :disabled="usernameLoading"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition shadow-sm"
          >
            {{ usernameLoading ? 'Menyimpan...' : 'Simpan Username' }}
          </button>
        </div>
      </section>

      <!-- Kata sandi -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-warn-400"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Kata sandi</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">Ganti kata sandi yang dipakai untuk masuk.</p>
        </div>

        <div class="pl-6 pr-5 py-5 space-y-4">
          <div
            v-if="passwordMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              passwordMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ passwordMsg.text }}
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Kata sandi saat ini</label>
            <input
              v-model="passwordForm.current"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="current-password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Kata sandi baru</label>
            <input
              v-model="passwordForm.next"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="Minimal 8 karakter"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Ulangi kata sandi baru</label>
            <input
              v-model="passwordForm.confirm"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
            />
            <label class="inline-flex items-center gap-2 mt-2 text-xs text-ink-500 cursor-pointer select-none">
              <input v-model="showPasswords" type="checkbox" class="rounded border-ink-300" />
              Tampilkan kata sandi
            </label>
          </div>
        </div>

        <div class="flex justify-end pl-6 pr-5 py-4 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="submitPassword"
            :disabled="passwordLoading"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition shadow-sm"
          >
            {{ passwordLoading ? 'Menyimpan...' : 'Ubah Kata Sandi' }}
          </button>
        </div>
      </section>
    </div>

    <!-- ==================== KATEGORI: ANGGOTA TIM ==================== -->
    <div
      v-show="activeTab === 'tim'"
      id="panel-tim"
      role="tabpanel"
      aria-labelledby="tab-tim"
      class="max-w-2xl space-y-6"
    >
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-[#14A38B]"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">
            Tim {{ teamName }}
          </h2>
          <p class="text-[13px] text-ink-500 mt-0.5">
            Semua anggota di sini berbagi produk & pesanan yang sama, apa pun rolenya.
            <span v-if="role === 'admin'">Sebagai admin, kamu cuma bisa tambah/hapus anggota biasa.</span>
            <span v-else-if="role === 'member'">Hanya owner/admin yang bisa menambah/menghapus anggota.</span>
          </p>
        </div>

        <div class="pl-6 pr-5 py-5 space-y-3">
          <div
            v-if="membersMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              membersMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ membersMsg.text }}
          </div>

          <div
            v-for="m in members"
            :key="m.id"
            class="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-cream-50"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-ink-800 truncate">
                {{ m.username }}
                <span v-if="m.username === user" class="text-ink-400 font-normal">(kamu)</span>
              </p>
              <p class="text-[12px] text-ink-500">{{ roleLabel(m.role) }}</p>
            </div>
            <button
              v-if="m.username !== user && canManage(m.role)"
              type="button"
              @click="removeMember(m)"
              class="p-2 rounded-lg hover:bg-danger-50 text-danger-600 transition shrink-0"
              title="Hapus anggota"
              aria-label="Hapus anggota"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <p v-if="!members.length" class="text-sm text-ink-400">Belum ada anggota.</p>
        </div>

        <div v-if="role === 'owner' || role === 'admin'" class="pl-6 pr-5 py-5 border-t border-ink-100 bg-cream-50 space-y-3">
          <h3 class="text-sm font-semibold text-ink-800">Tambah anggota</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              v-model="newMember.username"
              type="text"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition bg-white"
              placeholder="Username"
            />
            <input
              v-model="newMember.password"
              type="password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition bg-white"
              placeholder="Kata sandi (min. 8 karakter)"
            />
          </div>
          <div class="flex items-center justify-between gap-3">
            <select
              v-if="role === 'owner'"
              v-model="newMember.role"
              class="px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition bg-white"
            >
              <option value="member">Biasa</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
            <span v-else class="text-sm text-ink-500">Ditambahkan sebagai anggota biasa</span>
            <button
              type="button"
              @click="addMember"
              :disabled="addMemberLoading"
              class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm"
            >
              {{ addMemberLoading ? 'Menambahkan...' : 'Tambah Anggota' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useOptions, OPTION_GROUPS } from '../composables/useOptions'
import { useProducts } from '../composables/useProducts'
import { useAppSettings } from '../composables/useAppSettings'
import { useProfile } from '../composables/useProfile'
import { splitPlatforms } from '../utils/platforms'
import { api } from '../utils/api.js'

const route = useRoute()
const router = useRouter()
const { user, role, teamName, changeUsername, changePassword } = useAuth()

// ========== KATEGORI PENGATURAN ==========
const TABS = [
  {
    key: 'dropdown-produk',
    label: 'Pilihan Produk',
    info: 'Atur pilihan yang muncul di form produk, filter list, dan Catat Penjualan.'
  },
  {
    key: 'dropdown-tugas',
    label: 'Pilihan Tugas',
    info: 'Atur pilihan yang muncul di form Tugas — terpisah total dari pilihan produk jualan.'
  },
  {
    key: 'akun',
    label: 'Akun',
    info: 'Profil akun, nama aplikasi, username, dan kata sandi untuk masuk ke dashboard.'
  },
  {
    key: 'tim',
    label: 'Anggota Tim',
    info: 'Kelola siapa saja yang bisa akses produk & pesanan tim ini.'
  }
]

const activeTab = ref('dropdown-produk')
const activeTabInfo = computed(() => TABS.find(t => t.key === activeTab.value)?.info || '')

// Buka tab dari query ?tab=akun (dari dropdown profil di header)
watch(
  () => route.query.tab,
  (tab) => {
    if (typeof tab === 'string' && TABS.some(t => t.key === tab)) {
      activeTab.value = tab
    }
  },
  { immediate: true }
)

// Sync tab ke URL biar bisa di-bookmark / dibuka dari header
watch(activeTab, (tab) => {
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab } })
  }
})

// ========== PROFIL (foto + nama tampilan) ==========
const { profile, displayNameOrUsername, updateDisplayName, updatePhoto, removePhoto } = useProfile()

// Inisial untuk avatar (dari nama tampilan kalau ada, kalau tidak dari username)
const userInitials = computed(() => {
  const name = (displayNameOrUsername.value || '').trim()
  if (!name) return 'AK'
  const parts = name.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const displayNameForm = ref(profile.value.displayName)
const profileMsg = ref({ ok: false, text: '' })

watch(
  () => profile.value.displayName,
  (val) => {
    displayNameForm.value = val
  }
)

async function onPickProfilePhoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  profileMsg.value = await updatePhoto(file)
}

async function removeProfilePhoto() {
  profileMsg.value = await removePhoto()
}

async function submitProfile() {
  profileMsg.value = await updateDisplayName(displayNameForm.value)
}

const TONES = {
  kategori: 'bg-[#8B5CF6]',
  style: 'bg-[#8B5CF6]',
  substyle: 'bg-[#3B82F6]',
  designer: 'bg-[#14A38B]',
  productionStatus: 'bg-[#E0A21B]',
  platform: 'bg-[#F0782B]',
  taskCategory: 'bg-[#8B5CF6]',
  taskSubstyle: 'bg-[#3B82F6]',
  taskProductionStatus: 'bg-[#E0A21B]',
  taskDesigner: 'bg-[#14A38B]'
}

// ========== PILIHAN DROPDOWN ==========
const { optionsOf, addOption, removeOption, resetOptions } = useOptions()
const { products } = useProducts()

const currentGroups = computed(() =>
  OPTION_GROUPS.filter(g => g.scope === (activeTab.value === 'dropdown-tugas' ? 'tugas' : 'produk'))
)

const newOption = ref(Object.fromEntries(OPTION_GROUPS.map(g => [g.id, ''])))
const optionMsg = ref({ id: '', ok: false, text: '' })

function submitOption(group) {
  const result = addOption(group.key, newOption.value[group.id])
  optionMsg.value = { id: group.id, ok: result.ok, text: result.message }
  if (result.ok) newOption.value[group.id] = ''
}

function importFromProducts(group) {
  const key = group.key
  const found = []
  for (const p of products.value) {
    const values = key === 'platform' ? splitPlatforms(p.platform) : [p[key]]
    for (const v of values) {
      if (v && String(v).trim()) found.push(String(v).trim())
    }
  }

  let added = 0
  for (const v of found) {
    if (addOption(key, v).ok) added++
  }

  optionMsg.value = {
    id: group.id,
    ok: true,
    text: added
      ? `${added} pilihan ditambahkan dari data produk`
      : 'Tidak ada pilihan baru di data produk'
  }
}

function resetGroup(group) {
  if (!confirm(`Kembalikan pilihan ${group.label} ke bawaan?`)) return
  resetOptions(group.key)
  optionMsg.value = { id: group.id, ok: true, text: 'Pilihan dikembalikan ke bawaan' }
}

// ========== NAMA APLIKASI ==========
const { settings, updateAppSettings, resetAppSettings } = useAppSettings()

const appSettingsForm = ref({
  appName: settings.value.appName,
  appTagline: settings.value.appTagline
})
const appSettingsMsg = ref({ ok: false, text: '' })

function submitAppSettings() {
  const result = updateAppSettings(appSettingsForm.value)
  appSettingsMsg.value = result
  if (result.ok) {
    appSettingsForm.value = {
      appName: settings.value.appName,
      appTagline: settings.value.appTagline
    }
  }
}

function resetAppName() {
  if (!confirm('Kembalikan nama & tagline aplikasi ke bawaan?')) return
  const result = resetAppSettings()
  appSettingsForm.value = {
    appName: settings.value.appName,
    appTagline: settings.value.appTagline
  }
  appSettingsMsg.value = result
}

// ========== USERNAME ==========
const usernameForm = ref({ username: '', password: '' })
const usernameMsg = ref({ ok: false, text: '' })
const usernameLoading = ref(false)
const showUsernamePw = ref(false)

onMounted(() => {
  usernameForm.value.username = user.value || ''
})

async function submitUsername() {
  usernameMsg.value = { ok: false, text: '' }

  if (usernameForm.value.username.trim() === user.value) {
    usernameMsg.value = { ok: false, text: 'Username belum berubah' }
    return
  }
  if (!usernameForm.value.password) {
    usernameMsg.value = { ok: false, text: 'Isi kata sandi saat ini untuk konfirmasi' }
    return
  }

  usernameLoading.value = true
  const result = await changeUsername(usernameForm.value.username, usernameForm.value.password)
  usernameLoading.value = false

  usernameMsg.value = { ok: result.ok, text: result.message }
  if (result.ok) {
    usernameForm.value = { username: user.value, password: '' }
  }
}

// ========== KATA SANDI ==========
const passwordForm = ref({ current: '', next: '', confirm: '' })
const passwordMsg = ref({ ok: false, text: '' })
const passwordLoading = ref(false)
const showPasswords = ref(false)

async function submitPassword() {
  passwordMsg.value = { ok: false, text: '' }

  if (!passwordForm.value.current) {
    passwordMsg.value = { ok: false, text: 'Isi kata sandi saat ini' }
    return
  }
  if (passwordForm.value.next !== passwordForm.value.confirm) {
    passwordMsg.value = { ok: false, text: 'Konfirmasi kata sandi baru tidak cocok' }
    return
  }

  passwordLoading.value = true
  const result = await changePassword(passwordForm.value.current, passwordForm.value.next)
  passwordLoading.value = false

  passwordMsg.value = { ok: result.ok, text: result.message }
  if (result.ok) {
    passwordForm.value = { current: '', next: '', confirm: '' }
  }
}

// ========== ANGGOTA TIM ==========
const members = ref([])
const membersMsg = ref({ ok: false, text: '' })
const newMember = ref({ username: '', password: '', role: 'member' })
const addMemberLoading = ref(false)

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Biasa' }
function roleLabel(r) {
  return ROLE_LABELS[r] || r || '—'
}

function canManage(targetRole) {
  if (role.value === 'owner') return true
  if (role.value === 'admin') return targetRole === 'member'
  return false
}

async function loadMembers() {
  try {
    const res = await api.get('/team/members')
    members.value = res.data
  } catch (err) {
    membersMsg.value = { ok: false, text: err.message }
  }
}

async function addMember() {
  membersMsg.value = { ok: false, text: '' }
  if (!newMember.value.username.trim() || !newMember.value.password) {
    membersMsg.value = { ok: false, text: 'Isi username dan kata sandi' }
    return
  }

  addMemberLoading.value = true
  try {
    await api.post('/team/members', {
      username: newMember.value.username.trim(),
      password: newMember.value.password,
      role: role.value === 'owner' ? newMember.value.role : 'member',
    })
    newMember.value = { username: '', password: '', role: 'member' }
    membersMsg.value = { ok: true, text: 'Anggota berhasil ditambahkan' }
    await loadMembers()
  } catch (err) {
    membersMsg.value = { ok: false, text: err.message }
  } finally {
    addMemberLoading.value = false
  }
}

async function removeMember(member) {
  if (!confirm(`Hapus anggota "${member.username}" dari tim?`)) return
  try {
    await api.delete(`/team/members/${member.id}`)
    await loadMembers()
  } catch (err) {
    membersMsg.value = { ok: false, text: err.message }
  }
}

onMounted(loadMembers)
</script>
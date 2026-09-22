<template>
  <div class="w-full max-w-4xl space-y-6">
    <!-- Peringatan kata sandi bawaan -->
    <div
      v-if="isDefaultPassword"
      class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-warn-100 text-warn-700 text-sm"
      role="alert"
    >
      <span>Kamu masih memakai kata sandi bawaan. Segera ganti kata sandi agar dashboard lebih aman.</span>
      <button
        v-if="activeTab !== 'akun'"
        type="button"
        @click="activeTab = 'akun'"
        class="font-medium underline underline-offset-2 hover:opacity-80 transition"
      >
        Ganti sekarang
      </button>
    </div>

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

    <!-- ==================== KATEGORI: PILIHAN DROPDOWN ==================== -->
    <div
      v-show="activeTab === 'dropdown'"
      id="panel-dropdown"
      role="tabpanel"
      aria-labelledby="tab-dropdown"
      class="grid grid-cols-1 md:grid-cols-2 gap-5"
    >
      <section
        v-for="group in OPTION_GROUPS"
        :key="group.id"
        :class="[
          'relative flex flex-col bg-white rounded-card shadow-card border border-ink-100 overflow-hidden',
          group.id === 'platform' ? 'md:col-span-2' : ''
        ]"
      >
        <!-- Penanda warna per dropdown -->
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
          <!-- Daftar pilihan -->
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

          <!-- Tambah pilihan -->
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
            type="button"
            @click="importFromProducts(group)"
            class="font-medium text-brand-600 hover:underline"
          >
            Ambil dari produk
          </button>
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

    <!-- ==================== KATEGORI: AKUN ==================== -->
    <div
      v-show="activeTab === 'akun'"
      id="panel-akun"
      role="tabpanel"
      aria-labelledby="tab-akun"
      class="max-w-2xl space-y-6"
    >
      <!-- Username -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Username</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">
            Username yang dipakai untuk masuk. Saat ini: <span class="font-medium text-ink-700">{{ user }}</span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useOptions, OPTION_GROUPS } from '../composables/useOptions'
import { useProducts } from '../composables/useProducts'
import { splitPlatforms } from '../utils/platforms'

const { user, isDefaultPassword, changeUsername, changePassword } = useAuth()

// ========== KATEGORI PENGATURAN ==========
const TABS = [
  {
    key: 'dropdown',
    label: 'Pilihan dropdown',
    info: 'Atur pilihan yang muncul di form produk, filter list, dan Catat Penjualan.'
  },
  {
    key: 'akun',
    label: 'Akun',
    info: 'Username dan kata sandi untuk masuk ke dashboard.'
  }
]

const activeTab = ref('dropdown')
const activeTabInfo = computed(() => TABS.find(t => t.key === activeTab.value)?.info || '')

// Warna penanda di sisi kiri tiap kartu dropdown (per id kartu, bukan per key data)
const TONES = {
  kategori: 'bg-[#8B5CF6]',
  style: 'bg-[#8B5CF6]',
  substyle: 'bg-[#3B82F6]',
  designer: 'bg-[#14A38B]',
  productionStatus: 'bg-[#E0A21B]',
  platform: 'bg-[#F0782B]'
}

// ========== PILIHAN DROPDOWN ==========
const { optionsOf, addOption, removeOption, resetOptions } = useOptions()
const { products } = useProducts()

// newOption & optionMsg diindeks pakai group.id, bukan group.key —
// supaya kartu Kategori dan kartu Style (yang berbagi data 'style')
// punya input & pesan status masing-masing yang independen.
const newOption = ref(Object.fromEntries(OPTION_GROUPS.map(g => [g.id, ''])))
const optionMsg = ref({ id: '', ok: false, text: '' })

function submitOption(group) {
  const result = addOption(group.key, newOption.value[group.id])
  optionMsg.value = { id: group.id, ok: result.ok, text: result.message }
  if (result.ok) newOption.value[group.id] = ''
}

// Tambahkan semua nilai yang sudah dipakai di data produk ke daftar pilihan
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

// ========== USERNAME ==========
const usernameForm = ref({ username: '', password: '' })
const usernameMsg = ref({ ok: false, text: '' })
const usernameLoading = ref(false)
const showUsernamePw = ref(false)

onMounted(() => {
  usernameForm.value.username = user.value
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
</script>
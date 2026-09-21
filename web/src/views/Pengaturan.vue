<template>
  <div class="w-full max-w-2xl space-y-6">
    <!-- Peringatan kata sandi bawaan -->
    <div
      v-if="isDefaultPassword"
      class="px-4 py-3 rounded-xl bg-warn-100 text-warn-700 text-sm"
      role="alert"
    >
      Kamu masih memakai kata sandi bawaan. Segera ganti kata sandi di bawah agar dashboard lebih aman.
    </div>

    <!-- ==================== USERNAME ==================== -->
    <section class="bg-white rounded-card shadow-card border border-ink-100">
      <div class="px-5 py-4 border-b border-ink-100">
        <h2 class="text-base font-semibold text-ink-900">Username</h2>
        <p class="text-[13px] text-ink-500 mt-0.5">
          Username yang dipakai untuk masuk. Saat ini: <span class="font-medium text-ink-700">{{ user }}</span>
        </p>
      </div>

      <div class="px-5 py-5 space-y-4">
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

      <div class="flex justify-end px-5 py-4 border-t border-ink-100 bg-cream-50 rounded-b-card">
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

    <!-- ==================== KATA SANDI ==================== -->
    <section class="bg-white rounded-card shadow-card border border-ink-100">
      <div class="px-5 py-4 border-b border-ink-100">
        <h2 class="text-base font-semibold text-ink-900">Kata sandi</h2>
        <p class="text-[13px] text-ink-500 mt-0.5">Ganti kata sandi yang dipakai untuk masuk.</p>
      </div>

      <div class="px-5 py-5 space-y-4">
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

      <div class="flex justify-end px-5 py-4 border-t border-ink-100 bg-cream-50 rounded-b-card">
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
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, isDefaultPassword, changeUsername, changePassword } = useAuth()

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
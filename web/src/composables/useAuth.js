// src/composables/useAuth.js
//
// Autentikasi SISI-FRONTEND (belum ada backend).
// - Username & hash kata sandi disimpan di localStorage browser ini.
// - Kata sandi tidak disimpan polos: di-hash dengan PBKDF2 + salt acak.
// - Akun bawaan pertama kali: admin / admin123 (segera ganti di halaman Pengaturan).
//
// CATATAN KEAMANAN: ini melindungi tampilan dashboard saja. Siapa pun yang bisa
// membuka DevTools di browser yang sama bisa melewatinya. Untuk keamanan sungguhan,
// pindahkan login ke API (folder api/) dan simpan hash di database server.
// Semua logika ada di file ini, jadi cukup ganti isi fungsi login / changeUsername /
// changePassword dengan pemanggilan API nanti.

import { ref, computed } from 'vue'

const CREDS_KEY = 'auth_credentials'
const SESSION_KEY = 'auth_session'
const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin123'
const PBKDF2_ITERATIONS = 100000

const encoder = new TextEncoder()

// ========== HELPER HASH ==========
function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map(h => parseInt(h, 16)))
}

function randomSalt() {
  return toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)))
}

async function hashPassword(password, saltHex) {
  if (!globalThis.crypto?.subtle) throw new Error('NO_CRYPTO')
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  )
  return toHex(bits)
}

// ========== HELPER STORAGE ==========
function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ========== STATE (dipakai bersama semua halaman) ==========
const session = ref(readJSON(SESSION_KEY))
const isDefaultPassword = ref(readJSON(CREDS_KEY)?.isDefault ?? true)

async function ensureCredentials() {
  let creds = readJSON(CREDS_KEY)
  if (!creds) {
    const salt = randomSalt()
    creds = {
      username: DEFAULT_USERNAME,
      salt,
      hash: await hashPassword(DEFAULT_PASSWORD, salt),
      isDefault: true
    }
    writeJSON(CREDS_KEY, creds)
  }
  return creds
}

async function verifyPassword(password) {
  const creds = await ensureCredentials()
  return (await hashPassword(password, creds.salt)) === creds.hash
}

// ========== VALIDASI ==========
export function validateUsername(value) {
  const v = (value || '').trim()
  if (v.length < 3) return 'Username minimal 3 karakter'
  if (v.length > 30) return 'Username maksimal 30 karakter'
  if (!/^[a-zA-Z0-9._-]+$/.test(v)) {
    return 'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan strip'
  }
  return ''
}

export function validatePassword(value) {
  if ((value || '').length < 8) return 'Kata sandi minimal 8 karakter'
  return ''
}

function fail(message) {
  return { ok: false, message }
}

function errorMessage(e) {
  if (e?.message === 'NO_CRYPTO') {
    return 'Browser tidak mendukung enkripsi. Buka lewat localhost atau https.'
  }
  return 'Terjadi kesalahan, coba lagi.'
}

// ========== COMPOSABLE ==========
export function useAuth() {
  const isLoggedIn = computed(() => !!session.value)
  const user = computed(() => session.value?.username || '')

  async function login(username, password) {
    try {
      const creds = await ensureCredentials()
      const usernameOk = (username || '').trim().toLowerCase() === creds.username.toLowerCase()
      const passwordOk = (await hashPassword(password, creds.salt)) === creds.hash
      if (!usernameOk || !passwordOk) return fail('Username atau kata sandi salah')

      session.value = { username: creds.username, at: Date.now() }
      writeJSON(SESSION_KEY, session.value)
      isDefaultPassword.value = !!creds.isDefault
      return { ok: true }
    } catch (e) {
      return fail(errorMessage(e))
    }
  }

  function logout() {
    session.value = null
    localStorage.removeItem(SESSION_KEY)
  }

  async function changeUsername(newUsername, currentPassword) {
    const err = validateUsername(newUsername)
    if (err) return fail(err)
    try {
      if (!(await verifyPassword(currentPassword))) return fail('Kata sandi saat ini salah')

      const username = newUsername.trim()
      writeJSON(CREDS_KEY, { ...readJSON(CREDS_KEY), username })
      if (session.value) {
        session.value = { ...session.value, username }
        writeJSON(SESSION_KEY, session.value)
      }
      return { ok: true, message: 'Username berhasil diperbarui' }
    } catch (e) {
      return fail(errorMessage(e))
    }
  }

  async function changePassword(currentPassword, newPassword) {
    const err = validatePassword(newPassword)
    if (err) return fail(err)
    try {
      if (!(await verifyPassword(currentPassword))) return fail('Kata sandi saat ini salah')
      if (newPassword === currentPassword) {
        return fail('Kata sandi baru tidak boleh sama dengan yang lama')
      }

      const salt = randomSalt()
      const hash = await hashPassword(newPassword, salt)
      writeJSON(CREDS_KEY, { ...readJSON(CREDS_KEY), salt, hash, isDefault: false })
      isDefaultPassword.value = false
      return { ok: true, message: 'Kata sandi berhasil diubah' }
    } catch (e) {
      return fail(errorMessage(e))
    }
  }

  return {
    isLoggedIn,
    user,
    isDefaultPassword,
    login,
    logout,
    changeUsername,
    changePassword
  }
}
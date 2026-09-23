// src/composables/useAuth.js
//
// Autentikasi lewat backend API (JWT).
// Token disimpan di localStorage lewat api.js (setToken/getToken).

import { ref, computed } from 'vue'
import { api, setToken, getToken } from '../utils/api.js' // sesuaikan path import ini

const USER_KEY = 'auth_user'

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function writeJSON(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

// ========== STATE (dipakai bersama semua halaman) ==========
const user = ref(readJSON(USER_KEY))

export function validateUsername(value) {
  const v = (value || '').trim()
  if (v.length < 3) return 'Username minimal 3 karakter'
  if (v.length > 30) return 'Username maksimal 30 karakter'
  return ''
}

export function validatePassword(value) {
  if ((value || '').length < 8) return 'Kata sandi minimal 8 karakter'
  return ''
}

function fail(message) {
  return { ok: false, message }
}

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value && !!getToken())
  const username = computed(() => user.value?.username || '')

  async function login(usernameInput, password) {
    try {
      const data = await api.post('/auth/login', { username: usernameInput, password })
      setToken(data.token)
      user.value = data.user
      writeJSON(USER_KEY, data.user)
      return { ok: true }
    } catch (e) {
      return fail(e.message || 'Username atau kata sandi salah')
    }
  }

  function logout() {
    user.value = null
    setToken(null)
    writeJSON(USER_KEY, null)
  }

  async function changePassword(currentPassword, newPassword) {
    const err = validatePassword(newPassword)
    if (err) return fail(err)
    try {
      const data = await api.patch('/auth/password', { currentPassword, newPassword })
      return { ok: true, message: data.message || 'Kata sandi berhasil diubah' }
    } catch (e) {
      return fail(e.message || 'Gagal mengubah kata sandi')
    }
  }

  return {
    isLoggedIn,
    user: username,
    login,
    logout,
    changePassword,
  }
}
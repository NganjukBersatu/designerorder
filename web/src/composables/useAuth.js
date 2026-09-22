// src/composables/useAuth.js
//
// Autentikasi asli lewat backend (tabel users + teams di PostgreSQL).
// Token JWT disimpan di localStorage (dipakai utils/api.js & useProducts.js
// buat nempelin header Authorization di tiap request).
// Satu tim bisa punya beberapa akun (owner bisa nambah anggota di Pengaturan);
// semua produk & pesanan otomatis ke-scope ke team_id milik user yang login.

import { ref, computed } from 'vue'
import { getToken, setToken } from '../utils/api.js'
import { fetchProducts } from './useProducts'
import { useTeamMembers } from './useTeamMembers'

const USER_KEY = 'auth_user'

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function writeJSON(key, value) {
  if (value === null) localStorage.removeItem(key)
  else localStorage.setItem(key, JSON.stringify(value))
}

// State dibuat di luar fungsi supaya dipakai bersama semua halaman
const stored = readJSON(USER_KEY)
const currentUser = ref(getToken() && stored ? stored : null)

function fail(message) {
  return { ok: false, message }
}

async function apiCall(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'Terjadi kesalahan pada server')
  return body
}

function applySession({ token, user, teamName }) {
  setToken(token)
  currentUser.value = { ...user, teamName: teamName ?? currentUser.value?.teamName }
  writeJSON(USER_KEY, currentUser.value)
  fetchProducts()
  useTeamMembers().fetchMembers()
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

// ========== COMPOSABLE ==========
export function useAuth() {
  const isLoggedIn = computed(() => !!currentUser.value)
  const user = computed(() => currentUser.value?.username || '')
  const role = computed(() => currentUser.value?.role || '')
  const teamName = computed(() => currentUser.value?.teamName || '')

  async function login(username, password) {
    try {
      const data = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      applySession(data)
      return { ok: true }
    } catch (e) {
      return fail(e.message)
    }
  }

  // Bikin tim baru + akun owner pertamanya
  async function register(teamNameInput, username, password) {
    try {
      const data = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ teamName: teamNameInput, username, password }),
      })
      applySession(data)
      return { ok: true }
    } catch (e) {
      return fail(e.message)
    }
  }

  function logout() {
    setToken('')
    currentUser.value = null
    writeJSON(USER_KEY, null)
  }

  async function changeUsername(newUsername, currentPassword) {
    const err = validateUsername(newUsername)
    if (err) return fail(err)
    try {
      const data = await apiCall('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ username: newUsername.trim(), currentPassword }),
      })
      setToken(data.token)
      currentUser.value = { ...currentUser.value, username: data.user.username }
      writeJSON(USER_KEY, currentUser.value)
      return { ok: true, message: 'Username berhasil diperbarui' }
    } catch (e) {
      return fail(e.message)
    }
  }

  async function changePassword(currentPassword, newPassword) {
    const err = validatePassword(newPassword)
    if (err) return fail(err)
    try {
      const data = await apiCall('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setToken(data.token)
      return { ok: true, message: 'Kata sandi berhasil diubah' }
    } catch (e) {
      return fail(e.message)
    }
  }

  return {
    isLoggedIn,
    user,
    role,
    teamName,
    login,
    register,
    logout,
    changeUsername,
    changePassword,
  }
}

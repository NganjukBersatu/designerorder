// src/services/api.js (atau lokasi file api.js kamu sekarang)

// Di dev, '/api' diteruskan ke backend lewat proxy Vite (lihat vite.config.js).
// Di production (frontend & backend di-deploy terpisah), set VITE_API_URL ke URL publik backend.
const BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'auth_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  const body = await res.json().catch(() => ({}))

  if (res.status === 401) {
    // Token tidak ada / tidak valid / kadaluarsa -> bersihkan & lempar error khusus
    setToken(null)
    const err = new Error(body.message || 'Sesi berakhir, silakan login lagi')
    err.isAuthError = true
    throw err
  }

  if (!res.ok) {
    throw new Error(body.message || 'Terjadi kesalahan pada server')
  }

  return body
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
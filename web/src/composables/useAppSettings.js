import { ref, watch } from 'vue'

const STORAGE_KEY = 'designer-orders:app-settings'

// Nilai bawaan (dipakai kalau belum pernah diubah / storage kosong)
export const APP_SETTINGS_DEFAULTS = {
  appName: 'Designer Orders',
  appTagline: 'Ruang kerja produksi'
}

function load() {
  const base = { ...APP_SETTINGS_DEFAULTS }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved && typeof saved === 'object') {
      if (typeof saved.appName === 'string' && saved.appName.trim()) {
        base.appName = saved.appName.trim()
      }
      if (typeof saved.appTagline === 'string') {
        base.appTagline = saved.appTagline.trim()
      }
    }
  } catch {
    // data rusak / storage tidak tersedia: pakai nama bawaan
  }
  return base
}

// Satu state bersama untuk semua halaman (sidebar, pengaturan, dll.)
const settings = ref(load())

watch(
  settings,
  value => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // abaikan jika storage penuh / diblokir
    }
    // Judul tab browser ikut nama aplikasi
    if (typeof document !== 'undefined') {
      document.title = value.appName || APP_SETTINGS_DEFAULTS.appName
    }
  },
  { deep: true, immediate: true }
)

export function useAppSettings() {
  function updateAppSettings({ appName, appTagline }) {
    const name = String(appName ?? '').trim()
    if (!name) {
      return { ok: false, message: 'Nama aplikasi tidak boleh kosong' }
    }

    settings.value.appName = name
    settings.value.appTagline = String(appTagline ?? '').trim()
    return { ok: true, message: 'Nama aplikasi berhasil disimpan' }
  }

  function resetAppSettings() {
    settings.value = { ...APP_SETTINGS_DEFAULTS }
    return { ok: true, message: 'Nama aplikasi dikembalikan ke bawaan' }
  }

  return { settings, updateAppSettings, resetAppSettings }
}

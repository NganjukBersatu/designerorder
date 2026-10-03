import { ref, watch } from 'vue'
import { api, getToken } from '../utils/api.js'

// Nama aplikasi & tagline adalah pengaturan TIM (disimpan di server), jadi semua anggota tim
// melihat yang sama dan tidak hilang saat ganti browser.
const APP_SETTINGS_DEFAULTS = {
  appName: 'Designer Orders',
  appTagline: 'Ruang kerja produksi'
}

// Satu state bersama untuk semua halaman (sidebar, pengaturan, dll.)
const settings = ref({ ...APP_SETTINGS_DEFAULTS })

watch(
  settings,
  value => {
    // Judul tab browser ikut nama aplikasi
    if (typeof document !== 'undefined') {
      document.title = value.appName || APP_SETTINGS_DEFAULTS.appName
    }
  },
  { deep: true, immediate: true }
)

export async function fetchAppSettings() {
  try {
    settings.value = { ...APP_SETTINGS_DEFAULTS, ...(await api.get('/app-settings')).data }
  } catch (err) {
    console.error('Gagal memuat pengaturan aplikasi:', err.message)
  }
}

if (getToken()) fetchAppSettings()

export function useAppSettings() {
  async function updateAppSettings({ appName, appTagline }) {
    const name = String(appName ?? '').trim()
    if (!name) {
      return { ok: false, text: 'Nama aplikasi tidak boleh kosong', message: 'Nama aplikasi tidak boleh kosong' }
    }
    try {
      settings.value = (await api.put('/app-settings', { appName: name, appTagline })).data
      return { ok: true, text: 'Nama aplikasi berhasil disimpan untuk seluruh tim', message: 'Nama aplikasi berhasil disimpan untuk seluruh tim' }
    } catch (err) {
      return { ok: false, text: err.message, message: err.message }
    }
  }

  async function resetAppSettings() {
    try {
      settings.value = (await api.put('/app-settings', { reset: true })).data
      return { ok: true, text: 'Nama aplikasi dikembalikan ke bawaan', message: 'Nama aplikasi dikembalikan ke bawaan' }
    } catch (err) {
      return { ok: false, text: err.message, message: err.message }
    }
  }

  return { settings, updateAppSettings, resetAppSettings }
}

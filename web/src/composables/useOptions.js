import { ref } from 'vue'
import { api, getToken } from '../utils/api.js'

// Dropdown yang bisa diatur dari halaman Pengaturan.
// usedIn = tempat dropdown ini muncul, ditampilkan di kartu Pengaturan.
// Dipakai bersama oleh form order, form produk, dan filter (Tugas sudah digabung ke Order)
export const OPTION_GROUPS = [
  {
    id: 'kategori',
    key: 'style',
    label: 'Kategori',
    description: 'Kategori produk yang dipakai di halaman Kategori. Datanya sama dengan Style.',
    usedIn: ['Halaman Kategori'],
    scope: 'produk'
  },
  {
    id: 'style',
    key: 'style',
    label: 'Style',
    description: 'Gaya utama produk, mis. VRoid atau VRChat.',
    usedIn: ['Form produk', 'Filter list'],
    scope: 'produk'
  },
  {
    id: 'substyle',
    key: 'substyle',
    label: 'Substyle',
    description: 'Gaya turunan, mis. Daily outfit atau Cyber.',
    usedIn: ['Form produk'],
    scope: 'produk'
  },
  {
    id: 'designer',
    key: 'designer',
    label: 'Designer',
    description: 'Nama designer di luar anggota tim (anggota tim otomatis muncul di dropdown Designer).',
    usedIn: ['Form order', 'Form produk'],
    scope: 'produk'
  },
  {
    id: 'productionStatus',
    key: 'productionStatus',
    label: 'Status Produksi',
    description: 'Tahap produksi, mis. Preview atau Done.',
    usedIn: ['Form order', 'Form produk'],
    scope: 'produk'
  },
  {
    id: 'platform',
    key: 'platform',
    label: 'Platform',
    description: 'Tempat produk dijual. Tulis satu platform per pilihan; produk boleh memilih lebih dari satu.',
    usedIn: ['Form order', 'Form produk', 'Filter list', 'Catat Penjualan'],
    scope: 'produk'
  }
]

// Pilihan awal (sebelum kamu mengubahnya di Pengaturan)
const DEFAULTS = {
  style: ['VRoid', 'VRChat', 'AR'],
  substyle: ['Daily outfit', 'Cyber'],
  designer: [],
  productionStatus: ['Preview', 'Done', 'Ready'],
  platform: ['Etsy', 'Booth']
}

const PLATFORM_LIKE_KEYS = ['platform']

function cloneDefaults() {
  return Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, [...v]]))
}

// Satu state bersama untuk semua halaman, dimulai dari pilihan awal sebelum data tim dimuat
const options = ref(cloneDefaults())

// Muat pilihan dropdown milik tim dari backend (dipanggil sekali setelah login,
// dan otomatis di bawah kalau sudah ada token tersimpan, mis. refresh halaman).
export async function fetchOptions() {
  try {
    const res = await api.get('/options')
    const merged = cloneDefaults()
    for (const key of Object.keys(merged)) {
      if (Array.isArray(res.data?.[key])) merged[key] = res.data[key]
    }
    options.value = merged
  } catch (err) {
    console.error('Gagal memuat pilihan dropdown:', err.message)
  }
}

if (getToken()) fetchOptions()

// Simpan ke backend dengan debounce, supaya perubahan beruntun (mis. impor banyak
// pilihan sekaligus lewat resetOptions/addOption) tidak kirim satu request per pilihan.
let saveTimer = null
const pendingKeys = new Set()
function scheduleSave(key) {
  pendingKeys.add(key)
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const keys = [...pendingKeys]
    pendingKeys.clear()
    const payload = Object.fromEntries(keys.map((k) => [k, options.value[k]]))
    try {
      await api.patch('/options', payload)
    } catch (err) {
      console.error('Gagal menyimpan pilihan dropdown:', err.message)
    }
  }, 400)
}

export function useOptions() {
  const optionsOf = key => options.value[key] || []

  // Pilihan yang diatur + nilai lain yang sudah terpakai di data (tanpa duplikat)
  function mergeOptions(key, extras = []) {
    const seen = new Set()
    const result = []
    for (const value of [...optionsOf(key), ...extras]) {
      if (value && !seen.has(value)) {
        seen.add(value)
        result.push(value)
      }
    }
    return result
  }

  function addOption(key, raw) {
    const value = String(raw || '').trim()
    if (!value) return { ok: false, message: 'Tulis dulu pilihan yang mau ditambahkan' }

    if (PLATFORM_LIKE_KEYS.includes(key) && /[&,/+]/.test(value)) {
      return { ok: false, message: 'Tulis satu platform saja. Boleh dipilih lebih dari satu nanti di form.' }
    }

    const list = options.value[key]
    if (list.some(v => v.toLowerCase() === value.toLowerCase())) {
      return { ok: false, message: `"${value}" sudah ada` }
    }

    list.push(value)
    scheduleSave(key)
    return { ok: true, message: `"${value}" ditambahkan` }
  }

  function removeOption(key, value) {
    options.value[key] = options.value[key].filter(v => v !== value)
    scheduleSave(key)
  }

  function resetOptions(key) {
    options.value[key] = [...DEFAULTS[key]]
    scheduleSave(key)
  }

  return { options, optionsOf, mergeOptions, addOption, removeOption, resetOptions }
}
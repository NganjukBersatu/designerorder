import { ref, watch } from 'vue'

const STORAGE_KEY = 'designer-orders:dropdown-options'

// Dropdown yang bisa diatur dari halaman Pengaturan.
// usedIn = tempat dropdown ini muncul, ditampilkan di kartu Pengaturan.
export const OPTION_GROUPS = [
  {
    key: 'style',
    label: 'Style',
    description: 'Gaya utama produk, mis. Casual atau Fantasy.',
    usedIn: ['Form produk', 'Filter list']
  },
  {
    key: 'substyle',
    label: 'Substyle',
    description: 'Gaya turunan, mis. Daily outfit atau Cyber.',
    usedIn: ['Form produk']
  },
  {
    key: 'designer',
    label: 'Designer',
    description: 'Nama designer yang mengerjakan produk.',
    usedIn: ['Form produk']
  },
  {
    key: 'productionStatus',
    label: 'Status Produksi',
    description: 'Tahap produksi, mis. Preview atau Done.',
    usedIn: ['Form produk']
  },
  {
    key: 'platform',
    label: 'Platform',
    description: 'Tempat produk dijual. Tulis satu platform per pilihan; produk boleh memilih lebih dari satu.',
    usedIn: ['Form produk', 'Filter list', 'Catat Penjualan']
  }
]

// Pilihan awal (sebelum kamu mengubahnya di Pengaturan)
const DEFAULTS = {
  style: ['Casual', 'Fantasy', 'Formal'],
  substyle: ['Daily outfit', 'Cyber'],
  designer: [],
  productionStatus: ['Preview', 'Done', 'Ready'],
  platform: ['Etsy', 'Booth']
}

function cloneDefaults() {
  return Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, [...v]]))
}

function load() {
  const base = cloneDefaults()
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved && typeof saved === 'object') {
      for (const key of Object.keys(base)) {
        if (Array.isArray(saved[key])) base[key] = saved[key].filter(v => typeof v === 'string')
      }
    }
  } catch {
    // data rusak / storage tidak tersedia: pakai pilihan awal
  }
  return base
}

// Satu state bersama untuk semua halaman
const options = ref(load())

watch(
  options,
  value => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // abaikan jika storage penuh / diblokir
    }
  },
  { deep: true }
)

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

    if (key === 'platform' && /[&,/+]/.test(value)) {
      return { ok: false, message: 'Tulis satu platform saja. Produk bisa memilih lebih dari satu platform.' }
    }

    const list = options.value[key]
    if (list.some(v => v.toLowerCase() === value.toLowerCase())) {
      return { ok: false, message: `"${value}" sudah ada` }
    }

    list.push(value)
    return { ok: true, message: `"${value}" ditambahkan` }
  }

  function removeOption(key, value) {
    options.value[key] = options.value[key].filter(v => v !== value)
  }

  function resetOptions(key) {
    options.value[key] = [...DEFAULTS[key]]
  }

  return { options, optionsOf, mergeOptions, addOption, removeOption, resetOptions }
}
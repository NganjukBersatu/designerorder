// Mata uang & kurs per tim. Kurs = berapa satuan mata uang itu per 1 USD (USD selalu 1).
// Hanya Ringkasan (dan daftar Kategori) yang mengonversi ke mata uang tampilan; di tempat lain
// harga selalu tampil dalam mata uangnya sendiri.
import { ref } from 'vue'
import { api, getToken } from '../utils/api.js'
import { formatPrice } from './useProducts.js'

export const DEFAULT_CURRENCIES = ['USD', 'IDR', 'JPY', 'EUR', 'SGD', 'MYR', 'GBP', 'AUD', 'CNY', 'KRW']

const currencies = ref(DEFAULT_CURRENCIES)
const displayCurrency = ref('USD')
const rates = ref({ USD: 1 })

function apply(data) {
  if (data.currencies?.length) currencies.value = data.currencies
  displayCurrency.value = data.displayCurrency || 'USD'
  rates.value = { ...data.rates, USD: 1 }
}

export async function fetchCurrency() {
  try {
    apply((await api.get('/currency')).data)
  } catch (err) {
    console.error('Gagal memuat pengaturan mata uang:', err.message)
  }
}

if (getToken()) fetchCurrency()

export function useCurrency() {
  // Nilai dalam `from` -> mata uang tampilan. Kurs yang belum diisi = nilai tidak ikut dihitung (0),
  // jangan ditebak 1:1; halaman Ringkasan memberi peringatan lewat `missingRates`.
  function toDisplay(value, from = 'USD') {
    const v = Number(value) || 0
    const to = displayCurrency.value
    if (from === to) return v
    const a = rates.value[from]
    const b = rates.value[to]
    if (!a || !b) return 0
    return (v / a) * b
  }

  const shown = (value) => formatPrice(value, displayCurrency.value)
  const display = (value, from = 'USD') => shown(toDisplay(value, from))

  // Mata uang yang dipakai tapi kursnya belum diisi (supaya bisa diperingatkan)
  function missingRates(used) {
    const to = displayCurrency.value
    const need = new Set(used)
    need.add('USD')
    const list = [...need].filter((c) => c !== to && (!rates.value[c] || !rates.value[to]))
    if (to !== 'USD' && !rates.value[to] && !list.includes(to)) list.push(to)
    return list
  }

  async function saveCurrency(patch) {
    apply((await api.put('/currency', patch)).data)
  }

  return { currencies, displayCurrency, rates, toDisplay, shown, display, missingRates, saveCurrency, fetchCurrency }
}

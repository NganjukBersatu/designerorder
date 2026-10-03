// Mata uang yang disediakan. Kurs disimpan per tim sebagai "berapa satuan mata uang itu per 1 USD".
export const CURRENCIES = ['USD', 'IDR', 'JPY', 'EUR', 'SGD', 'MYR', 'GBP', 'AUD', 'CNY', 'KRW']

export const isCurrency = (value) => CURRENCIES.includes(value)

// Aturan kolom untuk validateBody
export const currencyRule = { type: 'string', max: 3, label: 'Mata uang' }

// Kosong dianggap tidak dikirim (dipakai default); kalau diisi harus salah satu yang disediakan
export function checkCurrency(value) {
  return value === undefined || value === null || value === '' || isCurrency(value)
}

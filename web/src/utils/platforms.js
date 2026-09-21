// Nilai platform produk disimpan sebagai teks, mis. "Etsy & Booth".
// Helper ini memecahnya jadi daftar ("Etsy", "Booth") dan menggabungkannya lagi.
export function splitPlatforms(value) {
  if (!value) return []
  const raw = String(value).trim()
  if (/^both$/i.test(raw)) return ['Etsy', 'Booth'] // data lama
  return raw
    .split(/\s*(?:&|,|\/|\+|\bdan\b|\band\b)\s*/i)
    .map(s => s.trim())
    .filter(Boolean)
}

export function joinPlatforms(list) {
  return (list || []).join(' & ')
}
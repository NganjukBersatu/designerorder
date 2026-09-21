// Ambil semua link DB milik produk.
// Data baru disimpan di `linkDbs` (array). Data lama hanya punya `linkDb` (string),
// jadi kalau `linkDbs` belum ada, dipakai `linkDb` sebagai satu-satunya link.
export function getLinks(item) {
  if (!item) return []
  if (Array.isArray(item.linkDbs)) return item.linkDbs.filter(Boolean)
  return item.linkDb ? [item.linkDb] : []
}

// Bersihkan input form: buang baris kosong & duplikat, lalu rapikan URL-nya.
export function cleanLinks(list, normalize = (u) => u) {
  const trimmed = (list || []).map(u => (u || '').trim()).filter(Boolean)
  return [...new Set(trimmed.map(normalize))].filter(Boolean)
}
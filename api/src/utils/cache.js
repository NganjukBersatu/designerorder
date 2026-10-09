// Cache ringan di memori untuk hasil agregat yang mahal dan sering dibuka (ringkasan dashboard,
// ringkasan produk). Sengaja sederhana: satu proses, TTL pendek, dan dibersihkan otomatis tiap
// ada penulisan data milik tim itu — jadi angka tidak pernah basi lebih dari TTL, dan tidak
// perlu Redis. Daftar/halaman data (orders, products, sales) TIDAK di-cache: sudah berpaginasi
// dan ber-index, dan harus selalu segar.

const TTL_MS = 60_000
const MAX_ENTRIES = 500

const store = new Map() // `${teamId}:${key}` -> { exp, val }
const pending = new Map() // permintaan identik yang sedang jalan dipakai bersama (tidak dobel)

export async function cached(teamId, key, fn, ttl = TTL_MS) {
  const k = `${teamId}:${key}`
  const hit = store.get(k)
  if (hit && hit.exp > Date.now()) return hit.val
  if (pending.has(k)) return pending.get(k)

  const p = fn()
    .then((val) => {
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value)
      store.set(k, { exp: Date.now() + ttl, val })
      return val
    })
    .finally(() => pending.delete(k))
  pending.set(k, p)
  return p
}

export function invalidateTeam(teamId) {
  const prefix = `${teamId}:`
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k)
}

export function invalidateAll() {
  store.clear()
}

const isWrite = (method) => method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'

// Pasang SETELAH requireAuth. Penulisan yang berhasil membersihkan cache tim pemiliknya.
export function invalidateOnWrite(req, res, next) {
  if (isWrite(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user) invalidateTeam(req.user.teamId)
    })
  }
  next()
}

// Untuk /api/admin: bisa mengubah data tim lain, jadi bersihkan semuanya.
export function invalidateAllOnWrite(req, res, next) {
  if (isWrite(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 400) invalidateAll()
    })
  }
  next()
}

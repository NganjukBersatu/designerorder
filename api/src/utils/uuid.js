const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

// Pasang di router: router.param('id', uuidParam) — ID di URL yang bukan UUID
// langsung 404, bukan dilempar ke PostgreSQL (yang membalas error 22P02 / 500).
export function uuidParam(req, res, next, value) {
  if (!isUuid(value)) {
    return res.status(404).json({ message: 'Data tidak ditemukan' })
  }
  next()
}

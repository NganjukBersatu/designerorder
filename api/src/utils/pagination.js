// Pagination bersifat opt-in: kalau frontend tidak kirim query `page`/`limit`,
// endpoint tetap mengembalikan semua baris seperti sebelumnya (tidak breaking).

const MAX_LIMIT = 200

export function parsePagination(query) {
  if (!query.page && !query.limit) return null

  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || 20))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

export function buildPaginationMeta(pagination, total) {
  if (!pagination) return null
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
  }
}

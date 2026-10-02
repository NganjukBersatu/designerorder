// Bangun potongan "SET col = $n, ..." untuk PATCH: hanya field yang BENAR-BENAR
// dikirim (bukan undefined) yang ikut diubah. Field yang tidak dikirim dibiarkan
// — sebelumnya UPDATE menimpa semua kolom, jadi PATCH { status } saja
// menghapus catatan, designer, dll.
//
// columns: { namaField: 'kolom' | { col, required, map } }
//   - nilai '' dianggap kosong -> disimpan NULL (itu cara "menghapus" isi kolom)
//   - required: kolom NOT NULL; nilai kosong diabaikan, bukan menghapus
//   - map: transformasi nilai dulu (mis. trim, normalisasi status)
export function buildSet(body, columns) {
  const sets = []
  const values = []
  for (const [key, spec] of Object.entries(columns)) {
    if (body[key] === undefined) continue
    const { col, required, map } = typeof spec === 'string' ? { col: spec } : spec
    let value = map ? map(body[key]) : body[key]
    if (value === '') value = null
    if (value === null && required) continue
    values.push(value)
    sets.push(`${col} = $${values.length}`)
  }
  return { sets, values }
}

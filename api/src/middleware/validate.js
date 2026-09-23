// Middleware validasi request body yang ringan, tanpa dependency tambahan.
// Contoh pemakaian: validateBody({ nama: { required: true, type: 'string', max: 150 } })

function isPresent(value) {
  return value !== undefined && value !== null && value !== ''
}

export function validateBody(rules) {
  return (req, res, next) => {
    const errors = []

    for (const [field, rule] of Object.entries(rules)) {
      const label = rule.label || field
      const value = req.body[field]

      if (!isPresent(value)) {
        if (rule.required) errors.push(`${label} wajib diisi`)
        continue
      }

      switch (rule.type) {
        case 'string': {
          if (typeof value !== 'string') {
            errors.push(`${label} harus berupa teks`)
            break
          }
          const len = value.trim().length
          if (rule.min && len < rule.min) errors.push(`${label} minimal ${rule.min} karakter`)
          if (rule.max && len > rule.max) errors.push(`${label} maksimal ${rule.max} karakter`)
          break
        }
        case 'number': {
          const num = Number(value)
          if (Number.isNaN(num)) {
            errors.push(`${label} harus berupa angka`)
            break
          }
          if (rule.integer && !Number.isInteger(num)) errors.push(`${label} harus bilangan bulat`)
          if (rule.min !== undefined && num < rule.min) errors.push(`${label} minimal ${rule.min}`)
          if (rule.max !== undefined && num > rule.max) errors.push(`${label} maksimal ${rule.max}`)
          break
        }
        case 'date': {
          if (Number.isNaN(Date.parse(value))) errors.push(`${label} bukan tanggal yang valid`)
          break
        }
        case 'array': {
          if (!Array.isArray(value)) {
            errors.push(`${label} harus berupa daftar (array)`)
            break
          }
          if (rule.itemType === 'string' && !value.every((v) => typeof v === 'string')) {
            errors.push(`${label} harus berisi teks semua`)
          }
          break
        }
        case 'enum': {
          if (!rule.values.includes(String(value).toLowerCase())) {
            errors.push(`${label} harus salah satu dari: ${rule.values.join(', ')}`)
          }
          break
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validasi gagal', errors })
    }
    next()
  }
}

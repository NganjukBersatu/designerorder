const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function amount(value) {
  return money.format(value || 0)
}

export function shortDate(value) {
  return value ? dateFmt.format(new Date(value)) : '—'
}

export function monthLabel(value) {
  return new Intl.DateTimeFormat('id-ID', { month: 'short' })
    .format(new Date(`${value}-01T00:00:00`))
    .replace('.', '')
}

export const STATUS_LABEL = {
  Pending: 'Menunggu',
  Progress: 'Dikerjakan',
  Done: 'Selesai',
}

export const STATUS_COLOR = {
  Pending: 'warn',
  Progress: 'brand',
  Done: 'ok',
}

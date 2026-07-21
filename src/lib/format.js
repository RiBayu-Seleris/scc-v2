import moment from 'moment'

/**
 * Number/date formatting helpers — mirror ehd-backoffice behaviour
 * (idrCurrency, toLocaleString('id-ID'), moment formats).
 */

/** "1000000" -> "1.000.000" (0 decimals, Indonesian grouping) */
export function formatNumber(value) {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '0'
  return n.toLocaleString('id-ID')
}

/** "1000000" -> "Rp 1.000.000" */
export function rupiah(value) {
  return 'Rp ' + formatNumber(value)
}

/** "1000000.5" -> "1.000.000,50" (with decimals) */
export function formatDecimal(value, digits = 2) {
  const n = Number(value)
  if (Number.isNaN(n)) return '0'
  return n.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Parse a user-typed rupiah string ("Rp 1.000.000") back to a Number */
export function parseNumber(value) {
  if (typeof value === 'number') return value
  if (!value) return 0
  return Number(String(value).replace(/[^\d-]/g, '')) || 0
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/** "01".."12" (or 1..12) -> "Januari".."Desember" */
export function indonesianMonth(value) {
  const idx = parseInt(value, 10) - 1
  return MONTHS_ID[idx] ?? ''
}

/** Format a date with moment. Pass an input format when the source is non-ISO. */
export function formatDate(value, output = 'DD/MM/YYYY', input = null) {
  if (!value) return '-'
  const m = input ? moment(value, input) : moment(value)
  return m.isValid() ? m.format(output) : '-'
}

export function formatDateTime(value) {
  return formatDate(value, 'DD/MM/YYYY HH:mm')
}

export function today(output = 'YYYY-MM-DD') {
  return moment().format(output)
}

export { moment }

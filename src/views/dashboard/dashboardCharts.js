import { formatNumber } from '@/lib/format'

/**
 * Helper chart untuk semua varian dashboard (utama / bank / management / chubb).
 * Satu tempat supaya gaya chart konsisten dan tidak ditulis ulang per halaman.
 */

export const CHART_PALETTE = ['#2563eb', '#10b585', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

// Palet khusus chart Keputusan Akseptasi dashboard Chubb (persis aslinya).
export const CHUBB_BAR_COLORS = ['#F765A3', '#63ABFD', '#A155B9', '#88F371', '#E96E39', '#FF0000', '#FFA500']

/** Format angka kartu dashboard (0 bila kosong). */
export const n = (v) => formatNumber(v ?? 0)

/** Donut standar: labels + series dari respons { label: [], value: [] }. */
export function donutChart(source, dark) {
  const labels = source?.label || []
  const series = (source?.value || []).map(Number)
  return {
    hasData: labels.length > 0,
    series,
    options: {
      chart: { type: 'donut', background: 'transparent' },
      labels,
      colors: CHART_PALETTE,
      legend: { position: 'bottom' },
      dataLabels: { enabled: true },
      theme: { mode: dark ? 'dark' : 'light' },
      stroke: { width: 0 },
    },
  }
}

/**
 * Bar vertikal dengan warna per kategori + legend di bawah
 * (label sumbu-X disembunyikan supaya teks panjang tidak terpotong).
 */
export function barChart(source, dark) {
  const categories = source?.label || []
  const series = (source?.value || []).map(Number)
  return {
    hasData: categories.length > 0,
    series: [{ name: 'Jumlah', data: series }],
    options: {
      chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
      xaxis: { categories, labels: { show: false }, axisTicks: { show: false } },
      colors: CHART_PALETTE,
      plotOptions: { bar: { borderRadius: 5, columnWidth: '48%', distributed: true } },
      dataLabels: { enabled: false },
      legend: {
        show: true,
        position: 'bottom',
        horizontalAlign: 'center',
        offsetY: 8,
        itemMargin: { horizontal: 12, vertical: 4 },
        markers: { radius: 3 },
      },
      theme: { mode: dark ? 'dark' : 'light' },
      grid: { borderColor: dark ? '#334155' : '#e2e8f0' },
    },
  }
}

/**
 * Bar HORIZONTAL untuk dashboard Chubb (kategori tetap, nilai dari field terpisah).
 * @param {string[]} categories label kategori
 * @param {number[]} values     nilai per kategori
 */
export function chubbBarChart(categories, values, dark) {
  return {
    hasData: values.some((v) => Number(v) > 0),
    series: [{ name: 'Jumlah', data: values.map((v) => Number(v) || 0) }],
    options: {
      chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
      plotOptions: {
        bar: { borderRadius: 5, borderRadiusApplication: 'end', distributed: true, horizontal: true },
      },
      colors: CHUBB_BAR_COLORS,
      dataLabels: { enabled: false },
      xaxis: { categories },
      legend: { show: false },
      theme: { mode: dark ? 'dark' : 'light' },
      grid: { borderColor: dark ? '#334155' : '#e2e8f0' },
    },
  }
}

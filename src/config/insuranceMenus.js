/**
 * Konfigurasi cabang menu per perusahaan asuransi.
 *
 * ID menu mengacu ke src/config/menu.js agar penyesuaian perusahaan tidak
 * tersebar sebagai kondisi khusus di komponen Sidebar.
 */
export const TAKAFUL_INSURANCE_COMPANY_ID = 15

/**
 * Apakah user aktif tergolong akun Takaful (insurance_company_id === 15)?
 * Sumber: localStorage 'InsuredCompanyId' (di-set saat login), mengikuti perilaku
 * isTakafulUser() di SCC. Dipakai mis. untuk label "Kode Unik TSS" vs "Kode Unik e-HD".
 */
export function isTakaful() {
  return Number(localStorage.getItem('InsuredCompanyId')) === TAKAFUL_INSURANCE_COMPANY_ID
}

export const INSURANCE_MENUS = {
  [TAKAFUL_INSURANCE_COMPANY_ID]: {
    key: 'takaful',
    routeOverrides: {
      'list-pengajuan': 'takaful-pengajuan-lengkap',
      'list-keputusan': 'takaful-keputusan-diterima',
    },
    hide: [
      // Dua blok awal sidebar SCC dibungkus !isTakaful.
      'csv',
      'excel-sertifikat',

      // Penutupan Takaful hanya menyisakan daftar pengajuan, keputusan,
      // dan pembatalan; item lain punya kondisi !isTakaful/flag yang dimatikan.
      'input-pengajuan',
      'list-pengajuan-ehd',
      'list-uw',
      'list-cover-note',
      'list-debit-note',
      'list-debit-notes-grm',

      // Seluruh grup transaksi ini berada dalam template !isTakaful.
      'klaim',
      'restitusi',

      // Di grup Laporan hanya Laporan Produksi yang tetap terlihat.
      'laporan-klaim',
      'laporan-restitusi',
      'laporan-ae',
      'laporan-invoice',

      // Blok menu bawah sidebar SCC seluruhnya dibungkus !isTakaful.
      'pembayaran-bulanan',
      'pricing',
      'valuasi',
      'reasuransi',
      'ae-monitoring',
      'analisa-bisnis',
      'keuangan',
      'layanan-pelanggan',
      'deteksi-fraud',
      'habis-kontrak',
      'layanan-data',
      'kalkulator',
      'panduan',
    ],
  },
}

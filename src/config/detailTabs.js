/**
 * Definisi TAB untuk halaman detail (restitusi & klaim).
 * Dipisah agar semua tab pada satu modul memakai daftar yang sama & konsisten.
 * Nama route harus cocok dengan yang terdaftar di src/router/index.js.
 */

export const restitusiDetailTabs = [
  { label: 'Data Debitur', route: 'detail-restitusi-data-debitur' },
  { label: 'Data Asuransi', route: 'detail-restitusi-data-asuransi' },
  { label: 'Dokumen Restitusi', route: 'detail-restitusi-dokumen-restitusi' },
  { label: 'Catatan Restitusi', route: 'detail-restitusi-catatan-restitusi' },
  { label: 'Diagram Risiko', route: 'detail-restitusi-diagram-restitusi' },
  { label: 'Penyebaran Risiko', route: 'detail-restitusi-penyebaran-restitusi' },
  { label: 'SLA', route: 'detail-restitusi-sla' },
]

export const klaimDetailTabs = [
  { label: 'Data Debitur', route: 'detail-klaim-data-debitur' },
  { label: 'Data Asuransi', route: 'detail-klaim-data-asuransi' },
  { label: 'Dokumen Klaim', route: 'detail-klaim-dokumen-klaim' },
  { label: 'Catatan Bank', route: 'detail-klaim-catatan-bank' },
  { label: 'Hasil Analisa Klaim', route: 'detail-klaim-hasil-analisa-klaim', visible: 'showClaimAnalysis' },
  { label: 'Revisi Klaim', route: 'detail-klaim-revisi-klaim', visible: 'showClaimRevision' },
  { label: 'SLA', route: 'detail-klaim-sla', visible: 'showClaimSla' },
]

/**
 * Tab detail Penutupan — urutan & gating PERSIS nav di seleris-credit-cover
 * `views/detail/data_debitur.vue` (14 tab):
 *   - showDokumenSpajkPage : tampil bila submission BELUM insert_spajk
 *   - showMenuForBank      : role selain Bank / Branch Bank
 *   - showMenuForAdmin     : hanya Admin
 */
export const penutupanDetailTabs = [
  { label: 'Data Debitur', route: 'detail-debitur' },
  { label: 'Data Asuransi', route: 'detail-data-asuransi' },
  { label: 'Dokumen SPAJK', route: 'detail-dokumen-spajk', visible: 'showDokumenSpajkPage' },
  { label: 'Dokumen Medis/Tambahan', route: 'detail-dokumen-medis-tambahan' },
  { label: 'EM/EP', route: 'detail-em-ep', visible: 'showMenuForBank' },
  { label: 'Riwayat Pengajuan', route: 'detail-riwayat-pengajuan' },
  { label: 'SLA', route: 'detail-sla', visible: 'showMenuForBank' },
  { label: 'Riwayat', route: 'detail-riwayat', visible: 'showMenuForBank' },
  { label: 'Revisi Data', route: 'detail-revisi-data', visible: 'showMenuForBank' },
  { label: 'Top Up Khusus', route: 'detail-topup-khusus' },
  { label: 'Penyebaran Risiko', route: 'detail-penyebaran-risiko' },
  { label: 'Diagram Risiko', route: 'detail-diagram-penyebaran-risiko' },
  { label: 'Fakultatif', route: 'detail-fakultatif', visible: 'showMenuForBank' },
  { label: 'Perubahan Data PIC', route: 'perubahan-data-pic', visible: 'showMenuForAdmin' },
]

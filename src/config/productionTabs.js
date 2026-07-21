/**
 * Tab LAPORAN PRODUKSI — dipakai bersama oleh halaman Akseptasi (komponen khusus)
 * dan ProductionReportPage (tab lainnya), supaya daftar & gating-nya satu sumber.
 *
 * Gating persis production_report_akseptasi.vue asli:
 *  - 'all'       : selalu tampil (Akseptasi)
 *  - 'brokergrm' : hanya Broker GRM (role Broker & broker_id 1) -> Surat Fee Base
 *  - 'internal'  : hanya role internal, yaitu SELAIN Bank / Branch Bank / Broker /
 *                  Insurance (di aslinya: flag showMenuForBank) -> selebihnya
 */
export const PRODUCTION_TABS = [
  { key: 'akseptasi', label: 'Akseptasi', route: 'laporan-produksi', scope: 'all' },
  { key: 'surat-feebase', label: 'Surat Fee Base', route: 'laporan-produksi-surat-feebase', scope: 'brokergrm' },
  { key: 'asuransi', label: 'Asuransi', route: 'laporan-produksi-asuransi', scope: 'internal' },
  { key: 'summary', label: 'Summary', route: 'laporan-produksi-summary', scope: 'internal' },
  { key: 'sppa', label: 'SPPA', route: 'laporan-produksi-sppa', scope: 'internal' },
  { key: 'restrukturisasi', label: 'Restrukturisasi', route: 'laporan-produksi-restrukturisasi', scope: 'internal' },
  { key: 'revisi', label: 'Revisi', route: 'laporan-produksi-revisi', scope: 'internal' },
  { key: 'produksi-telat', label: 'Produksi Telat', route: 'laporan-produksi-produksi-telat', scope: 'internal' },
  { key: 'produksi-pending', label: 'Produksi Pending', route: 'laporan-produksi-produksi-pending', scope: 'internal' },
  { key: 'bordero', label: 'Bordero', route: 'laporan-produksi-bordero', scope: 'internal' },
  { key: 'tanggungan', label: 'Tanggungan', route: 'laporan-produksi-tanggungan', scope: 'internal' },
  { key: 'yes-file', label: 'YES File', route: 'laporan-produksi-yes-file', scope: 'internal' },
]

/**
 * Saring tab sesuai role user (mengikuti v-if nav aslinya).
 * @param {string} role         role dari sesi (Admin/Bank/Broker/...)
 * @param {number} brokerUserId broker_id user (untuk deteksi Broker GRM)
 */
export function filterProductionTabs(role, brokerUserId) {
  // Persis flag showMenuForBank aslinya: keempat role ini tidak melihat tab lanjutan.
  const internal = !['Bank', 'Branch Bank', 'Broker', 'Insurance'].includes(role)
  const brokerGrm = role === 'Broker' && Number(brokerUserId) === 1
  return PRODUCTION_TABS.filter((t) => {
    if (t.scope === 'brokergrm') return brokerGrm
    if (t.scope === 'internal') return internal
    return true
  })
}

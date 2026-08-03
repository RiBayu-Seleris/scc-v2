/**
 * KONFIGURASI MENU SIDEBAR (sumber data tunggal).
 *
 * DISAMAKAN PERSIS dengan ehd-backoffice (components/layout/sidebar.vue):
 * urutan grup, label, dan gating role/partner mengikuti aslinya. Item yang
 * di-comment di aslinya TIDAK dimasukkan.
 *
 * Bentuk node:
 *   { id, label, icon (grup), route (menu tunggal/anak), flag / notFlag, children }
 * Aturan tampil ada di `buildMenu` (bawah). Flag berasal dari role/partner user
 * (lihat src/lib/menuFlags.js).
 */

export const MENU = [
  // 1. Dashboard
  // {
  //   id: "dashboard",
  //   label: "Dashboard",
  //   icon: "LayoutDashboard",
  //   children: [
  //     { id: "home", label: "Dashboard", route: "Home" },
  //     { id: "profil-risiko", label: "Profil Risiko", route: "profil-risiko" },
  //     { id: "top-ten", label: "Top 10 Criteria", route: "top-ten-criteria" },
  //   ],
  // },
  { id: "home", label: "Dashboard", icon: "LayoutDashboard", route: "Home" },

  // 2. CSV
  {
    id: "csv",
    label: "CSV",
    icon: "FileSpreadsheet",
    flag: "showCsvSumut",
    children: [
      {
        id: "csv-pengajuan",
        label: "Pengajuan Asuransi",
        route: "csv-pengajuan",
      },
      {
        id: "csv-sertifikat",
        label: "Sertifikat Asuransi",
        route: "csv-sertifikat",
      },
    ],
  },

  // 4. Excel Sertifikat (menu tunggal)
  {
    id: "excel-sertifikat",
    label: "Excel Sertifikat",
    icon: "FileSpreadsheet",
    route: "excel-certificate",
    flag: "showMenuBroker",
    enabledFlag: "showExcelBjb",
  },

  // 5. Penutupan — PERSIS submenu "Penutupan" (pertama) di sidebar ehd-backoffice.
  // Di aslinya ada dua toggle "Penutupan" tapi keduanya memakai id collapse yang
  // sama (#penutupan) sehingga hanya submenu pertama yang benar-benar terbuka;
  // maka di sini cukup SATU grup dengan isi submenu pertama itu.
  {
    id: "penutupan",
    label: "Penutupan",
    icon: "FileText",
    notFlag: "isManagement",
    children: [
      {
        id: "input-pengajuan",
        label: "Input Pengajuan",
        route: "input-pengajuan",
        flag: "canInputPengajuan",
      },
      {
        id: "list-pengajuan",
        label: "List Pengajuan",
        route: "list-data-pengajuan-non-medis",
        notFlag: "showPengajuanEhd",
      },
      {
        id: "list-pengajuan-ehd",
        label: "List Pengajuan",
        route: "list-data-pengajuan-ehd",
        flag: "showPengajuanEhd",
      },
      {
        id: "list-uw",
        label: "List Proses U/W",
        route: "list-data-underwriting",
        flag: "internalOnly",
      },
      {
        id: "list-keputusan",
        label: "List Keputusan",
        route: "list-data-keputusan",
      },
      {
        id: "list-pembatalan",
        label: "List Pembatalan",
        route: "list-pembatalan",
      },
      // { id: "dokumen-surat", label: "Dokumen & Surat", route: "dokumen-surat" },
      {
        id: "list-cover-note",
        label: "List Cover Note",
        route: "list-cover-note",
        flag: "internalOnly",
      },
      {
        id: "list-debit-note",
        label: "List Debit Note",
        route: "list-debit-note",
        flag: "internalOnly",
      },
      {
        id: "list-debit-notes-grm",
        label: "List Debit Notes",
        route: "list-debit-note",
        flag: "showMenuBrokerGrm",
      },
    ],
  },

  // Khusus akun Takaful; flag dihitung dari insurance_company_id di auth/data.
  {
    id: "takaful-inbound-outbound",
    label: "Inbound/Outbound",
    icon: "FileUp",
    flag: "showTakaful",
    children: [
      { id: "takaful-inbound", label: "Inbound", route: "takaful-inbound" },
      { id: "takaful-outbound", label: "Outbound", route: "takaful-outbound" },
    ],
  },

  // 5c. Klaim — di sidebar SCC grup ini muncul saat
  // (!showMenuBank && !showMenuInsuranceChubb && !showDirectorMenu && !showManagementMenu),
  // yang PERSIS sama dengan derived flag `transactionMenu`. Item di dalamnya punya
  // gating sendiri (Input Klaim -> showInputKlaim), mengikuti aslinya.
  {
    id: "klaim",
    label: "Klaim",
    icon: "ClipboardList",
    flag: "transactionMenu",
    children: [
      {
        id: "input-klaim",
        label: "Input Klaim",
        route: "input-klaim",
        flag: "showInputKlaim",
      },
      { id: "list-klaim", label: "List Klaim", route: "list-klaim-register" },
      {
        id: "input-klaim-khusus",
        label: "Input Klaim Khusus",
        route: "input-klaim-khusus",
      },
      {
        id: "list-klaim-khusus",
        label: "List Klaim Khusus",
        route: "list-klaim-khusus",
      },
    ],
  },

  // 5d. Restitusi — kondisi tampil sama dengan Klaim di sidebar SCC (transactionMenu).
  {
    id: "restitusi",
    label: "Restitusi",
    icon: "RotateCcw",
    flag: "transactionMenu",
    children: [
      {
        id: "input-restitusi",
        label: "Input Restitusi",
        route: "input-restitusi",
        flag: "showInputRestitusi",
      },
      {
        id: "list-restitusi",
        label: "List Restitusi",
        route: "list-restitusi",
      },
      {
        id: "list-topup-khusus",
        label: "List Topup Khusus",
        route: "list-topup-khusus",
      },
    ],
  },

  // 6. Laporan
  {
    id: "laporan",
    label: "Laporan",
    icon: "BarChart3",
    children: [
      {
        id: "laporan-produksi",
        label: "Laporan Produksi",
        route: "laporan-produksi",
      },
      {
        id: "laporan-klaim",
        label: "Laporan Klaim",
        route: "laporan-klaim",
        flag: "reportInternal",
      },
      {
        id: "laporan-restitusi",
        label: "Laporan Restitusi",
        route: "laporan-restitusi",
        flag: "reportInternal",
      },
      {
        id: "laporan-ae",
        label: "Laporan AE Monitoring",
        route: "laporan-ae-monitoring",
        flag: "reportInternal",
      },
      {
        id: "laporan-invoice",
        label: "Laporan Cetak Invoice",
        route: "laporan-cetak-invoice",
        flag: "reportInternal",
      },
    ],
  },

  // 7. Pembayaran Bulanan
  {
    id: "pembayaran-bulanan",
    label: "Pembayaran Bulanan",
    icon: "Wallet",
    flag: "showPembayaranBulanan",
    children: [
      {
        id: "input-pembayaran-bulanan",
        label: "Input Pembayaran Bulanan",
        route: "input-pembayaran-bulanan",
      },
      {
        id: "list-pembayaran-bulanan",
        label: "List Pembayaran Bulanan",
        route: "list-pembayaran-bulanan",
      },
    ],
  },

  // 8-10. Menu tunggal
  {
    id: "pricing",
    label: "Pricing",
    icon: "Tag",
    route: "pricing",
    flag: "showPricing",
  },
  {
    id: "valuasi",
    label: "Valuasi",
    icon: "TrendingUp",
    route: "valuasi",
    flag: "showValuasi",
  },
  {
    id: "reasuransi",
    label: "Reasuransi",
    icon: "Layers",
    route: "reasuransi",
    flag: "showReasuransi",
  },

  // 11. A/E Monitoring
  {
    id: "ae-monitoring",
    label: "A/E Monitoring",
    icon: "Activity",
    flag: "showAEMonitoring",
    children: [
      {
        id: "ae-laporan",
        label: "Laporan AE Monitoring",
        route: "laporan-ae-monitoring",
      },
    ],
  },

  // 12. Analisa Bisnis (menu tunggal)
  {
    id: "analisa-bisnis",
    label: "Analisa Bisnis",
    icon: "PieChart",
    route: "analisa-bisnis",
    flag: "showAnalisaBisnis",
  },

  // 13. Keuangan
  {
    id: "keuangan",
    label: "Keuangan",
    icon: "Wallet",
    flag: "showKeuangan",
    children: [
      {
        id: "keuangan-cover-note",
        label: "List Cover Note",
        route: "list-cover-note",
      },
      {
        id: "keuangan-debit-note",
        label: "List Debit Note",
        route: "list-debit-note",
      },
    ],
  },

  // 14. Layanan Pelanggan (menu tunggal)
  {
    id: "layanan-pelanggan",
    label: "Layanan Pelanggan",
    icon: "Headphones",
    route: "layanan-pelanggan",
    flag: "showLayananPelanggan",
  },

  // 15. Blok bawah — di sidebar asli SEMUA berada di dalam <li v-if="showDeteksiFraud">
  // (praktis hanya Admin). Disamakan persis: keempatnya ikut flag showDeteksiFraud.
  {
    id: "deteksi-fraud",
    label: "Deteksi Fraud",
    icon: "ShieldAlert",
    route: "deteksi-fraud",
    flag: "showDeteksiFraud",
  },
  {
    id: "habis-kontrak",
    label: "Habis Kontrak",
    icon: "CalendarClock",
    route: "habis-kontrak",
    flag: "showDeteksiFraud",
  },
  {
    id: "layanan-data",
    label: "Layanan Data",
    icon: "FolderSearch",
    route: "layanan-data",
    flag: "showDeteksiFraud",
  },
  {
    id: "kalkulator",
    label: "Kalkulator Asuransi",
    icon: "Calculator",
    route: "kalkulator-asuransi",
    flag: "showDeteksiFraud",
  },
  {
    id: "panduan",
    label: "Panduan Aplikasi",
    icon: "BookOpen",
    route: "panduan-aplikasi",
    flag: "showDeteksiFraud",
  },
];

/** Cek apakah satu node lolos filter flag. */
function passFlag(node, flags) {
  if (node.flag && !flags[node.flag]) return false;
  if (node.notFlag && flags[node.notFlag]) return false;
  return true;
}

/**
 * Bangun menu yang sudah difilter sesuai role/flag user.
 * @param {object} flags hasil dari menuFlags (sudah lewat withDerivedFlags)
 * @returns {Array} menu siap dirender
 */
export function buildMenu(flags) {
  const result = [];
  const insuranceMenu = flags.insuranceMenu || null;
  const hiddenIds = new Set(insuranceMenu?.hide || []);
  const routeOverrides = insuranceMenu?.routeOverrides || {};

  const prepareNode = (node) => {
    if (hiddenIds.has(node.id) || !passFlag(node, flags)) return null;
    const prepared = {
      ...node,
      disabled: node.enabledFlag ? !flags[node.enabledFlag] : false,
    };
    // Override berdasarkan ID menjaga label, ikon, dan susunan visual tetap sama.
    if (routeOverrides[node.id]) prepared.route = routeOverrides[node.id];
    return prepared;
  };

  for (const node of MENU) {
    const withState = prepareNode(node);
    if (!withState) continue;
    if (!node.children) {
      result.push(withState);
      continue;
    }
    const children = node.children.map(prepareNode).filter(Boolean);
    if (children.length > 0) result.push({ ...withState, children });
  }
  return result;
}

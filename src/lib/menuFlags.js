/**
 * Menu visibility flags — implementasi ulang role/partner SCC.
 *
 * Inputs come from:
 *   - GET auth/data/{userCode}     -> { role, broker_id, company_name, partner_id }
 *   - GET dashboard/select-bank    -> [ { partner_id, ... } ]
 *   - localStorage partnerIdSelected
 */

import { INSURANCE_MENUS } from '@/config/insuranceMenus'

const EHD_PARTNERS = [16, 25, 26, 27, 28, 29, 30, 31]

/**
 * Ambil konfigurasi perusahaan dari auth/data, dengan localStorage sebagai
 * fallback saat profil belum selesai dimuat. Number dipakai karena respons
 * backend dan localStorage dapat memberi tipe yang berbeda untuk ID yang sama.
 */
export function resolveInsuranceMenu(user) {
  const responseId = user?.insurance_company_id
  const insuranceId = Number(
    responseId === undefined || responseId === null
      ? localStorage.getItem('InsuredCompanyId')
      : responseId,
  )
  return INSURANCE_MENUS[insuranceId] || null
}

export function defaultFlags() {
  return {
    insuranceMenu: resolveInsuranceMenu(),
    isManagement: false,
    isDirector: false,
    isAdmin: false,
    showMenuBroker: false,
    showMenuBrokerGrm: false,
    showMenuInsuranceChubb: false,
    showMenuBank: false,
    showInputPengajuan: false,
    showInputKlaim: false,
    showInputRestitusi: false,
    showPembayaranBulanan: false,
    showPricing: false,
    showValuasi: false,
    showReasuransi: false,
    showAEMonitoring: false,
    showAnalisaBisnis: false,
    showKeuangan: false,
    showLayananPelanggan: false,
    showDeteksiFraud: false,
    showPengajuanEhd: false,
    showExcelBjb: true,
    showCsvSumut: false,
  }
}

/**
 * @param {object} user     auth/data response.data.data
 * @param {number} partnerIdSelected  localStorage partnerIdSelected (int)
 */
export function computeRoleFlags(user, partnerIdSelected) {
  const f = defaultFlags()
  if (!user) return f
  f.insuranceMenu = resolveInsuranceMenu(user)

  // Sidebar SCC menghentikan kalkulasi flag role ketika user adalah Takaful.
  // Menu yang tersisa kemudian ditentukan sepenuhnya oleh insuranceMenu.
  if (f.insuranceMenu) return f

  const role = user.role
  const brokerId = user.broker_id
  const companyName = (user.company_name || '').replace(/\s+/g, ' ').trim()
  const partnerId = user.partner_id

  if (role === 'Admin') f.isAdmin = true

  if (role === 'Management') {
    f.isManagement = true
    return f
  }
  if (role === 'Director') {
    f.isDirector = true
    return f
  }
  if (role === 'Broker' && brokerId === 1) f.showMenuBrokerGrm = true
  if (role === 'Broker') f.showMenuBroker = true
  if (role === 'Insurance' && companyName === 'PT Chubb Life Insurance Indonesia') {
    f.showMenuInsuranceChubb = true
  }
  if (role === 'Bank' || role === 'Branch Bank' || role === 'Broker') f.showMenuBank = true

  if (role === 'Admin' || role === 'Bank' || role === 'Branch Bank' || role === 'Broker') {
    f.showInputPengajuan = true
    f.showInputKlaim = true
    f.showInputRestitusi = true
  }
  if (role === 'Admin') {
    f.showPembayaranBulanan = true
    f.showPricing = true
    f.showValuasi = true
    f.showReasuransi = true
    f.showAEMonitoring = true
    f.showAnalisaBisnis = true
    f.showKeuangan = true
    f.showLayananPelanggan = true
    f.showDeteksiFraud = true
  }

  return f
}

/**
 * Refine flags with the dashboard/select-bank response (partner-scoped menus).
 * @param {object} f      flags from computeRoleFlags
 * @param {object} user   auth/data response
 * @param {array}  selectBank  dashboard/select-bank response.data.data
 * @param {number} partnerIdSelected
 */
export function applySelectBankFlags(f, user, selectBank, partnerIdSelected) {
  if (f.insuranceMenu) return f
  const role = user?.role
  const firstPartner = Array.isArray(selectBank) && selectBank[0] ? selectBank[0].partner_id : null

  if (EHD_PARTNERS.includes(partnerIdSelected) || EHD_PARTNERS.includes(firstPartner)) {
    f.showPengajuanEhd = true
  }

  if (partnerIdSelected === 26 && role === 'Broker') f.showExcelBjb = true
  else if (firstPartner === 26 && role === 'Broker') f.showExcelBjb = true
  else f.showExcelBjb = false

  if (partnerIdSelected === 25 && (role === 'Bank' || role === 'Branch Bank')) f.showCsvSumut = true
  else if (firstPartner === 25 && (role === 'Bank' || role === 'Branch Bank')) f.showCsvSumut = true

  return f
}

/**
 * Tambahkan "derived flags" — flag turunan yang dipakai berulang di menu,
 * supaya kondisi rumit tidak diulang-ulang di config menu (lebih bersih & mudah dibaca).
 * @param {object} f flags
 */
export function withDerivedFlags(f) {
  return {
    ...f,
    // Boleh input pengajuan hanya bila punya izin DAN bukan user bank.
    canInputPengajuan: f.showInputPengajuan && !f.showMenuBank,
    // Beberapa menu hanya untuk internal (bukan bank & bukan insurance Chubb).
    internalOnly: !f.showMenuBank && !f.showMenuInsuranceChubb,
    // Menu transaksi Klaim/Restitusi dan menu bawah mengikuti kondisi asli sidebar.
    transactionMenu: !f.showMenuBank && !f.showMenuInsuranceChubb && !f.isDirector && !f.isManagement,
    // Penutupan kedua di source lama juga mengecualikan Admin.
    statusPenutupan: !f.showMenuBank && !f.showMenuInsuranceChubb && !f.isDirector && !f.isManagement && !f.isAdmin,
    // Item laporan tertentu mengecualikan Bank/Chubb/Management, tetapi tidak mengecualikan Director.
    reportInternal: !f.showMenuBank && !f.showMenuInsuranceChubb && !f.isManagement,
  }
}

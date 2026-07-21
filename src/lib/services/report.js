import api from '@/lib/api'

/**
 * SERVICE LAPORAN — pola umum: kirim filter -> server balas URL file (PDF/Excel)
 * -> buka di tab baru. Endpoint mengikuti SCC sebagai sumber kontrak API.
 */

/**
 * Ambil daftar semua partner/bank untuk dropdown filter laporan.
 * @returns {Promise<Array>}
 */
export async function getAllPartners() {
  const { data } = await api.get('submission/all-partner')
  return data?.data || []
}

export async function getDashboardBanks() {
  const { data } = await api.get('dashboard/select-bank')
  return data?.data || []
}

/**
 * Ambil daftar broker + tambahkan opsi "Tanpa Broker" (broker_id 0) seperti aslinya.
 * @returns {Promise<Array>}
 */
export async function getAllBrokers() {
  const { data } = await api.get('submission/all-broker')
  const list = data?.data || []
  return [...list, { broker_id: 0, broker_name: 'Tanpa Broker' }]
}

/**
 * Ambil daftar cabang milik sebuah partner + opsi "Semua Cabang" (member_id 0) di depan.
 * @param {number|string} partnerId
 * @returns {Promise<Array>}
 */
export async function getMembersByPartner(partnerId) {
  const { data } = await api.get('submission/member-by-partner/' + partnerId)
  return [{ member_id: 0, member_name: 'Semua Cabang' }, ...(data?.data || [])]
}

export async function getMemberOfficesByBranch(memberId) {
  const { data } = await api.get('submission/member-office-by-branch/' + memberId)
  const offices = (data?.data || []).map((o) => ({
    member_id: o.member_office_id,
    member_name: o.member_office_name,
  }))
  return [{ member_id: 0, member_name: 'Semua Kantor' }, ...offices]
}

export async function getBrokersByPartner(partnerId) {
  const { data } = await api.get('submission/broker/partner/' + partnerId)
  const brokers = (data?.data || []).map((b) => ({
    ...b,
    broker_name: b.broker_name === 'Semua Broker & Tanpa Menggunakan Broker' ? 'Tanpa Menggunakan Broker' : b.broker_name,
  }))
  return [{ broker_id: 0, broker_name: 'Semua Broker' }, ...brokers]
}

/**
 * Ambil daftar asuransi milik sebuah partner + opsi "Semua Asuransi" (company_id 0) di depan.
 * @param {number|string} partnerId
 * @returns {Promise<Array>}
 */
export async function getCompaniesByPartner(partnerId) {
  const { data } = await api.get('submission/company-by-partner/' + partnerId)
  return [{ company_id: 0, company_name: 'Semua Asuransi' }, ...(data?.data || [])]
}

export async function getProductsByPartner(partnerId) {
  const { data } = await api.get('submission/select-product/' + partnerId)
  return [{ id: 0, product_name: 'Semua Produk' }, ...(data?.data || [])]
}

export async function getAllInsurances() {
  const { data } = await api.get('submission/all-insurance')
  return data?.data || []
}

export async function getAllReassurances() {
  const { data } = await api.get('submission/all-reassurance')
  return data?.data || []
}

export async function getAllRetrosesi() {
  const { data } = await api.get('submission/all-retrosesi')
  return data?.data || []
}

/**
 * Hasilkan laporan lalu buka filenya di tab baru.
 * @param {string} endpoint path endpoint laporan (mis. 'report/production/actual-experience')
 * @param {object} payload  body request (filter)
 * @returns {Promise<{ok: boolean, url?: string, message?: string}>}
 */
export async function generateReportFile(endpoint, payload) {
  try {
    const { data } = await api.post(endpoint, payload)
    if ((data.status === undefined || data.status === 200) && data.file?.url) {
      window.open(data.file.url, '_blank', 'noopener')
      return { ok: true, url: data.file.url }
    }
    return { ok: false, message: data.message || 'Laporan tidak tersedia untuk filter ini.' }
  } catch (e) {
    return { ok: false, message: e?.response?.data?.message || 'Terjadi kesalahan saat membuat laporan.' }
  }
}

/**
 * Periksa penanda ketersediaan data yang berbeda-beda pada respons laporan SCC.
 * Pemeriksaan ini dipisah dari komponen karena alasan penolakannya sama: file tidak
 * boleh dibuka ketika server menyatakan jumlah debitur/data laporan masih kosong.
 */
export function reportHasData(data, rule) {
  if (!rule) return true
  if (rule.type === 'sum') {
    return (data?.[rule.key] || []).reduce((total, item) => total + Number(item?.total_debitur || 0), 0) > 0
  }
  if (rule.type === 'array') return Array.isArray(data?.[rule.key]) && data[rule.key].length > 0
  if (rule.type === 'total') return Number(data?.[rule.key] || 0) > 0
  if (rule.type === 'not-null') return data?.[rule.key] !== null
  return true
}

/**
 * Hasilkan laporan dengan pemeriksaan isi respons sebelum file dibuka.
 * SCC memakai nama penanda berbeda untuk tiap laporan, sehingga rule dikirim
 * eksplisit agar kontrak respons tidak ditebak atau diseragamkan.
 */
export async function generateCheckedReportFile(endpoint, payload, rule) {
  try {
    const { data } = await api.post(endpoint, payload)
    if (data?.status !== undefined && data.status !== 200) {
      return { ok: false, message: data.message || 'Terjadi kesalahan saat membuat laporan.' }
    }
    if (!reportHasData(data, rule)) {
      return { ok: false, message: 'Data Laporan Tidak Tersedia' }
    }
    if (!data?.file?.url) return { ok: false, message: data?.message || 'File tidak tersedia' }
    window.open(data.file.url, '_blank', 'noopener')
    return { ok: true, url: data.file.url }
  } catch (e) {
    return { ok: false, message: e?.response?.data?.message || 'Terjadi kesalahan saat membuat laporan.' }
  }
}

export async function generateReportFileGet(endpoint, params) {
  try {
    const { data } = await api.get(endpoint, { params })
    if (data.file?.url) {
      window.open(data.file.url, '_blank', 'noopener')
      return { ok: true, url: data.file.url }
    }
    return { ok: false, message: data.message || 'Laporan tidak tersedia untuk filter ini.' }
  } catch (e) {
    return { ok: false, message: e?.response?.data?.message || 'Terjadi kesalahan saat membuat laporan.' }
  }
}

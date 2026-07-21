import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { roleScopeParams } from './scope'

/**
 * SERVICE RESTITUSI — kumpulan pemanggilan API restitusi di satu tempat.
 * Endpoint & parameter mengikuti ehd-backoffice (endpoint: restitute/list).
 *
 * Daftar restitusi difilter per-role (lihat @/lib/services/scope.js).
 */

/**
 * Buat "fetcher" untuk DataTable mode server pada daftar restitusi dengan status tertentu.
 * @param {string} status nilai query `restitute` (mis. 'restitute_registered')
 * @returns {(p: object) => Promise<{rows: any[], total: number}>}
 */
export function restituteListFetcher(status = 'restitute_registered') {
  return async ({ start, length, search }) => {
    const auth = useAuthStore()
    const session = getSession()
    // Pastikan profil user tersedia untuk menentukan cakupan role.
    const user = auth.user || (await auth.fetchUser())
    if (!user) {
      // Tanpa profil, request list tidak boleh berjalan tanpa pembatas scope role.
      throw new Error('Profil pengguna tidak tersedia')
    }

    const params = {
      restitute: status,
      ...roleScopeParams(user, session.partnerId),
      // Parameter pagination server (kompatibel gaya DataTables).
      start,
      length,
      search,
      draw: 1,
    }

    const { data } = await api.get('restitute/list', { params })
    // Respons gaya DataTables: { draw, recordsTotal, recordsFiltered, data:[...] }
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

/** Kirim konfirmasi tanggal debet restitusi. */
export function confirmDebetDate(restituteId, payload) {
  return api.put('restitute/confirm/debet-date/' + restituteId, payload)
}

/** Ambil notice debet restitusi dan tandai sebagai sudah diunduh. */
export async function getRestituteNoticeDebet(restituteId) {
  const { data } = await api.get('restitute/document/notice-debet/' + restituteId)
  return data?.file?.url || null
}

export async function checkRestitute(payload) {
  const { data } = await api.post('restitute/check-restitute', payload)
  return data?.data || {}
}

export function storeRestitute(payload) {
  return api.post('restitute/store', payload)
}

export async function getAccountBankOptions() {
  const { data } = await api.get('select-bank')
  return data?.account_bank || []
}

export async function getRestituteDiversify(id) {
  const { data } = await api.get('restitute/diversify/' + id)
  return data?.data || {}
}

export function updateRestituteDataStatus(dataRestituteId, payload) {
  return api.put('restitute/data/restitute-status/' + dataRestituteId, payload)
}

/**
 * Ambil detail debitur sebuah restitusi.
 * @param {string|number} id restitute_id
 * @returns {Promise<object>} objek profil debitur (response.data.data)
 */
export async function getRestituteDebitur(id) {
  const { data } = await api.get('restitute/detail-debitur/' + id)
  return data?.data || {}
}

/** Kirim email notifikasi dokumen restitusi ke debitur/bank. */
export function sendRestituteEmailNotification(id) {
  return api.get('notification/document/restitute/' + id)
}

/**
 * Ubah status restitusi (konfirmasi / tolak) di halaman detail debitur.
 * Endpoint & payload sama seperti aslinya: POST restitute/restitute-status/{id}.
 * @param {string|number} id
 * @param {object} payload { restitute_status, user_id }
 */
export function updateRestituteStatus(id, payload) {
  return api.post('restitute/restitute-status/' + id, payload)
}

/**
 * Konfirmasi pembayaran restitusi. PUT restitute/payment-status/{id}
 * { payment_date, description, user_id }. Setelah sukses, aslinya juga
 * men-set status menjadi 'restitute_paid' (dilakukan di halaman).
 */
export function updateRestitutePaymentStatus(id, payload) {
  return api.put('restitute/payment-status/' + id, payload)
}

/** Ambil detail data asuransi sebuah restitusi. */
export async function getRestituteInsurance(id) {
  const { data } = await api.get('restitute/detail-insurance/' + id)
  return data?.data || {}
}

/** Ambil daftar tahap SLA sebuah restitusi. */
export async function getRestituteSla(id) {
  const { data } = await api.get('restitute/sla/' + id)
  return data?.data || []
}

/** Ambil riwayat (catatan) sebuah restitusi. */
export async function getRestituteHistory(id) {
  const { data } = await api.get('restitute/history/' + id)
  return data?.data || []
}

/** Tambah catatan pada riwayat restitusi. */
export function storeRestituteHistory(payload) {
  return api.post('restitute/history', payload)
}

/** Ambil daftar dokumen yang dipersyaratkan untuk restitusi. */
export async function getRestituteRequiredDocuments(id) {
  const { data } = await api.get('restitute/required-document/' + id)
  return data?.data || []
}

/** Fetcher DataTable (server) untuk daftar dokumen sebuah restitusi. */
export function restituteDocumentsFetcher(id) {
  return async ({ start, length, search }) => {
    const { data } = await api.get('restitute/document/' + id, {
      params: { start, length, search, draw: 1 },
    })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

/** Daftarkan dokumen restitusi yang sudah diunggah (path dari uploadFile). */
export async function uploadRestituteDocument({ id, documentType, documentName, description, path }) {
  const { userId } = getSession()
  const { data } = await api.post('restitute/document/upload', {
    restitute_id: parseInt(id, 10),
    user_id: parseInt(userId, 10),
    document_type: documentType,
    document_name: documentName,
    description,
    document_url: path,
  })
  return data.status === 200
}

/** Hapus satu dokumen restitusi berdasarkan id dokumen. */
export function deleteRestituteDocument(docId) {
  return api.delete('restitute/document/restitute/' + docId)
}

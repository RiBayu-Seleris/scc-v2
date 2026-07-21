import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { roleScopeParams } from './scope'

/**
 * SERVICE KLAIM — endpoint claim/list (pola sama dengan restitusi).
 * Daftar klaim difilter per-role (lihat @/lib/services/scope.js).
 */

/**
 * Buat fetcher DataTable (mode server) untuk daftar klaim dengan status tertentu.
 * @param {string} status nilai query `claim` (mis. 'claim_registered')
 */
export function claimListFetcher(status = 'claim_registered') {
  return async ({ start, length, search }) => {
    const auth = useAuthStore()
    const session = getSession()
    const user = auth.user || (await auth.fetchUser())
    if (!user) {
      // Scope klaim bergantung pada profil; jangan meminta daftar tanpa pembatas role.
      throw new Error('Profil pengguna tidak tersedia')
    }

    const params = {
      claim: status,
      ...roleScopeParams(user, session.partnerId),
      start,
      length,
      search,
      draw: 1,
    }

    const { data } = await api.get('claim/list', { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

/**
 * Ambil detail debitur sebuah klaim.
 * @param {string|number} id claim_id
 * @returns {Promise<object>} profil debitur (response.data.data)
 */
export async function getClaimDebitur(id) {
  const { data } = await api.get('claim/detail-debitur/' + id)
  return data?.data || {}
}

/** Kirim email notifikasi dokumen klaim. */
export function sendClaimEmailNotification(id) {
  return api.get('notification/document/claim/' + id)
}

/**
 * Konfirmasi pembayaran klaim. PUT claim/payment-status/{id}.
 * (Ubah status klaim memakai updateClaimStatus yang sudah ada di bawah.)
 */
export function updateClaimPaymentStatus(id, payload) {
  return api.put('claim/payment-status/' + id, payload)
}

/** Konfirmasi tanggal pendebetan klaim yang sudah dibayar. */
export function confirmClaimDebetDate(id, payload) {
  return api.put('claim/confirm/debet-date/' + id, payload)
}

/** Ambil surat notice debet; endpoint sekaligus menandai surat sudah diunduh. */
export async function getClaimNoticeDebet(id) {
  const { data } = await api.get('claim/document/notice-debet/' + id)
  return data?.file?.url || null
}

/** Ajukan banding klaim. PUT claim/claim-appeal/{id} { claim_appeal_reason }. */
export function submitClaimAppeal(id, payload) {
  return api.put('claim/claim-appeal/' + id, payload)
}

/** Ambil berkas dokumen klaim yang ditolak (buka di tab baru). */
export async function getClaimRejectedDocument(id) {
  const { data } = await api.get('claim/rejected-document/' + id)
  return data?.file?.url || null
}

/** Ambil detail data asuransi sebuah klaim. */
export async function getClaimInsurance(id) {
  const { data } = await api.get('claim/detail-insurance/' + id)
  return data?.data || {}
}

/** Ambil daftar tahap SLA sebuah klaim. */
export async function getClaimSla(id) {
  const { data } = await api.get('claim/sla/' + id)
  return data?.data || []
}

/** Ambil riwayat (catatan) sebuah klaim. */
export async function getClaimHistory(id) {
  const { data } = await api.get('claim/history/' + id)
  return data?.data || []
}

/** Tambah catatan bank pada riwayat klaim. */
export function storeClaimHistory(payload) {
  return api.post('submission/history-claim', payload)
}

/** Ambil daftar dokumen yang dipersyaratkan untuk klaim. */
export async function getClaimRequiredDocuments(id) {
  const { data } = await api.get('claim/required-document/' + id)
  return data?.data || []
}

/** Fetcher DataTable (server) untuk daftar dokumen sebuah klaim. */
export function claimDocumentsFetcher(id) {
  return async ({ start, length, search }) => {
    const { data } = await api.get('claim/document/' + id, {
      params: { start, length, search, draw: 1 },
    })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

/** Daftarkan dokumen klaim yang sudah diunggah (path dari uploadFile). */
export async function uploadClaimDocument({ id, documentType, documentName, description, path }) {
  const { userId } = getSession()
  const { data } = await api.post('claim/document/upload', {
    claim_id: parseInt(id, 10),
    user_id: parseInt(userId, 10),
    document_type: documentType,
    document_name: documentName,
    description,
    document_url: path,
  })
  return data.status === 200
}

/** Hapus satu dokumen klaim berdasarkan id dokumen. */
export function deleteClaimDocument(docId) {
  return api.delete('claim/document/claim/' + docId)
}

/** Ambil data pendukung analisa klaim (sisa klaim + opsi diagnosa). */
export async function getClaimAnalyzeCheck(id) {
  const { data } = await api.get('claim/check-analyze/' + id)
  return data?.data || {}
}

/** Simpan hasil analisa dokter/asuransi. */
export function analyzeClaim(id, payload) {
  return api.put('claim/analyze/' + id, payload)
}

/** Update status klaim. */
export function updateClaimStatus(id, payload) {
  return api.put('claim/claim-status/' + id, payload)
}

/** Ambil data existing untuk form revisi klaim. */
export async function getClaimRevisionData(id) {
  const { data } = await api.get('claim/revision-data/' + id)
  return data?.data || {}
}

/** Simpan revisi data klaim. */
export function updateClaimRevision(id, payload) {
  return api.put('claim/revision-data/' + id, payload)
}

/** Riwayat revisi data klaim (server-side DataTable). */
export function claimRevisionHistoryFetcher(id) {
  return async ({ start, length, search }) => {
    const params = { start, length, search, draw: 1 }
    const { data } = await api.get('claim/revision-data/history/' + id, { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

export async function getClaimBenefit(id) {
  const { data } = await api.get('claim/benefit/' + id)
  return data?.data || {}
}

export function storeClaim(payload) {
  return api.post('claim/store', payload)
}

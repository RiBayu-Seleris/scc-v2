import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { roleScopeParams } from './scope'

/**
 * SERVICE PENGAJUAN (submission) — endpoint submission/list.
 *
 * Banyak halaman memakai endpoint yang sama dengan hanya beda "filter tetap"
 * (mis. Input Restitusi -> acceptance=accepted&payment=paid&active_insurance=true;
 * List Pengajuan Pending -> acceptance=pending; dst). Karena itu dibuat satu
 * pembuat fetcher yang menerima parameter tetap tersebut.
 */

/**
 * Buat fetcher DataTable (mode server) untuk endpoint submission/list.
 * @param {object} fixedParams filter tetap, mis. { acceptance:'accepted', payment:'paid' }
 * @param {object} roleParams filter tambahan per role, mis. { Management:{ already_recon:true } }
 * @returns {(p:object) => Promise<{rows:any[], total:number}>}
 */
export function submissionListFetcher(fixedParams = {}, roleParams = {}) {
  return async ({ start, length, search }) => {
    const auth = useAuthStore()
    const session = getSession()
    const user = auth.user || (await auth.fetchUser())
    if (!user) {
      // Profil wajib tersedia agar request tidak kehilangan pembatas broker/member
      // dan tanpa sengaja meminta cakupan data yang lebih luas.
      throw new Error('Profil pengguna tidak tersedia')
    }

    const params = {
      ...fixedParams,
      ...(roleParams[user.role] || {}),
      ...roleScopeParams(user, session.partnerId),
      start,
      length,
      search,
      draw: 1,
    }

    const { data } = await api.get('submission/list', { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

/** Konfirmasi pendebitan untuk beberapa pengajuan (List Debit Note). */
export function confirmSubmissionDebet(submissionIds = []) {
  return api.post('submission/debet/confirmed', {
    submission_id: submissionIds.map((id) => Number(id)),
  })
}

export async function getSubmissionDebitur(id) {
  const { data } = await api.get('submission/detail/' + id)
  return data?.data || {}
}

export async function getSubmissionInsurance(id) {
  const { data } = await api.get('submission/detail-insurance/' + id)
  return data?.data || {}
}

export async function getSubmissionSla(id) {
  const { data } = await api.get('submission/sla/' + id)
  return data?.data || []
}

export async function getSubmissionHistory(id) {
  const { data } = await api.get('submission/history/' + id)
  return data?.data || []
}

/** Tambah catatan riwayat pengajuan. */
export function storeSubmissionHistory(payload) {
  return api.post('submission/history-submission', payload)
}

export async function getSubmissionRequiredDocuments(id) {
  const { data } = await api.get('submission/required-document/' + id)
  return data?.data || []
}

export async function getSubmissionTruthStatements(id) {
  const { data } = await api.get('submission/its/' + id)
  return data?.data || []
}

export async function getSubmissionAccumulated(idCardNumber) {
  const { data } = await api.get('submission/accumulated-submission/' + idCardNumber)
  return data || { data: [], total_sum_insured: 0 }
}

export async function getSubmissionPartners() {
  const { data } = await api.get('submission/all-partner')
  return data?.data || []
}

export async function checkLifinsNik(idCardNumber) {
  const { data } = await api.get('submission/check-lifins/' + idCardNumber)
  return data
}

export async function getSubmissionMembersByPartner(partnerId) {
  const { data } = await api.get('submission/member-by-partner/' + partnerId)
  return data?.data || []
}

export async function getSubmissionProducts(partnerId, productType, withoutUnderwriting = false) {
  const base = productType === 'Produk Non PAB' ? 'submission/select-product-non-pab/' : 'submission/select-product/'
  const suffix = withoutUnderwriting ? '?underwriting=false' : ''
  const { data } = await api.get(base + partnerId + suffix)
  return data?.data || []
}

export async function getSubmissionInsurances(productId) {
  const { data } = await api.get('submission/select-insurance/' + productId)
  return data?.data || []
}

export async function getSubmissionBrokers(insuranceId) {
  const { data } = await api.get('submission/select-broker/' + insuranceId)
  const brokers = data?.data || []
  return [
    ...brokers,
    { broker_id: 0, broker_code: '', broker_name: 'Tanpa Broker' },
  ]
}

export function previewSubmissionPremium(payload) {
  return api.post('submission/preview-premium', payload)
}

export function storeSubmission(payload) {
  return api.post('submission/store/new', payload)
}

export function submissionSpajkDocumentsFetcher(submissionId) {
  return async ({ start, length, search }) => {
    const params = { start, length, search, draw: 1 }
    const { data } = await api.get('submission/document/spajk/' + submissionId, { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

export async function uploadSubmissionSpajkDocument({ id, documentType, documentName, description, path }) {
  const { data } = await api.post('submission/document/spajk/upload', {
    submission_id: parseInt(id, 10),
    document_type: documentType,
    document_name: documentName,
    description,
    document_url: path,
  })
  return data.status === 200
}

/** Ambil data awal untuk form SPAJK baru. */
export async function getSubmissionNewSpajkData(id) {
  const { data } = await api.get('submission/new-spajk/data/' + id)
  return data?.data || {}
}

/** Simpan form SPAJK baru beserta path tiga tanda tangan. */
export function storeSubmissionNewSpajk(payload) {
  return api.post('submission/new-spajk', payload)
}

export function submissionMedicalDocumentsFetcher(submissionId) {
  return async ({ start, length, search }) => {
    const params = { start, length, search, draw: 1 }
    const { data } = await api.get('submission/document/' + submissionId, { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

export async function uploadSubmissionMedicalDocument({ id, userId, documentType, documentName, description, path }) {
  const { data } = await api.post('submission/document/upload', {
    submission_id: parseInt(id, 10),
    document_type: documentType,
    document_name: documentName,
    description,
    document_url: path,
    user_id: parseInt(userId, 10),
  })
  return data.status === 200
}

export function deleteSubmissionMedicalDocument(documentId) {
  return api.delete('submission/document/medis/' + documentId)
}

export function submissionEmEpDocumentsFetcher(submissionId) {
  return async ({ start, length, search }) => {
    const params = { start, length, search, draw: 1 }
    const { data } = await api.get('submission/document/em-ep/' + submissionId, { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

export async function uploadSubmissionEmEpDocument({ id, documentType, documentName, description, path }) {
  const { data } = await api.post('submission/document/em-ep/upload', {
    submission_id: parseInt(id, 10),
    document_type: documentType,
    document_name: documentName,
    description,
    document_url: path,
  })
  return data.status === 200
}

export function storeSubmissionEmEp(payload) {
  return api.post('submission/em-ep/store', payload)
}

export async function getTopupInsurances() {
  const { data } = await api.get('submission/top-up/select-insurance')
  return data?.data || []
}

export function storeSubmissionTopup(payload) {
  return api.post('submission/top-up', payload)
}

export async function getDiversifiedClientRisk(id) {
  const { data } = await api.get('submission/diversified-client-risk/' + id)
  return data?.data || {}
}

export async function getSubmissionFacultative(id) {
  const { data } = await api.get('submission/facultative/' + id)
  return data?.data || { reassurance: [], retrosesi: [] }
}

export function updateFacultativeReassurance(treatyId, payload) {
  return api.put('submission/facultative/reassurance/' + treatyId, payload)
}

export function updateFacultativeRetrosesi(treatyId, payload) {
  return api.put('submission/facultative/retrosesi/' + treatyId, payload)
}

export function submissionIdCardHistoryFetcher(idCardNumber) {
  return async ({ start, length, search }) => {
    const params = { start, length, search, draw: 1 }
    const { data } = await api.get('submission/history/id-card/' + idCardNumber, { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

export function sendSubmissionMedicalNotification(id) {
  return api.get('notification/document/medis/' + id)
}

export function updateSubmissionAcceptanceStatus(id, payload) {
  return api.put('submission/acceptance-status/' + id, payload)
}

export function updateSubmissionAcceptanceStatusUat(id, payload) {
  return api.put('submission/acceptance-status/uat/' + id, payload)
}

export function updateSubmissionPaymentStatus(id, payload) {
  return api.put('submission/payment-status/' + id, payload)
}

export function updateSubmissionCertificateDate(id, payload) {
  return api.put('submission/document/certificate/date/' + id, payload)
}

export async function getSubmissionCoverNoteFile(id) {
  const { data } = await api.get('cover-note/sertificate/' + id)
  return data?.file || {}
}

export async function markSubmissionCoverNoteDownloaded(id) {
  const { data } = await api.get('submission/cover-note/download/' + id)
  return data
}


export async function getSubmissionRejectedFile(id) {
  const { data } = await api.get('submission/document/rejected/' + id)
  return data?.file || {}
}

export async function getSubmissionRiplayGeneralFile(id) {
  const { data } = await api.get('submission/riplay/general/' + id)
  return data?.file || {}
}

export async function getSubmissionRiplayPersonalFile(id) {
  const { data } = await api.get('submission/riplay/personal/' + id)
  return data?.file || {}
}

export async function getSubmissionNewSpajkFile(id) {
  const { data } = await api.get('document/new-spajk/' + id)
  return data?.file || {}
}

export async function getSubmissionSpkFile(id) {
  const { data } = await api.get('submission/health-cover-letter/' + id)
  return data?.file || {}
}

export async function getSubmissionMembershipCertificateFile(id) {
  const { data } = await api.get('membership/sertificate/' + id)
  return data?.file || {}
}

export async function getSubmissionMedicalDetectionFile(insuredProfileId) {
  const { data } = await api.get('document/medical/' + insuredProfileId)
  return data?.file || {}
}

/** Ambil data pengajuan untuk form revisi (persis aslinya: tanpa parameter tambahan). */
export async function getSubmissionRevisionField(id) {
  const { data } = await api.get('submission/revision-data/' + id)
  return data?.data || {}
}

export function updateSubmissionRevision(id, payload) {
  return api.put('submission/revision-data/' + id, payload)
}

export function submissionRevisionHistoryFetcher(id) {
  return async ({ start, length, search }) => {
    const params = { start, length, search, draw: 1 }
    const { data } = await api.get('submission/revision-data/history/' + id, { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

/* ============================================================
   PERUBAHAN DATA PIC (tab detail penutupan)
   ============================================================ */

/**
 * Daftar akun/PIC untuk pengajuan tertentu.
 * @param {string|number} id  submission_id
 * @param {boolean} uat       true = lingkungan UAT, false = PRODUCTION
 * Sumber: GET submission/account/list?submission_id=..&uat=..
 */
export async function getSubmissionAccounts(id, uat) {
  const { data } = await api.get('submission/account/list', {
    params: { submission_id: id, uat },
  })
  return (data?.data || []).map((item) => ({
    username: item.username,
    member_id: item.member_id,
    email: item.email,
    member_code: item.member_code,
    pic_name: item.pic_name,
    pic_phone: item.pic_phone,
    branch_id: item.branch_id,
  }))
}

/** Simpan perubahan akun/PIC pengajuan. Sumber: PUT submission/account/{id}. */
export function updateSubmissionAccount(id, payload) {
  return api.put('submission/account/' + id, payload)
}

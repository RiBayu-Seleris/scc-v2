<script setup>
/**
 * DETAIL PENUTUPAN - DATA DEBITUR.
 * Isi tab mengikuti detail/data_debitur.vue di seleris-credit-cover, memakai
 * komponen dan service terpusat milik proyek ini.
 *
 * Aturan tombol (persis aslinya):
 *  - Konfirmasi/Tolak : role Admin/Broker/Insurance, status onreview/accepted_by_broker,
 *    dan asuransinya bukan Chubb (pengajuan Chubb diputuskan lewat jalur lain).
 *  - Cetak Cover Note : hanya bank BJB (partner 26), setelah diterima.
 *  - Batal            : status sudah diterima, role Admin/Bank/Branch Bank/Broker/Insurance;
 *    konfirmasi lewat dialog Ya/Tidak (tanpa isian alasan).
 *  - Konfirmasi Pengajuan (broker GRM): Admin, atau Broker GRM saat status
 *    "Menunggu Konfirmasi Broker".
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FileDown, Mail, CheckCircle, XCircle, CreditCard, Ban, Download, PlayCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { formatNumber, moment, rupiah } from '@/lib/format'
import {
  getSubmissionAccumulated,
  getSubmissionCoverNoteFile,
  getSubmissionDebitur,
    getSubmissionInsurance,
  getSubmissionMedicalDetectionFile,
  getSubmissionMembershipCertificateFile,
  getSubmissionNewSpajkFile,
  getSubmissionRejectedFile,
  getSubmissionRequiredDocuments,
  getSubmissionRiplayGeneralFile,
  getSubmissionRiplayPersonalFile,
  getSubmissionSpkFile,
  getSubmissionTruthStatements,
  markSubmissionCoverNoteDownloaded,
  sendSubmissionMedicalNotification,
  updateSubmissionAcceptanceStatus,
  updateSubmissionAcceptanceStatusUat,
  updateSubmissionCertificateDate,
  updateSubmissionPaymentStatus,
} from '@/lib/services/submission'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import Spinner from '@/components/ui/Spinner.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'

useMeta({ title: 'Detail Debitur' })

const route = useRoute()
const auth = useAuthStore()
const id = route.params.id

const data = ref({})
const insurance = ref({})
const requiredDocuments = ref([])
const truthStatements = ref([])
const accumulates = ref([])
const totalAccumulate = ref(0)
const loading = ref(true)
const actionLoading = ref('')

// Video di-load HANYA saat diklik (click-to-load). Elemen <video> yang langsung
// dirender akan buffering/men-decode terus (preload) sehingga GPU & jaringan
// sibuk NONSTOP -> scroll patah. Ini mencegahnya sampai user benar-benar memutar.
const activeVideos = ref({ vital: false, front: false, side: false })

const showCertificateModal = ref(false)
const showStatusModal = ref(false)
const contractDate = ref('')
const contractNumber = ref('')
const confirmSubmissionStatus = ref('')

const showDokumenSpajkPage = ref(false)
const showAllButton = ref(true)
const showMenuForBank = ref(false)
const showMenuForAdmin = ref(false)

// Opsi ubah status (persis aslinya): default memakai Lien Clause,
// BJB (partner 26/28) memakai Extra Premi.
const submissionStatusOptions = [
  'Diterima Standar',
  'Diterima dengan Lien Clause',
  'Diterima Borderline Standard',
  'Menunggu Keputusan Underwriting',
  'Menunggu Hasil Pemeriksaan Kesehatan',
  'Ditolak',
]
const submissionStatusOptionsBJB = [
  'Diterima Standar',
  'Diterima dengan Extra Premi',
  'Diterima Borderline Standard',
  'Menunggu Keputusan Underwriting',
  'Menunggu Hasil Pemeriksaan Kesehatan',
  'Ditolak',
]

const session = computed(() => getSession())
const roleName = computed(() => auth.user?.role || session.value.role || '')
const userId = computed(() => parseInt(session.value.userId, 10) || parseInt(auth.user?.id, 10) || 0)
const partnerIdSelected = computed(() => (
  parseInt(session.value.partnerId, 10) ||
  parseInt(auth.user?.partner_id, 10) ||
  parseInt(insurance.value.partner_id, 10) ||
  parseInt(data.value.partner_id, 10) ||
  0
))
const brokerId = computed(() => parseInt(data.value.broker_id ?? insurance.value.broker_id ?? 0, 10) || 0)
const acceptanceStatus = computed(() => data.value.acceptance_status || '')
const acceptanceStatusDescription = computed(() => data.value.acceptance_status_description || acceptanceStatus.value || '-')
const paymentStatus = computed(() => data.value.payment_status || '')
const certificatePath = computed(() => data.value.certificate_path || '')
const countCoverNote = computed(() => Number(data.value.count_cover_note || 0))
const appChubb = computed(() => data.value.app === 'chubb')
const isSubmissionWithoutUnderwriting = computed(() => data.value.insured_profile_id !== 0 && data.value.insured_profile_id !== undefined)
const submissionStatus = computed(() => insurance.value.submission_status || data.value.submission_status || '')
const accountType = computed(() => insurance.value.account_type || data.value.account_type || '')
const cbcRate = computed(() => insurance.value.cbc_rate || data.value.cbc_rate || '')
const showSelerisSuggestion = computed(() => {
  const insurer = String(insurance.value.insurance_name || '').replace(/\s+/g, ' ').trim()
  return !(partnerIdSelected.value === 16 && insurer === 'PT Chubb Life Insurance Indonesia')
})
const showConfirmUatSubmissionButton = computed(() => (
  !!auth.user?.uat && acceptanceStatusDescription.value === 'Menunggu Keputusan Underwriting'
))
// Nama asuransi (dinormalkan) — dipakai untuk mengecualikan pengajuan Chubb.
const insurerName = computed(() => String(insurance.value.insurance_name || '').replace(/\s+/g, ' ').trim())
const showConfirmSubmissionButton = computed(() => (
  ['Admin', 'Broker', 'Insurance'].includes(roleName.value) &&
  ['onreview', 'accepted_by_broker'].includes(acceptanceStatus.value) &&
  partnerIdSelected.value !== 16 &&
  insurerName.value !== 'PT Chubb Life Insurance Indonesia'
))
const showRejectButton = computed(() => showConfirmSubmissionButton.value)
// Cover Note hanya untuk bank BJB (partner 26), setelah pengajuan diterima,
// dan bukan untuk role Bank/Branch Bank/Retrosesi/Reassurance (persis aslinya).
const showCoverNoteButton = computed(() => (
  acceptanceStatus.value === 'accepted' &&
  !['Bank', 'Branch Bank', 'Retrosesi', 'Reassurance'].includes(roleName.value) &&
  partnerIdSelected.value === 26
))
const showAcceptPaymentButton = computed(() => (
  acceptanceStatus.value === 'accepted' &&
  paymentStatus.value !== 'paid' &&
  countCoverNote.value > 0 &&
  ((brokerId.value !== 0 && roleName.value === 'Broker') || (brokerId.value === 0 && roleName.value === 'Insurance'))
))
const showDownloadSpajk = computed(() => !!data.value.insert_spajk)
const showDownloadSpk = computed(() => submissionStatus.value === 'medis')
// Batal: setelah diterima, untuk kelima role operasional (persis aslinya).
const showCancelSubmissionButton = computed(() => (
  acceptanceStatus.value === 'accepted' &&
  ['Admin', 'Bank', 'Branch Bank', 'Broker', 'Insurance'].includes(roleName.value)
))
// Konfirmasi Pengajuan (broker GRM): Admin, atau Broker GRM (broker_id 1) saat
// status "Menunggu Konfirmasi Broker" (persis aslinya).
const showConfirmBrokerButton = computed(() => (
  roleName.value === 'Admin' ||
  (roleName.value === 'Broker' && brokerId.value === 1 &&
    acceptanceStatusDescription.value === 'Menunggu Konfirmasi Broker')
))
const showDeclineDownload = computed(() => acceptanceStatusDescription.value === 'Ditolak')
const statusOptions = computed(() => {
  if (partnerIdSelected.value === 26 || partnerIdSelected.value === 28) return submissionStatusOptionsBJB
  return submissionStatusOptions
})
const tabContext = computed(() => ({
  showDokumenSpajkPage: showDokumenSpajkPage.value,
  showMenuForBank: showMenuForBank.value,
  showMenuForAdmin: showMenuForAdmin.value,
}))
const sumInsuredAdvice = computed(() => withSuffix(data.value.sum_insured_advice, ' x Pendapatan Nasabah Per Bulan'))
const insurancePeriodAdvice = computed(() => withSuffix(data.value.insurance_period_advice, ' Bulan'))
const extraPremiumRate = computed(() => withSuffix(data.value.extra_premium_rate, ' %'))
const latitude = computed(() => toCoordinate(data.value.latitude))
const longitude = computed(() => toCoordinate(data.value.longitude))
const hasGeolocation = computed(() => Number.isFinite(latitude.value) && Number.isFinite(longitude.value))
const googleMapUrl = computed(() => {
  if (!hasGeolocation.value) return ''
  return `https://www.google.com/maps?q=${latitude.value},${longitude.value}`
})
const openStreetMapEmbedUrl = computed(() => {
  if (!hasGeolocation.value) return ''
  const offset = 0.01
  const bbox = [
    longitude.value - offset,
    latitude.value - offset,
    longitude.value + offset,
    latitude.value + offset,
  ].join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude.value},${longitude.value}`
})

function withSuffix(value, suffix) {
  if (value === null || value === undefined || value === '') return ''
  return `${value}${suffix}`
}

function toCoordinate(value) {
  if (value === null || value === undefined || value === '') return Number.NaN
  return Number.parseFloat(String(value).replace(',', '.'))
}

function field(value) {
  return value === null || value === undefined || value === '' ? '-' : value
}

function genderLabel(value) {
  if (value === 'Male') return 'Laki-laki'
  if (value === 'Female') return 'Perempuan'
  return value || '-'
}

function alert(icon, title, text = '') {
  return window.Swal.fire({ icon, title, text, padding: '2em' })
}

function openFile(file, fallbackUrl = '') {
  const url = file?.url || file?.file_url || file?.path || fallbackUrl
  if (!url) return alert('error', 'File tidak tersedia')
  window.open(url, '_blank')
}

async function runAction(key, fn) {
  if (actionLoading.value) return
  actionLoading.value = key
  try {
    await fn()
  } catch (error) {
    alert('error', error?.response?.data?.message || 'Terjadi Kesalahan')
  } finally {
    actionLoading.value = ''
  }
}

async function loadData() {
  loading.value = true
  try {
    const user = auth.user || (await auth.fetchUser())
    // Tanpa profil, request detail ditahan agar aturan scope dan hak aksi tidak hilang.
    if (!user) return
    const [detail, detailInsurance, documents, statements] = await Promise.all([
      getSubmissionDebitur(id),
      getSubmissionInsurance(id),
      getSubmissionRequiredDocuments(id),
      getSubmissionTruthStatements(id),
    ])

    data.value = detail
    insurance.value = detailInsurance
    requiredDocuments.value = documents
    truthStatements.value = statements

    showDokumenSpajkPage.value = !detail.insert_spajk
    showAllButton.value = !['Reassurance', 'Retrosesi'].includes(user?.role)
    showMenuForBank.value = !['Bank', 'Branch Bank'].includes(user?.role)
    showMenuForAdmin.value = user?.role === 'Admin'

    if (detail.id_card_number) {
      const accumulated = await getSubmissionAccumulated(detail.id_card_number)
      accumulates.value = accumulated.data || []
      totalAccumulate.value = accumulated.total_sum_insured || 0
    }
  } catch (error) {
    alert('error', error?.response?.data?.message || 'Gagal memuat detail debitur')
  } finally {
    loading.value = false
  }
}

function acceptancePayload(status) {
  return { acceptance_status: status, user_id: userId.value }
}

async function sendEmailNotification() {
  await runAction('email', async () => {
    await sendSubmissionMedicalNotification(id)
    await alert('success', 'Email Notifikasi Terkirim')
  })
}

async function accept() {
  await runAction('accept', async () => {
    await updateSubmissionAcceptanceStatus(id, acceptancePayload(roleName.value === 'Broker' ? 'accepted_by_broker' : 'accepted'))
    await alert('success', 'Berhasil!')
    await loadData()
  })
}

async function reject() {
  const result = await window.Swal.fire({
    title: 'Tolak Pengajuan ?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Tolak',
    cancelButtonText: 'Batal',
    padding: '2em',
  })
  if (!result.isConfirmed && !result.value) return
  await runAction('reject', async () => {
    await updateSubmissionAcceptanceStatus(id, acceptancePayload('rejected'))
    await alert('success', 'Berhasil!')
    await loadData()
  })
}

async function acceptPayment() {
  await runAction('payment', async () => {
    await updateSubmissionPaymentStatus(id, { payment_status: 'paid', user_id: userId.value })
    await alert('success', 'Berhasil!')
    await loadData()
  })
}

async function pdfCoverNote() {
  await runAction('cover-note', async () => {
    const file = await getSubmissionCoverNoteFile(id)
    openFile(file)
    await markSubmissionCoverNoteDownloaded(id)
    await loadData()
  })
}


async function downloadRiplayUmum() {
  await runAction('riplay-general', async () => openFile(await getSubmissionRiplayGeneralFile(id)))
}

async function downloadRiplayPersonal() {
  await runAction('riplay-personal', async () => openFile(await getSubmissionRiplayPersonalFile(id)))
}

async function downloadSpajk() {
  await runAction('spajk', async () => openFile(await getSubmissionNewSpajkFile(id)))
}

async function downloadSpk() {
  await runAction('spk', async () => openFile(await getSubmissionSpkFile(id)))
}

async function declineDownload() {
  await runAction('decline', async () => openFile(await getSubmissionRejectedFile(id)))
}

async function downloadCertificate() {
  await runAction('certificate-download', async () => {
    const file = await getSubmissionMembershipCertificateFile(id)
    openFile(file, certificatePath.value)
  })
}

async function pdfCertificate() {
  if (!contractDate.value) return alert('error', 'Tanggal Akad wajib diisi')
  if (partnerIdSelected.value === 16 && !contractNumber.value) return alert('error', 'Nomor Akad wajib diisi')
  if (partnerIdSelected.value === 31 && !contractNumber.value) return alert('error', 'Nomor LD wajib diisi')

  await runAction('certificate', async () => {
    const startDate = moment(contractDate.value, 'YYYY-MM-DD').format('DD/MM/YYYY')
    const { data: response } = await updateSubmissionCertificateDate(id, {
      start_date: startDate,
      contract_number: contractNumber.value,
    })
    if (response?.status === 400) throw new Error(response?.message || 'Terjadi kesalahan')
    openFile(response?.file)
    showCertificateModal.value = false
    await loadData()
  })
}

async function cancelSubmission() {
  // Persis aslinya: konfirmasi Ya/Tidak, tanpa isian alasan.
  const result = await window.Swal.fire({
    icon: 'question',
    title: 'Batalkan Pengajuan ?',
    showCancelButton: true,
    confirmButtonText: 'Ya',
    cancelButtonText: 'Tidak',
    padding: '2em',
  })
  if (!result.isConfirmed && !result.value) return
  await runAction('cancel', async () => {
    await updateSubmissionAcceptanceStatus(id, {
      user_id: userId.value,
      acceptance_status: 'cancelled',
    })
    await loadData()
  })
}

async function updateStatusSubmissionBroker() {
  // Konfirmasi pengajuan oleh broker GRM (persis aslinya).
  const result = await window.Swal.fire({
    title: 'Anda yakin akan mengkonfirmasi pengajuan?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Konfirmasi',
    cancelButtonText: 'Batal',
    reverseButtons: true,
  })
  if (!result.isConfirmed) return
  await runAction('confirm-broker', async () => {
    await updateSubmissionAcceptanceStatus(id, {
      user_id: userId.value,
      acceptance_status: 'accepted_by_broker',
    })
    await alert('success', 'Berhasil!')
    await loadData()
  })
}

async function updateStatusSubmission() {
  const map = {
    'Diterima Borderline Standard': 'APPROVED BL STD',
    'Diterima Standar': 'APPROVED STD',
    'Diterima dengan Extra Premi': 'APPROVED SUBSTD',
    'Diterima dengan Lien Clause': 'APPROVED LC',
    Ditolak: 'REJECT',
    'Menunggu Keputusan Underwriting': 'PENDING',
    'Menunggu Hasil Pemeriksaan Kesehatan': 'MEDIS',
  }
  const acceptance_status = map[confirmSubmissionStatus.value]
  if (!acceptance_status) return alert('error', 'Status Pengajuan wajib diisi')

  await runAction('status', async () => {
    await updateSubmissionAcceptanceStatusUat(id, { acceptance_status })
    await alert('success', 'Berhasil!')
    showStatusModal.value = false
    await loadData()
  })
}

async function downloadLifinsReport() {
  await runAction('lifins', async () => {
    if (!data.value.insured_profile_id) return alert('error', 'Data insured profile tidak tersedia')
    openFile(await getSubmissionMedicalDetectionFile(data.value.insured_profile_id))
  })
}

onMounted(loadData)
</script>

<template>
  <DetailTabsLayout
    :tabs="penutupanDetailTabs"
    :id="id"
    title="Detail Debitur"
    :back="{ name: 'list-data-pengajuan-non-medis' }"
    :tab-context="tabContext"
  >
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-5">
      <Card v-if="requiredDocuments.length">
        <template #header>
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Dokumen Medis/Tambahan Diperlukan</h3>
        </template>
        <template #actions>
          <BaseButton v-if="showAllButton" size="sm" variant="outline-primary" :loading="actionLoading === 'email'" @click="sendEmailNotification">
            <Mail class="h-4 w-4" /> Kirim Email Notifikasi
          </BaseButton>
        </template>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label
            v-for="(requiredDocument, index) in requiredDocuments"
            :key="index"
            class="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
          >
            <input :checked="requiredDocument.document_exist" type="checkbox" class="form-checkbox" disabled />
            <span>{{ requiredDocument.document_required }}</span>
          </label>
        </div>
      </Card>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <p class="text-xs font-medium text-slate-500">Status Debitur</p>
          <Badge variant="primary" class="mt-2">{{ acceptanceStatusDescription }}</Badge>
        </Card>
        <Card v-if="partnerIdSelected === 26">
          <p class="text-xs font-medium text-slate-500">Jenis AO</p>
          <Badge variant="primary" class="mt-2">{{ accountType || '-' }}</Badge>
        </Card>
        <Card>
          <p class="text-xs font-medium text-slate-500">Tipe Pengajuan</p>
          <Badge :variant="submissionStatus === 'fcl' ? 'warning' : 'primary'" class="mt-2">{{ submissionStatus || '-' }}</Badge>
        </Card>
        <Card v-if="submissionStatus === 'medis'">
          <p class="text-xs font-medium text-slate-500">Medis</p>
          <Badge variant="primary" class="mt-2">{{ cbcRate || '-' }}</Badge>
        </Card>
        <Card v-if="appChubb && ['Insurance', 'Admin'].includes(roleName)">
          <p class="text-xs font-medium text-slate-500">Waktu Update Keputusan</p>
          <Badge variant="primary" class="mt-2">{{ data.outbound_time || '-' }}</Badge>
        </Card>
      </div>

      <Card v-if="appChubb && ['Insurance', 'Admin'].includes(roleName)" title="Direktori Inbound">
        <p class="break-words text-sm font-medium text-slate-700 dark:text-slate-200">{{ data.inbound_dir || '-' }}</p>
      </Card>

      <Card>
        <template #header>
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Profil</h3>
        </template>
        <template #actions>
          <div v-if="showAllButton" class="flex flex-wrap justify-end gap-2">
            <BaseButton v-if="showConfirmUatSubmissionButton || showMenuForAdmin" size="sm" @click="showStatusModal = true">Konfirmasi</BaseButton>
            <BaseButton size="sm" :loading="actionLoading === 'riplay-general'" @click="downloadRiplayUmum"><FileDown class="h-4 w-4" /> Cetak RIPLAY Umum</BaseButton>
            <BaseButton size="sm" :loading="actionLoading === 'riplay-personal'" @click="downloadRiplayPersonal"><FileDown class="h-4 w-4" /> Cetak RIPLAY Personal</BaseButton>
            <BaseButton v-if="showConfirmSubmissionButton" size="sm" variant="success" :loading="actionLoading === 'accept'" @click="accept"><CheckCircle class="h-4 w-4" /> Konfirmasi</BaseButton>
            <BaseButton v-if="showRejectButton" size="sm" variant="danger" :loading="actionLoading === 'reject'" @click="reject"><XCircle class="h-4 w-4" /> Tolak</BaseButton>
            <BaseButton v-if="showCoverNoteButton" size="sm" :loading="actionLoading === 'cover-note'" @click="pdfCoverNote"><FileDown class="h-4 w-4" /> Cetak Cover Note</BaseButton>
            <BaseButton v-if="showAcceptPaymentButton" size="sm" :loading="actionLoading === 'payment'" @click="acceptPayment"><CreditCard class="h-4 w-4" /> Konfirmasi Pembayaran</BaseButton>
            <BaseButton v-if="!certificatePath && acceptanceStatus === 'accepted'" size="sm" @click="showCertificateModal = true"><FileDown class="h-4 w-4" /> Cetak Sertifikat</BaseButton>
            <BaseButton v-if="certificatePath && acceptanceStatus === 'accepted'" size="sm" :loading="actionLoading === 'certificate-download'" @click="downloadCertificate"><FileDown class="h-4 w-4" /> Cetak Sertifikat</BaseButton>
            <BaseButton v-if="showDownloadSpajk" size="sm" :loading="actionLoading === 'spajk'" @click="downloadSpajk"><FileDown class="h-4 w-4" /> Cetak PPAJK</BaseButton>
            <BaseButton v-if="showDownloadSpk" size="sm" :loading="actionLoading === 'spk'" @click="downloadSpk"><FileDown class="h-4 w-4" /> Cetak SPK</BaseButton>
            <BaseButton v-if="showCancelSubmissionButton" size="sm" variant="warning" :loading="actionLoading === 'cancel'" @click="cancelSubmission"><Ban class="h-4 w-4" /> Batal</BaseButton>
            <BaseButton v-if="showConfirmBrokerButton" size="sm" variant="success" :loading="actionLoading === 'confirm-broker'" @click="updateStatusSubmissionBroker"><CheckCircle class="h-4 w-4" /> Konfirmasi Pengajuan</BaseButton>
            <BaseButton v-if="showDeclineDownload" size="sm" :loading="actionLoading === 'decline'" @click="declineDownload"><FileDown class="h-4 w-4" /> Cetak Surat Decline</BaseButton>
          </div>
        </template>
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Nama Debitur" :value="data.debitur_name" />
          <InfoField label="No. Rekening" :value="data.account_number" />
          <InfoField label="Tanggal Lahir" :value="data.dob" />
          <InfoField label="Tempat Lahir" :value="data.pob" />
          <InfoField label="Jenis Identitas" :value="data.id_card_type" />
          <InfoField label="NIK" :value="data.id_card_number" />
          <InfoField label="Jenis Kelamin" :value="genderLabel(data.gender)" />
          <InfoField label="Usia" :value="data.age ? `${data.age} Tahun` : ''" />
          <InfoField label="Pekerjaan" :value="data.occupation" />
          <InfoField label="Detail Pekerjaan" :value="data.detail_occupation" />
        </dl>
      </Card>

      <Card title="Kontak">
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Alamat" :value="data.customer_contact_address" />
          <InfoField label="Kota" :value="data.customer_contact_city" />
          <InfoField label="Telepon" :value="data.customer_contact_telephone" />
          <InfoField label="No. Handphone" :value="data.customer_contact_phone_number" />
          <InfoField label="Email" :value="data.customer_contact_email" />
        </dl>
      </Card>

      <Card title="Tempat Bekerja">
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Nama Instansi / Perusahaan" :value="data.company_name" />
          <InfoField label="Jabatan" :value="data.company_position" />
          <InfoField label="Jenis Bidang Usaha" :value="data.company_field" />
          <InfoField label="Alamat" :value="data.company_address" />
        </dl>
      </Card>

      <Card v-if="truthStatements.length" title="Pernyataan Kebenaran Data & Informasi Nasabah">
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          <details v-for="(statement, index) in truthStatements" :key="index" open class="py-3">
            <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">{{ statement.question }}</summary>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ field(statement.answer) }}</p>
          </details>
        </div>
      </Card>

      <template v-if="isSubmissionWithoutUnderwriting">
        <Card v-if="data.similarity === false" title="Peringatan Deteksi">
          <p class="text-sm font-semibold text-danger">*Foto/Video debitur terdeteksi bukan orang yang sama</p>
        </Card>

        <Card title="Foto, Video, dan Geolokasi">
          <div class="space-y-6">
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div class="lg:col-span-4 xl:col-span-3">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Foto KTP</h4>
                  <BaseButton v-if="data.id_card_url" size="sm" variant="secondary" @click="openFile(null, data.id_card_url)">Bandingkan</BaseButton>
                </div>
                <img
                  :src="data.id_card_url || '/assets/images/avatar.png'"
                  alt="Foto identitas debitur"
                  class="h-[300px] w-full rounded-lg border border-slate-200 object-cover p-1 dark:border-slate-800"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div class="lg:col-span-8 xl:col-span-9">
                <h4 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Geolokasi</h4>
                <div class="rounded-lg border border-slate-200 p-1 dark:border-slate-800">
                  <iframe
                    v-if="hasGeolocation"
                    :src="openStreetMapEmbedUrl"
                    title="Peta geolokasi debitur"
                    class="h-[300px] w-full rounded-md border-0"
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                  ></iframe>
                  <div v-else class="flex h-[300px] items-center justify-center rounded-md bg-slate-50 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    Geolokasi tidak tersedia.
                  </div>
                </div>
                <div v-if="hasGeolocation" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoField label="Latitude" :value="data.latitude" />
                  <InfoField label="Longitude" :value="data.longitude" />
                </div>
                <BaseButton v-if="googleMapUrl" class="mt-4" size="sm" variant="outline-primary" @click="openFile(null, googleMapUrl)">Buka Peta</BaseButton>
              </div>
            </div>

            <div>
              <h4 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Video</h4>
              <!-- Horizontal scroll berisi tile video. Video di-load hanya saat diklik
                   (click-to-load) supaya tidak buffering/men-decode nonstop. -->
              <div
                v-if="data.vital_video_url || data.front_appearance_video_url || data.side_appearance_video_url"
                class="flex gap-4 overflow-x-auto pb-2"
              >
                <div v-if="data.vital_video_url" class="relative h-[260px] w-[320px] shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <video v-if="activeVideos.vital" :src="data.vital_video_url" class="h-full w-full object-cover" controls autoplay playsinline />
                  <button v-else type="button" class="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" @click="activeVideos.vital = true">
                    <PlayCircle class="h-10 w-10" /><span class="text-xs font-medium">Putar video</span>
                  </button>
                </div>
                <div v-if="!appChubb && data.front_appearance_video_url" class="relative h-[260px] w-[320px] shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <video v-if="activeVideos.front" :src="data.front_appearance_video_url" class="h-full w-full object-cover" controls autoplay playsinline />
                  <button v-else type="button" class="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" @click="activeVideos.front = true">
                    <PlayCircle class="h-10 w-10" /><span class="text-xs font-medium">Putar video</span>
                  </button>
                </div>
                <div v-if="!appChubb && data.side_appearance_video_url" class="relative h-[260px] w-[320px] shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <video v-if="activeVideos.side" :src="data.side_appearance_video_url" class="h-full w-full object-cover" controls autoplay playsinline />
                  <button v-else type="button" class="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" @click="activeVideos.side = true">
                    <PlayCircle class="h-10 w-10" /><span class="text-xs font-medium">Putar video</span>
                  </button>
                </div>
              </div>
              <p v-else class="text-sm text-slate-500">Video tidak tersedia.</p>
            </div>
          </div>
        </Card>

        <Card v-if="!appChubb && data.appearance" title="Kondisi Penampilan" no-body>
          <div class="table-wrap rounded-none border-0">
            <table class="table">
              <thead>
                <tr>
                  <th>Kondisi</th>
                  <th>Foto</th>
                  <th>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Kondisi Wajah</td>
                  <td><img v-if="data.appearance.face_path" :src="data.appearance.face_path" alt="" class="h-20 w-24 rounded object-cover" loading="lazy" decoding="async" /></td>
                  <td>Hidung {{ field(data.appearance.nose_con) }}<br />Mata {{ field(data.appearance.eye_con) }}<br />Mulut {{ field(data.appearance.mouth_con) }}</td>
                </tr>
                <tr>
                  <td>Kondisi Badan</td>
                  <td><img v-if="data.appearance.body_path" :src="data.appearance.body_path" alt="" class="h-20 w-24 rounded object-cover" loading="lazy" decoding="async" /></td>
                  <td>Badan {{ field(data.appearance.body_con) }}</td>
                </tr>
                <tr>
                  <td>Kondisi Postur Tubuh</td>
                  <td><img v-if="data.appearance.posture_path" :src="data.appearance.posture_path" alt="" class="h-20 w-24 rounded object-cover" loading="lazy" decoding="async" /></td>
                  <td>Postur Tubuh {{ field(data.appearance.posture_con) }}</td>
                </tr>
                <tr>
                  <td>Kondisi Berjalan</td>
                  <td><img v-if="data.appearance.walk_path" :src="data.appearance.walk_path" alt="" class="h-20 w-24 rounded object-cover" loading="lazy" decoding="async" /></td>
                  <td>Berjalan {{ field(data.appearance.walk_con) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card v-if="showSelerisSuggestion" title="Saran Seleris">
          <dl class="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <InfoField label="Saran Uang Pertanggungan" :value="sumInsuredAdvice" />
            <InfoField label="Saran Masa Asuransi" :value="insurancePeriodAdvice" />
            <InfoField label="Saran EM/EP" :value="extraPremiumRate" />
          </dl>
        </Card>

        <Card title="Unduh Hasil Deteksi">
          <BaseButton variant="outline-primary" :loading="actionLoading === 'lifins'" @click="downloadLifinsReport">
            <Download class="h-4 w-4" /> Unduh Hasil Deteksi
          </BaseButton>
        </Card>
      </template>

      <Card v-if="data.id_card_number" title="Akumulasi Pengajuan Debitur" no-body>
        <div class="table-wrap rounded-none border-0">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal Mulai</th>
                <th>Tanggal Selesai</th>
                <th>Status</th>
                <th>Keputusan Akseptasi</th>
                <th>Ekstra Premi Final</th>
                <th>Uang Pertanggungan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(accumulate, index) in accumulates" :key="index">
                <td>{{ accumulate.start_date }}</td>
                <td>{{ accumulate.end_date }}</td>
                <td>{{ accumulate.acceptance_status_description }}</td>
                <td>{{ accumulate.risk_category }}</td>
                <td>{{ accumulate.extra_premium_final }}</td>
                <td>IDR {{ formatNumber(accumulate.sum_insured) }}</td>
              </tr>
              <tr>
                <td colspan="5" class="text-center font-semibold">TOTAL UANG PERTANGGUNGAN</td>
                <td class="font-semibold">{{ rupiah(totalAccumulate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <Modal v-model="showCertificateModal" title="Konfirmasi Tanggal Akad" size="lg">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <p class="text-sm text-slate-500">Tanggal Pengajuan Anda: <strong>{{ field(insurance.submission_date) }}</strong></p>
        </div>
        <div>
          <label class="form-label">Tanggal Akad <span class="text-danger">*</span></label>
          <input v-model="contractDate" type="date" class="form-input" />
        </div>
        <div v-if="partnerIdSelected === 16 || partnerIdSelected === 31">
          <label class="form-label">{{ partnerIdSelected === 31 ? 'Nomor LD' : 'Nomor Akad' }} <span class="text-danger">*</span></label>
          <input v-model="contractNumber" type="text" class="form-input" :placeholder="partnerIdSelected === 31 ? 'Masukkan Nomor LD' : 'Masukkan Nomor Akad'" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCertificateModal = false">Batal</BaseButton>
        <BaseButton :loading="actionLoading === 'certificate'" @click="pdfCertificate">Simpan</BaseButton>
      </template>
    </Modal>

    <Modal v-model="showStatusModal" title="Konfirmasi Pengajuan" size="lg">
      <label class="form-label">Status Pengajuan <span class="text-danger">*</span></label>
      <select v-model="confirmSubmissionStatus" class="form-select">
        <option value="">Pilih Status Pengajuan</option>
        <option v-for="option in statusOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <template #footer>
        <BaseButton variant="secondary" @click="showStatusModal = false">Batal</BaseButton>
        <BaseButton :loading="actionLoading === 'status'" @click="updateStatusSubmission">Simpan</BaseButton>
      </template>
    </Modal>

  </DetailTabsLayout>
</template>

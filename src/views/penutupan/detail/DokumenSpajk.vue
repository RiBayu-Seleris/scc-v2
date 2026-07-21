<script setup>
/**
 * DETAIL PENUTUPAN — DOKUMEN SPAJK.
 * Port fungsional dari SCC `views/detail/dokumen_spajk_new.vue`:
 * form SPAJK, kuesioner kesehatan, tiga tanda tangan, dokumen wajib, dan unggah dokumen.
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { moment } from '@/lib/format'
import {
  getSubmissionDebitur,
  getSubmissionNewSpajkData,
  getSubmissionRequiredDocuments,
  sendSubmissionMedicalNotification,
  storeSubmissionNewSpajk,
  submissionSpajkDocumentsFetcher,
  uploadSubmissionSpajkDocument,
} from '@/lib/services/submission'
import { uploadFile } from '@/lib/services/upload'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import DocumentTab from '@/components/shared/DocumentTab.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import Card from '@/components/ui/Card.vue'
import SignaturePad from '@/components/ui/SignaturePad.vue'
import Spinner from '@/components/ui/Spinner.vue'

useMeta({ title: 'Detail Penutupan — Dokumen SPAJK' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = route.params.id

const maritalStatusOptions = ['Menikah', 'Belum Menikah', 'Janda / Duda']
const fundOptions = ['Gaji', 'Hasil Usaha', 'Hasil Investasi', 'Warisan', 'Lainnya']
const insurancePurposeOptions = ['Proteksi Asuransi Jiwa atas Kredit', 'Pembiayaan']
const incomePerYearOptions = [
  '< Rp 10.000.000',
  '> Rp 10.000.000 - Rp 50.000.000',
  '> Rp 50.000.000 - Rp 100.000.000',
  '> Rp 100.000.000 - Rp 300.000.000',
  '> Rp 300.000.000 - Rp 500.000.000',
  '> Rp 500.000.000',
]
const yesNoOptions = ['Ya', 'Tidak']

const form = reactive({
  debiturPhone: '',
  debiturEmail: '',
  pob: '',
  dob: '',
  taxIdNumber: '',
  maritalStatus: null,
  homeAddress: '',
  homeZipCode: '',
  homePhone: '',
  correspondenceAddress: '',
  correspondenceZipCode: '',
  correspondencePhone: '',
  companyName: '',
  companyField: '',
  companyAddress: '',
  companyZipCode: '',
  companyPhone: '',
  insuranceFund: null,
  otherInsuranceFund: '',
  insurancePurpose: null,
  incomePerYear: null,
  incomeFund: null,
  otherIncomeFund: '',
  haveInsurance: null,
  haveInsuranceDesc: '',
  weight: '',
  height: '',
  weightChange: null,
  weightChangeDesc: '',
  isHealthy: null,
  isHealthyDesc: '',
  hadIllness: null,
  hadIllnessDesc: '',
  hadMedis: null,
  hadMedisDesc: '',
  isPregnant: null,
  pregnantWeek: '',
  childPregnant: '',
})

const loading = ref(true)
const saving = ref(false)
const notifying = ref(false)
const requiredDocuments = ref([])
const role = ref(getSession().role || '')
const showIsPregnant = ref(false)
const bankSignature = ref(null)
const debiturSignature = ref(null)
const partnerDebiturSignature = ref(null)
const signatureErrors = reactive({ bank: false, debitur: false, partner: false })
const profileReady = ref(false)
const listFetcher = submissionSpajkDocumentsFetcher(id)

const canEdit = computed(() => !['Reassurance', 'Retrosesi'].includes(role.value))
const tabContext = computed(() => ({
  showDokumenSpajkPage: true,
  showMenuForBank: !['Bank', 'Branch Bank'].includes(role.value),
  showMenuForAdmin: role.value === 'Admin',
}))

watch(() => form.insuranceFund, (value) => {
  if (value !== 'Lainnya') form.otherInsuranceFund = ''
})
watch(() => form.incomeFund, (value) => {
  if (value !== 'Lainnya') form.otherIncomeFund = ''
})
watch(() => form.haveInsurance, (value) => {
  if (value !== 'Ya') form.haveInsuranceDesc = ''
})
watch(() => form.weightChange, (value) => {
  if (value !== 'Ya') form.weightChangeDesc = ''
})
watch(() => form.isHealthy, (value) => {
  if (value !== 'Tidak') form.isHealthyDesc = ''
})
watch(() => form.hadIllness, (value) => {
  if (value !== 'Ya') form.hadIllnessDesc = ''
})
watch(() => form.hadMedis, (value) => {
  if (value !== 'Ya') form.hadMedisDesc = ''
})
watch(() => form.isPregnant, (value) => {
  if (value !== 'Ya') {
    form.pregnantWeek = ''
    form.childPregnant = ''
  }
})

function alert(icon, title) {
  return window.Swal.fire({ icon, title, padding: '2em' })
}

function showMessage(title) {
  return window.Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3000,
  }).fire({ icon: 'error', title, padding: '10px 20px' })
}

function digitsOnly(field) {
  form[field] = String(form[field] ?? '').replace(/\D/g, '')
}

function normalizeDate(value) {
  if (!value) return ''
  const parsed = moment(value, ['DD/MM/YYYY', 'YYYY-MM-DD'], true)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : ''
}

function applyInitialData(data) {
  form.pob = data.pob || ''
  form.dob = normalizeDate(data.dob)
  form.maritalStatus = data.marital_status || null
  form.homeAddress = data.home_address || ''
  form.homePhone = data.home_phone || ''
  form.companyName = data.company_name || ''
  form.companyField = data.company_field || ''
  form.companyAddress = data.company_address || ''
  form.debiturPhone = data.debitur_phone || ''
  form.debiturEmail = data.debitur_email || ''
  form.weight = data.weight ?? ''
  form.height = data.height ?? ''
  showIsPregnant.value = data.debitur_gender === 'PEREMPUAN'
}

async function loadPage() {
  loading.value = true
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil harus tersedia sebelum detail SPAJK diminta karena role menentukan mode baca-saja.
    if (!user) return
    role.value = user.role || getSession().role || ''
    const detail = await getSubmissionDebitur(id)

    if (detail.insert_spajk) {
      await window.Swal.fire({ icon: 'info', title: 'Dokumen SPAJK Sudah Terisi', padding: '1em' })
      await router.replace({ name: 'detail-debitur', params: { id } })
      return
    }

    const [initialData, documents] = await Promise.all([
      getSubmissionNewSpajkData(id),
      getSubmissionRequiredDocuments(id),
    ])
    applyInitialData(initialData)
    requiredDocuments.value = documents
    profileReady.value = true
  } catch (error) {
    await alert('error', error?.response?.data?.message || 'Gagal memuat Dokumen SPAJK')
  } finally {
    loading.value = false
  }
}

async function sendEmailNotification() {
  if (!canEdit.value || notifying.value) return
  notifying.value = true
  try {
    await sendSubmissionMedicalNotification(id)
    await alert('success', 'Email Notifikasi Terkirim')
  } catch (error) {
    await alert('error', error?.response?.data?.message || 'Terjadi Kesalahan')
  } finally {
    notifying.value = false
  }
}

function validate() {
  signatureErrors.bank = bankSignature.value?.isEmpty() ?? true
  signatureErrors.debitur = debiturSignature.value?.isEmpty() ?? true
  signatureErrors.partner = partnerDebiturSignature.value?.isEmpty() ?? true

  const required = [
    [form.debiturPhone, 'Wajib isi no. handphone debitur'],
    [form.debiturEmail, 'Wajib isi email debitur'],
    [form.pob, 'Wajib isi tempat lahir'],
    [form.dob, 'Wajib isi tanggal lahir'],
    [form.taxIdNumber, 'Wajib isi NPWP'],
  ]
  const missing = required.find(([value]) => !value)
  if (missing) return showMessage(missing[1]) && false
  if (form.taxIdNumber.length < 15) return showMessage('NPWP minimal 15 digit') && false
  if (form.taxIdNumber.length > 16) return showMessage('NPWP maksimal 16 digit') && false

  const remainingRequired = [
    [form.maritalStatus, 'Wajib isi status pernikahan'],
    [form.homeAddress, 'Wajib isi alamat rumah'],
    [form.homeZipCode, 'Wajib isi kode pos rumah'],
    [form.homePhone, 'Wajib isi no. telepon rumah'],
    [form.correspondenceAddress, 'Wajib isi alamat korespondensi'],
    [form.correspondenceZipCode, 'Wajib isi kode pos korespondensi'],
    [form.correspondencePhone, 'Wajib isi no. telepon korespondensi'],
    [form.companyName, 'Wajib isi nama perusahaan'],
    [form.companyField, 'Wajib isi jenis bidang usaha'],
    [form.companyAddress, 'Wajib isi alamat perusahaan'],
    [form.companyZipCode, 'Wajib isi kode pos perusahaan'],
    [form.companyPhone, 'Wajib isi no. telepon perusahaan'],
    [form.insuranceFund, 'Wajib isi sumber dana pembelian asuransi'],
  ]
  const remainingMissing = remainingRequired.find(([value]) => !value)
  if (remainingMissing) return showMessage(remainingMissing[1]) && false
  if (form.insuranceFund === 'Lainnya' && !form.otherInsuranceFund) {
    return showMessage('Wajib isi sumber dana pembelian asuransi lainnya') && false
  }
  if (!form.insurancePurpose) return showMessage('Wajib isi tujuan asuransi') && false
  if (!form.incomePerYear) return showMessage('Wajib isi penghasilan per tahun') && false
  if (!form.incomeFund) return showMessage('Wajib isi sumber penghasilan') && false
  if (form.incomeFund === 'Lainnya' && !form.otherIncomeFund) {
    return showMessage('Wajib isi sumber penghasilan lainnya') && false
  }
  if (!form.haveInsurance) return showMessage('Wajib isi data asuransi') && false
  if (form.haveInsurance === 'Ya' && !form.haveInsuranceDesc) {
    return showMessage('Wajib isi keterangan data asuransi') && false
  }
  if (!form.weight) return showMessage('Wajib isi berat badan') && false
  if (!form.height) return showMessage('Wajib isi tinggi badan') && false
  if (!form.weightChange || !form.isHealthy || !form.hadIllness || !form.hadMedis) {
    return showMessage('Wajib isi data kesehatan') && false
  }
  if (form.weightChange === 'Ya' && !form.weightChangeDesc) return showMessage('Wajib isi data kesehatan') && false
  // SCC lama salah memeriksa "Ya"; field keterangan justru aktif saat jawabannya "Tidak".
  if (form.isHealthy === 'Tidak' && !form.isHealthyDesc) return showMessage('Wajib isi data kesehatan') && false
  if (form.hadIllness === 'Ya' && !form.hadIllnessDesc) return showMessage('Wajib isi data kesehatan') && false
  if (form.hadMedis === 'Ya' && !form.hadMedisDesc) return showMessage('Wajib isi data kesehatan') && false
  if (showIsPregnant.value && !form.isPregnant) return showMessage('Wajib isi data kesehatan') && false
  if (form.isPregnant === 'Ya' && (!form.pregnantWeek || !form.childPregnant)) {
    return showMessage('Wajib isi data kesehatan') && false
  }
  if (signatureErrors.bank) return showMessage('Wajib isi tanda tangan bank') && false
  if (signatureErrors.debitur) return showMessage('Wajib isi tanda tangan debitur') && false
  if (signatureErrors.partner) return showMessage('Wajib isi tanda tangan pasangan debitur') && false
  return true
}

function dataUrlToFile(dataUrl, filename) {
  const [header, encoded] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new File([bytes], filename, { type: mime })
}

async function store() {
  if (!canEdit.value || saving.value || !validate()) return
  saving.value = true
  try {
    const timestamp = moment().format('DDMMYYYYHHmmss')
    const bankPath = await uploadFile(dataUrlToFile(bankSignature.value.toDataURL(), `bs-${timestamp}.png`))
    const debiturPath = await uploadFile(dataUrlToFile(debiturSignature.value.toDataURL(), `ds-${timestamp}.png`))
    const partnerPath = await uploadFile(dataUrlToFile(partnerDebiturSignature.value.toDataURL(), `pds-${timestamp}.png`))

    await storeSubmissionNewSpajk({
      submission_id: parseInt(id, 10),
      pob: form.pob,
      dob: moment(form.dob).format('YYYY-MM-DD'),
      npwp: form.taxIdNumber,
      marital_status: form.maritalStatus,
      home_address: form.homeAddress,
      home_zip_code: form.homeZipCode,
      home_phone: form.homePhone,
      correspondence_address: form.correspondenceAddress,
      correspondence_zip_code: form.correspondenceZipCode,
      correspondence_phone: form.correspondencePhone,
      company_name: form.companyName,
      company_field: form.companyField,
      company_address: form.companyAddress,
      company_zip_code: form.companyZipCode,
      company_phone: form.companyPhone,
      debitur_phone: form.debiturPhone,
      debitur_email: form.debiturEmail,
      insurance_fund: form.insuranceFund,
      // Pengecualian sengaja: SCC salah mengambil otherIncomeFund untuk field ini.
      other_insurance_fund: form.otherInsuranceFund,
      insurance_purpose: form.insurancePurpose,
      income_per_year: form.incomePerYear,
      income_fund: form.incomeFund,
      other_income_fund: form.otherIncomeFund,
      have_insurance: form.haveInsurance === 'Ya',
      have_insurance_desc: form.haveInsuranceDesc,
      weight_change: form.weightChange === 'Ya',
      weight_change_desc: form.weightChangeDesc,
      is_healthy: form.isHealthy === 'Ya',
      is_healthy_desc: form.isHealthyDesc,
      had_illness: form.hadIllness === 'Ya',
      had_illness_desc: form.hadIllnessDesc,
      had_medis: form.hadMedis === 'Ya',
      had_medis_desc: form.hadMedisDesc,
      is_pregnant: form.isPregnant === 'Ya',
      pregnant_week: form.pregnantWeek ? parseInt(form.pregnantWeek, 10) : null,
      child_pregnant: form.childPregnant ? parseInt(form.childPregnant, 10) : null,
      height: parseInt(form.height, 10),
      weight: parseInt(form.weight, 10),
      bank_signature: bankPath,
      debitur_signature: debiturPath,
      partner_debitur_signature: partnerPath,
    })

    await alert('success', 'Berhasil!')
    await router.push({ name: 'detail-debitur', params: { id } })
  } catch (error) {
    await alert('error', error?.response?.data?.message || 'Terjadi Kesalahan')
  } finally {
    saving.value = false
  }
}

async function submitUpload({ file, documentType, documentName, description }) {
  const path = await uploadFile(file)
  return uploadSubmissionSpajkDocument({ id, documentType, documentName, description, path })
}

async function noopDelete() {}

onMounted(loadPage)
</script>

<template>
  <DetailTabsLayout
    :tabs="penutupanDetailTabs"
    :id="id"
    title="Detail Penutupan — Dokumen SPAJK"
    :back="{ name: 'list-data-pengajuan-non-medis' }"
    :tab-context="tabContext"
  >
    <div v-if="loading" class="flex min-h-56 items-center justify-center">
      <Spinner />
    </div>

    <div v-else-if="profileReady" class="space-y-5">
      <Card v-if="requiredDocuments.length" title="Dokumen Medis/Tambahan Diperlukan">
        <template v-if="canEdit" #actions>
          <BaseButton size="sm" :loading="notifying" @click="sendEmailNotification">
            Kirim Email Notifikasi
          </BaseButton>
        </template>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label
            v-for="(document, index) in requiredDocuments"
            :key="document.id || `${document.document_required}-${index}`"
            class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <input
              type="checkbox"
              class="form-checkbox"
              :checked="document.document_exist"
              disabled
            />
            <span>{{ document.document_required }}</span>
          </label>
        </div>
      </Card>

      <form class="space-y-5" @submit.prevent="store">
        <Card title="Data Peserta">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="form-label">No. Handphone Debitur <span class="text-danger">*</span></label>
              <input v-model="form.debiturPhone" class="form-input" inputmode="numeric" placeholder="Masukkan no. handphone debitur" :disabled="!canEdit" @input="digitsOnly('debiturPhone')" />
            </div>
            <div>
              <label class="form-label">Email Debitur <span class="text-danger">*</span></label>
              <input v-model="form.debiturEmail" type="email" class="form-input" placeholder="Masukkan email debitur" :disabled="!canEdit" />
            </div>
            <div>
              <label class="form-label">Tempat Lahir <span class="text-danger">*</span></label>
              <input v-model="form.pob" class="form-input" placeholder="Masukkan tempat lahir" :disabled="!canEdit" />
            </div>
            <div>
              <label class="form-label">Tanggal Lahir <span class="text-danger">*</span></label>
              <input v-model="form.dob" type="date" class="form-input" :disabled="!canEdit" />
            </div>
            <div>
              <label class="form-label">NPWP <span class="text-danger">*</span></label>
              <input v-model="form.taxIdNumber" class="form-input" inputmode="numeric" minlength="15" maxlength="16" placeholder="Masukkan NPWP" :disabled="!canEdit" @input="digitsOnly('taxIdNumber')" />
              <p v-if="form.taxIdNumber && form.taxIdNumber.length < 15" class="form-error">NPWP minimal 15 digit</p>
            </div>
            <BaseSelect v-model="form.maritalStatus" :options="maritalStatusOptions" label="Status Pernikahan" placeholder="Pilih status pernikahan" required :disabled="!canEdit" />
          </div>
        </Card>

        <Card title="Alamat dan Pekerjaan">
          <div class="space-y-6">
            <section>
              <h3 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Alamat Rumah</h3>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-6">
                <div class="md:col-span-3">
                  <label class="form-label">Alamat Rumah <span class="text-danger">*</span></label>
                  <input v-model="form.homeAddress" class="form-input" placeholder="Masukkan alamat rumah" :disabled="!canEdit" />
                </div>
                <div class="md:col-span-1">
                  <label class="form-label">Kode Pos <span class="text-danger">*</span></label>
                  <input v-model="form.homeZipCode" class="form-input" inputmode="numeric" placeholder="Kode pos" :disabled="!canEdit" @input="digitsOnly('homeZipCode')" />
                </div>
                <div class="md:col-span-2">
                  <label class="form-label">No. Telepon <span class="text-danger">*</span></label>
                  <input v-model="form.homePhone" class="form-input" inputmode="numeric" placeholder="Nomor telepon" :disabled="!canEdit" @input="digitsOnly('homePhone')" />
                </div>
              </div>
            </section>

            <section>
              <h3 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Alamat Korespondensi</h3>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-6">
                <div class="md:col-span-3">
                  <label class="form-label">Alamat Korespondensi <span class="text-danger">*</span></label>
                  <input v-model="form.correspondenceAddress" class="form-input" placeholder="Masukkan alamat korespondensi" :disabled="!canEdit" />
                </div>
                <div class="md:col-span-1">
                  <label class="form-label">Kode Pos <span class="text-danger">*</span></label>
                  <input v-model="form.correspondenceZipCode" class="form-input" inputmode="numeric" placeholder="Kode pos" :disabled="!canEdit" @input="digitsOnly('correspondenceZipCode')" />
                </div>
                <div class="md:col-span-2">
                  <label class="form-label">No. Telepon <span class="text-danger">*</span></label>
                  <input v-model="form.correspondencePhone" class="form-input" inputmode="numeric" placeholder="Nomor telepon" :disabled="!canEdit" @input="digitsOnly('correspondencePhone')" />
                </div>
              </div>
            </section>

            <section>
              <h3 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Data Perusahaan</h3>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label class="form-label">Nama Perusahaan <span class="text-danger">*</span></label>
                  <input v-model="form.companyName" class="form-input" placeholder="Masukkan nama perusahaan" :disabled="!canEdit" />
                </div>
                <div>
                  <label class="form-label">Jenis Bidang Usaha <span class="text-danger">*</span></label>
                  <input v-model="form.companyField" class="form-input" placeholder="Masukkan jenis bidang usaha" :disabled="!canEdit" />
                </div>
                <div>
                  <label class="form-label">Alamat Perusahaan <span class="text-danger">*</span></label>
                  <input v-model="form.companyAddress" class="form-input" placeholder="Masukkan alamat perusahaan" :disabled="!canEdit" />
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label class="form-label">Kode Pos <span class="text-danger">*</span></label>
                    <input v-model="form.companyZipCode" class="form-input" inputmode="numeric" placeholder="Kode pos" :disabled="!canEdit" @input="digitsOnly('companyZipCode')" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="form-label">No. Telepon <span class="text-danger">*</span></label>
                    <input v-model="form.companyPhone" class="form-input" inputmode="numeric" placeholder="Nomor telepon" :disabled="!canEdit" @input="digitsOnly('companyPhone')" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Card>

        <Card title="Data Asuransi">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BaseSelect v-model="form.insuranceFund" :options="fundOptions" label="Sumber Dana Pembelian Asuransi" placeholder="Pilih sumber dana" required :disabled="!canEdit" />
            <div>
              <label class="form-label">Sumber Dana Lainnya <span v-if="form.insuranceFund === 'Lainnya'" class="text-danger">*</span></label>
              <input v-model="form.otherInsuranceFund" class="form-input" placeholder="Masukkan sumber dana lainnya" :disabled="!canEdit || form.insuranceFund !== 'Lainnya'" />
            </div>
            <BaseSelect v-model="form.insurancePurpose" :options="insurancePurposeOptions" label="Tujuan Asuransi" placeholder="Pilih tujuan asuransi" required :disabled="!canEdit" />
            <BaseSelect v-model="form.incomePerYear" :options="incomePerYearOptions" label="Penghasilan per Tahun" placeholder="Pilih penghasilan per tahun" required :disabled="!canEdit" />
            <BaseSelect v-model="form.incomeFund" :options="fundOptions" label="Sumber Penghasilan" placeholder="Pilih sumber penghasilan" required :disabled="!canEdit" />
            <div>
              <label class="form-label">Sumber Penghasilan Lainnya <span v-if="form.incomeFund === 'Lainnya'" class="text-danger">*</span></label>
              <input v-model="form.otherIncomeFund" class="form-input" placeholder="Masukkan sumber penghasilan lainnya" :disabled="!canEdit || form.incomeFund !== 'Lainnya'" />
            </div>
            <div class="md:col-span-2">
              <p class="form-label leading-5">Apakah Anda sudah mempunyai atau sedang mengajukan atau pernah mengajukan Polis Asuransi Jiwa / Kecelakaan / Kesehatan baik di perusahaan Asuransi tertanggung maupun di perusahaan Asuransi lain? <span class="text-danger">*</span></p>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <BaseSelect v-model="form.haveInsurance" :options="yesNoOptions" placeholder="Ya / Tidak" :searchable="false" :disabled="!canEdit" />
                <input v-model="form.haveInsuranceDesc" class="form-input md:col-span-2" placeholder="Masukkan keterangan" :disabled="!canEdit || form.haveInsurance !== 'Ya'" />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Data Kesehatan">
          <div class="space-y-5">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="form-label">Berat Badan <span class="text-danger">*</span></label>
                <div class="flex">
                  <input v-model="form.weight" class="form-input rounded-r-none" inputmode="numeric" placeholder="Berat badan" :disabled="!canEdit" @input="digitsOnly('weight')" />
                  <span class="flex items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">kg</span>
                </div>
              </div>
              <div>
                <label class="form-label">Tinggi Badan <span class="text-danger">*</span></label>
                <div class="flex">
                  <input v-model="form.height" class="form-input rounded-r-none" inputmode="numeric" placeholder="Tinggi badan" :disabled="!canEdit" @input="digitsOnly('height')" />
                  <span class="flex items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">cm</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <p class="text-sm leading-5 text-slate-600 dark:text-slate-300">Apakah berat badan Anda berubah dalam 12 bulan terakhir? <span class="text-danger">*</span></p>
              <BaseSelect v-model="form.weightChange" :options="yesNoOptions" placeholder="Ya / Tidak" :searchable="false" :disabled="!canEdit" />
              <input v-model="form.weightChangeDesc" class="form-input" placeholder="Masukkan keterangan" :disabled="!canEdit || form.weightChange !== 'Ya'" />
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <p class="text-sm leading-5 text-slate-600 dark:text-slate-300">Apakah Anda sedang dalam keadaan sehat? <span class="text-danger">*</span></p>
              <BaseSelect v-model="form.isHealthy" :options="yesNoOptions" placeholder="Ya / Tidak" :searchable="false" :disabled="!canEdit" />
              <input v-model="form.isHealthyDesc" class="form-input" placeholder="Masukkan keterangan" :disabled="!canEdit || form.isHealthy !== 'Tidak'" />
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <p class="text-sm leading-5 text-slate-600 dark:text-slate-300">Apakah Anda sedang atau pernah menderita, atau pernah diberitahu atau dalam konsultasi / perawatan / pengobatan / pengawasan medis, salah satu atau beberapa penyakit sebagai berikut: Jantung / Nyeri Dada, Tekanan Darah Tinggi, Stroke, Tumor / Benjolan / Kanker / Kista, TBC / Asthma / Gangguan Pernapasan, Sakit Kuning / Hepatitis, Kencing Manis, Ginjal, Cacat, Kelainan Bawaan, Gangguan Jiwa, Penyakit / Gangguan lainnya? <span class="text-danger">*</span></p>
              <BaseSelect v-model="form.hadIllness" :options="yesNoOptions" placeholder="Ya / Tidak" :searchable="false" :disabled="!canEdit" />
              <input v-model="form.hadIllnessDesc" class="form-input" placeholder="Masukkan keterangan" :disabled="!canEdit || form.hadIllness !== 'Ya'" />
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <p class="text-sm leading-5 text-slate-600 dark:text-slate-300">Apakah dalam 5 tahun terakhir Anda sedang atau pernah menjalani konsultasi / rawat inap / operasi / biopsi / pemeriksaan laboratorium / rontgen / EKG / Treadmill Echocardiography / USG / CT Scan / MRI / Papsmear / Mamografi atau pemeriksaan lainnya? <span class="text-danger">*</span></p>
              <BaseSelect v-model="form.hadMedis" :options="yesNoOptions" placeholder="Ya / Tidak" :searchable="false" :disabled="!canEdit" />
              <input v-model="form.hadMedisDesc" class="form-input" placeholder="Masukkan keterangan" :disabled="!canEdit || form.hadMedis !== 'Ya'" />
            </div>

            <div v-if="showIsPregnant" class="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 md:grid-cols-3">
              <BaseSelect v-model="form.isPregnant" :options="yesNoOptions" label="Apakah saat ini sedang hamil?" placeholder="Ya / Tidak" required :searchable="false" :disabled="!canEdit" />
              <div>
                <label class="form-label">Umur Kehamilan (Minggu) <span v-if="form.isPregnant === 'Ya'" class="text-danger">*</span></label>
                <input v-model="form.pregnantWeek" class="form-input" inputmode="numeric" placeholder="Umur kehamilan" :disabled="!canEdit || form.isPregnant !== 'Ya'" @input="digitsOnly('pregnantWeek')" />
              </div>
              <div>
                <label class="form-label">Kehamilan Anak ke- <span v-if="form.isPregnant === 'Ya'" class="text-danger">*</span></label>
                <input v-model="form.childPregnant" class="form-input" inputmode="numeric" placeholder="Kehamilan anak ke" :disabled="!canEdit || form.isPregnant !== 'Ya'" @input="digitsOnly('childPregnant')" />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Tanda Tangan">
          <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <section>
              <h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tanda Tangan Bank <span class="text-danger">*</span></h3>
              <div class="rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700">
                <SignaturePad ref="bankSignature" :disabled="!canEdit" />
              </div>
              <p v-if="signatureErrors.bank" class="form-error">Wajib isi tanda tangan bank</p>
              <div v-if="canEdit" class="mt-2 flex gap-2">
                <BaseButton size="sm" variant="secondary" @click="bankSignature?.clear()">Clear</BaseButton>
                <BaseButton size="sm" variant="secondary" @click="bankSignature?.undo()">Undo</BaseButton>
              </div>
            </section>
            <section>
              <h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tanda Tangan Debitur <span class="text-danger">*</span></h3>
              <div class="rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700">
                <SignaturePad ref="debiturSignature" :disabled="!canEdit" />
              </div>
              <p v-if="signatureErrors.debitur" class="form-error">Wajib isi tanda tangan debitur</p>
              <div v-if="canEdit" class="mt-2 flex gap-2">
                <BaseButton size="sm" variant="secondary" @click="debiturSignature?.clear()">Clear</BaseButton>
                <BaseButton size="sm" variant="secondary" @click="debiturSignature?.undo()">Undo</BaseButton>
              </div>
            </section>
            <section>
              <h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tanda Tangan Pasangan Debitur <span class="text-danger">*</span></h3>
              <div class="rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700">
                <SignaturePad ref="partnerDebiturSignature" :disabled="!canEdit" />
              </div>
              <p v-if="signatureErrors.partner" class="form-error">Wajib isi tanda tangan pasangan debitur</p>
              <div v-if="canEdit" class="mt-2 flex gap-2">
                <BaseButton size="sm" variant="secondary" @click="partnerDebiturSignature?.clear()">Clear</BaseButton>
                <BaseButton size="sm" variant="secondary" @click="partnerDebiturSignature?.undo()">Undo</BaseButton>
              </div>
            </section>
          </div>
          <div v-if="canEdit" class="mt-6 flex justify-end">
            <BaseButton type="submit" :loading="saving">Simpan SPAJK</BaseButton>
          </div>
        </Card>
      </form>

      <DocumentTab
        :list-fetcher="listFetcher"
        :document-types="['SPAJK', 'KTP']"
        :required-documents="requiredDocuments"
        :submit-upload="submitUpload"
        :delete-fn="noopDelete"
        :can-manage="canEdit"
        :allow-delete="false"
        :require-document-name="false"
        :use-required-names-for-primary="false"
      />
    </div>
  </DetailTabsLayout>
</template>

<script setup>
/**
 * DETAIL INPUT KLAIM.
 *
 * Port dari ehd-backoffice/views/klaim/detail_input_klaim.vue:
 * - GET submission/detail/{id}
 * - GET submission/detail-insurance/{id}
 * - GET claim/benefit/{id}
 * - POST claim/store
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { getSubmissionDebitur, getSubmissionInsurance } from '@/lib/services/submission'
import { getClaimBenefit, storeClaim } from '@/lib/services/claim'
import { moment, parseNumber, rupiah } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Spinner from '@/components/ui/Spinner.vue'

useMeta({ title: 'Input Klaim' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id

const loading = ref(true)
const saving = ref(false)
const debitur = ref({})
const insurance = ref({})

const registrationNumber = ref('C-' + id)
const claimType = ref(null)
const claimTypeOptions = ref([])
const incidentDate = ref('')
const claimSubmissionDate = ref('')
const claimCause = ref(null)
const claimCauseOptions = ['Kecelakaan', 'Sakit', 'PHK', 'Macet']
const incidentPlace = ref(null)
const incidentPlaceOptions = ['Rumah', 'Rumah Sakit', 'Tempat Umum', 'Tempat Kerja', 'Macet']
const amountSubmission = ref('')
const picName = ref('')
const branchEmail = ref('')
const picPhoneNumber = ref('')
const picEmail = ref('')
const paymentPurpose = ref(null)
const paymentPurposeOptions = ['Nasabah / Perorangan', 'Pemegang Polis / Perusahaan']
const bankName = ref(null)
const bankOptions = ref([])
const bankAccountNumber = ref('')
const accountName = ref('')
const bankBranchName = ref('')

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Input klaim tidak boleh meminta polis bila profil role gagal diperoleh.
    if (!user) return
    const [d, i, benefit] = await Promise.all([
      getSubmissionDebitur(id),
      getSubmissionInsurance(id),
      getClaimBenefit(id),
    ])
    debitur.value = d
    insurance.value = i
    claimTypeOptions.value = benefit.benefit || []
    picName.value = benefit.pic_name || ''
    picPhoneNumber.value = benefit.pic_phone_number || ''
    branchEmail.value = benefit.pic_email || ''
    bankAccountNumber.value = benefit.account_number || ''
    accountName.value = benefit.account_name || ''
    bankOptions.value = benefit.account_bank || []
  } finally {
    loading.value = false
  }
})

function normalizeAmount() {
  const value = parseNumber(amountSubmission.value)
  amountSubmission.value = value ? value.toLocaleString('id-ID') : ''
}

function alert(icon, text) {
  window.Swal.fire({ icon, text, padding: '1em' })
}

function validate() {
  const required = [
    [claimType.value, 'Jenis klaim wajib diisi'],
    [incidentDate.value, 'Tanggal kejadian wajib diisi'],
    [claimSubmissionDate.value, 'Tanggal pengajuan klaim wajib diisi'],
    [claimCause.value, 'Penyebab klaim wajib diisi'],
    [incidentPlace.value, 'Tempat kejadian wajib diisi'],
    [amountSubmission.value, 'Jumlah yang diajukan wajib diisi'],
    [paymentPurpose.value, 'Tujuan pembayaran wajib diisi'],
    [bankName.value, 'Nama bank umum wajib diisi'],
    [bankAccountNumber.value, 'No. rekening bank wajib diisi'],
    [accountName.value, 'Nama rekening wajib diisi'],
  ]
  for (const [ok, message] of required) {
    if (!ok) {
      alert('error', message)
      return false
    }
  }
  return true
}

async function simpan() {
  saving.value = true
  try {
    const { data } = await storeClaim({
      submission_id: parseInt(id, 10),
      register_number: registrationNumber.value,
      claim_type: claimType.value,
      date_incident: moment(incidentDate.value).format('DD/MM/YYYY'),
      date_submission_claim: moment(claimSubmissionDate.value).format('DD/MM/YYYY'),
      claim_reasoning: claimCause.value,
      place_incident: incidentPlace.value,
      claim_submitted: parseNumber(amountSubmission.value),
      pic_name: picName.value,
      pic_email: branchEmail.value,
      pic_phone_number: picPhoneNumber.value,
      cc_pic_email: picEmail.value,
      payment_objective: paymentPurpose.value,
      account_number: bankAccountNumber.value,
      account_name: accountName.value,
      user_id: parseInt(session.userId, 10),
      account_bank: bankName.value,
      account_branch_bank: bankBranchName.value,
    })
    if (data.status === 200) {
      await window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
      router.push({ name: 'input-klaim' })
    } else {
      alert('error', data.message || 'Terjadi Kesalahan')
    }
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Input Klaim" subtitle="Lengkapi data kejadian, PIC, dan pembayaran klaim." />

    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-5">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Data Debitur">
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoField label="Perusahaan / Client" :value="debitur.company_name" />
            <InfoField label="Nama Debitur" :value="debitur.debitur_name" />
            <InfoField label="Tempat Lahir" :value="debitur.pob" />
            <InfoField label="Tanggal Lahir" :value="debitur.dob" />
            <InfoField label="Usia" :value="debitur.age ? `${debitur.age} Tahun` : ''" />
            <InfoField label="Jenis Kelamin" :value="debitur.gender" />
            <InfoField label="Pekerjaan" :value="debitur.occupation" />
            <InfoField label="Detail Pekerjaan" :value="debitur.detail_occupation" />
            <InfoField label="Uang Pertanggungan" :value="rupiah(insurance.sum_insured)" />
            <InfoField label="Premi" :value="rupiah(insurance.total_premium)" />
          </dl>
        </Card>

        <Card title="Data Asuransi">
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoField label="Asuransi" :value="insurance.insurance_name" />
            <InfoField label="Jenis Produk" :value="insurance.product_name" />
            <InfoField label="Plan ID" :value="debitur.product_code" />
            <InfoField label="Mulai Asuransi" :value="insurance.start_date" />
            <InfoField label="Akhir Asuransi" :value="insurance.end_date" />
            <InfoField label="No. Polis" :value="debitur.polis_number" />
            <InfoField label="Underwriting" :value="insurance.cbc_rate" />
            <InfoField label="Masa Asuransi" :value="insurance.insurance_period ? `${insurance.insurance_period} Bulan` : ''" />
            <InfoField label="No. Sertifikat" :value="insurance.certificate_number" />
          </dl>
        </Card>
      </div>

      <Card title="Form Klaim">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label class="form-label">No. Register <span class="text-danger">*</span></label><input v-model="registrationNumber" class="form-input" readonly /></div>
          <BaseSelect v-model="claimType" :options="claimTypeOptions" label="Jenis Klaim" placeholder="Pilih Jenis Klaim" required />
          <div><label class="form-label">Tanggal Kejadian <span class="text-danger">*</span></label><input v-model="incidentDate" type="date" class="form-input" /></div>
          <div><label class="form-label">Tanggal Pengajuan Klaim <span class="text-danger">*</span></label><input v-model="claimSubmissionDate" type="date" class="form-input" /></div>
          <BaseSelect v-model="claimCause" :options="claimCauseOptions" label="Penyebab Klaim" placeholder="Pilih Penyebab Klaim" required />
          <BaseSelect v-model="incidentPlace" :options="incidentPlaceOptions" label="Tempat Kejadian" placeholder="Pilih Tempat Kejadian" required />
          <div><label class="form-label">Jumlah Yang Diajukan <span class="text-danger">*</span></label><input v-model="amountSubmission" class="form-input" @input="normalizeAmount" /></div>
        </div>
      </Card>

      <Card title="PIC">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label class="form-label">Nama PIC</label><input v-model="picName" class="form-input" /></div>
          <div><label class="form-label">Email Cabang</label><input v-model="branchEmail" class="form-input" /></div>
          <div><label class="form-label">No. Telepon PIC</label><input v-model="picPhoneNumber" class="form-input" /></div>
          <div><label class="form-label">CC Email PIC</label><input v-model="picEmail" class="form-input" /></div>
        </div>
      </Card>

      <Card title="Pembayaran">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BaseSelect v-model="paymentPurpose" :options="paymentPurposeOptions" label="Tujuan Pembayaran" placeholder="Pilih Tujuan Pembayaran" required />
          <BaseSelect v-model="bankName" :options="bankOptions" label="Nama Bank Umum" placeholder="Pilih Nama Bank Umum" required />
          <div><label class="form-label">No. Rekening Bank <span class="text-danger">*</span></label><input v-model="bankAccountNumber" class="form-input" /></div>
          <div><label class="form-label">Nama Rekening <span class="text-danger">*</span></label><input v-model="accountName" class="form-input" /></div>
          <div><label class="form-label">Nama Cabang Bank</label><input v-model="bankBranchName" class="form-input" /></div>
        </div>
        <div class="mt-6 flex justify-end">
          <BaseButton :loading="saving" @click="simpan">Simpan</BaseButton>
        </div>
      </Card>
    </div>
  </div>
</template>

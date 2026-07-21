<script setup>
/**
 * DETAIL INPUT RESTITUSI.
 *
 * Port dari ehd-backoffice/views/restitusi/detail_input_restitusi.vue:
 * - GET submission/detail/{id}
 * - GET submission/detail-insurance/{id}
 * - GET select-bank
 * - POST restitute/check-restitute
 * - POST restitute/store
 *
 * Jika `credit_again` aktif, setelah simpan diarahkan ke input-pengajuan
 * membawa query `restitute_id` dan `contract_number` seperti aplikasi lama.
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { getSubmissionDebitur, getSubmissionInsurance } from '@/lib/services/submission'
import { checkRestitute, getAccountBankOptions, storeRestitute } from '@/lib/services/restitute'
import { moment, parseNumber, rupiah } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Spinner from '@/components/ui/Spinner.vue'

useMeta({ title: 'Input Restitusi' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id

const loading = ref(true)
const saving = ref(false)
const checking = ref(false)
const debitur = ref({})
const insurance = ref({})
const bankOptions = ref([])

const registrationNumber = ref('R-' + id)
const restituteDate = ref('')
const minRestituteDate = ref('')
const maxRestituteDate = ref('')
const monthInto = ref('')
const monthRemainder = ref('')
const restitutePremium = ref('')
const creditAgain = ref(false)
const newContractNumber = ref('')
const picName = ref('')
const branchEmail = ref('')
const picPhoneNumber = ref('')
const picEmail = ref('')
const paymentPurpose = ref(null)
const paymentPurposeOptions = ['Nasabah / Perorangan', 'Pemegang Polis / Perusahaan']
const bankName = ref(null)
const bankAccountNumber = ref('')
const accountName = ref('')
const bankBranchName = ref('')

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Input restitusi tidak boleh meminta data polis saat profil role gagal.
    if (!user) return
    const [d, i, banks] = await Promise.all([
      getSubmissionDebitur(id),
      getSubmissionInsurance(id),
      getAccountBankOptions(),
    ])
    debitur.value = d
    insurance.value = i
    bankOptions.value = banks
    minRestituteDate.value = i.start_date ? moment(i.start_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : ''
    maxRestituteDate.value = i.end_date ? moment(i.end_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : ''
  } finally {
    loading.value = false
  }
})

function alert(icon, text) {
  window.Swal.fire({ icon, text, padding: '1em' })
}

async function restituteDateSelected() {
  if (!restituteDate.value) return
  checking.value = true
  try {
    const data = await checkRestitute({
      submission_id: parseInt(id, 10),
      restitute_date: moment(restituteDate.value).format('DD/MM/YYYY'),
    })
    monthInto.value = data.month_into
    monthRemainder.value = data.month_remainder
    restitutePremium.value = rupiah(data.restitute_premium)
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    checking.value = false
  }
}

function validate() {
  const required = [
    [restituteDate.value, 'Tanggal pelunasan wajib diisi'],
    [monthInto.value, 'Masuk bulan ke wajib terisi'],
    [monthRemainder.value, 'Sisa masa asuransi wajib terisi'],
    [restitutePremium.value, 'Premi restitusi wajib terisi'],
    [paymentPurpose.value, 'Tujuan pembayaran wajib diisi'],
    [bankName.value, 'Nama bank umum wajib diisi'],
    [bankAccountNumber.value, 'No. rekening bank wajib diisi'],
    [accountName.value, 'Nama rekening wajib diisi'],
  ]
  if (creditAgain.value) required.push([newContractNumber.value, 'No akad baru wajib diisi'])
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
    const { data } = await storeRestitute({
      user_id: parseInt(session.userId, 10),
      submission_id: parseInt(id, 10),
      register_number: registrationNumber.value,
      restitute_date: moment(restituteDate.value).format('DD/MM/YYYY'),
      pic_name: picName.value,
      pic_phone_number: picPhoneNumber.value,
      pic_email: branchEmail.value,
      cc_pic_email: picEmail.value,
      payment_objective: paymentPurpose.value,
      account_bank: bankName.value,
      account_name: accountName.value,
      account_number: bankAccountNumber.value,
      account_branch_bank: bankBranchName.value,
      restitute_premium: parseNumber(restitutePremium.value),
      month_into: parseInt(monthInto.value, 10),
      month_remainder: parseInt(monthRemainder.value, 10),
      credit_again: creditAgain.value,
      new_contract_number: newContractNumber.value,
    })
    if (data.status === 200) {
      await window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
      if (creditAgain.value) {
        router.push({
          name: 'input-pengajuan',
          query: { restitute_id: data.id, contract_number: newContractNumber.value },
        })
      } else {
        router.push({ name: 'input-restitusi' })
      }
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
    <PageHeader title="Input Restitusi" subtitle="Lengkapi data pelunasan dan pembayaran restitusi." />

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

      <Card title="Form Pelunasan">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label class="form-label">No. Register <span class="text-danger">*</span></label>
            <input v-model="registrationNumber" class="form-input" readonly />
          </div>
          <div>
            <label class="form-label">Tanggal Pelunasan <span class="text-danger">*</span></label>
            <input
              v-model="restituteDate"
              type="date"
              class="form-input"
              :min="minRestituteDate"
              :max="maxRestituteDate"
              @change="restituteDateSelected"
            />
          </div>
          <div class="flex items-end text-sm text-slate-500">
            <span v-if="checking">Menghitung premi restitusi...</span>
          </div>
          <div>
            <label class="form-label">Masuk Bulan ke <span class="text-danger">*</span></label>
            <input v-model="monthInto" class="form-input" readonly />
          </div>
          <div>
            <label class="form-label">Sisa Masa Asuransi (Bulan) <span class="text-danger">*</span></label>
            <input v-model="monthRemainder" class="form-input" readonly />
          </div>
          <div>
            <label class="form-label">Premi Restitusi <span class="text-danger">*</span></label>
            <input v-model="restitutePremium" class="form-input" readonly />
          </div>
          <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input v-model="creditAgain" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            Ajukan Permohonan Kredit Lagi?
          </label>
          <div v-if="creditAgain" class="md:col-span-2">
            <label class="form-label">No Akad Baru <span class="text-danger">*</span></label>
            <input v-model="newContractNumber" class="form-input" @input="newContractNumber = newContractNumber?.toUpperCase()" />
          </div>
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

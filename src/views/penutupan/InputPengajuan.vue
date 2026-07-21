<script setup>
/**
 * INPUT PENGAJUAN — alur utama Penutupan.
 * Endpoint mengikuti SCC:
 * - submission/check-lifins/{nik}
 * - submission/all-partner
 * - submission/member-by-partner/{partnerId}
 * - submission/select-product* / select-insurance / select-broker
 * - submission/preview-premium
 * - upload-file
 * - submission/store/new
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { formatNumber, moment, parseNumber, rupiah } from '@/lib/format'
import { getRestituteDebitur } from '@/lib/services/restitute'
import {
  checkLifinsNik,
  getSubmissionBrokers,
  getSubmissionInsurances,
  getSubmissionMembersByPartner,
  getSubmissionPartners,
  getSubmissionProducts,
  previewSubmissionPremium,
  storeSubmission,
} from '@/lib/services/submission'
import { uploadFile } from '@/lib/services/upload'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

useMeta({ title: 'Input Pengajuan' })

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const restituteId = route.query.restitute_id
const newContractNumber = route.query.contract_number

const idCardNumber = ref('')
const nikChecked = ref(false)
const checkingNik = ref(false)
const submitting = ref(false)
const previewing = ref(false)

const partnerOptions = ref([])
const memberOptions = ref([])
const productOptions = ref([])
const insuranceOptions = ref([])
const brokerOptions = ref([])

const partnerId = ref(null)
const memberId = ref(null)
const productType = ref(null)
const productKey = ref(null)
const insuranceId = ref(null)
const brokerId = ref(null)
const withoutUnderwriting = ref(false)

const sumInsured = ref('')
const startDate = ref('')
const insurancePeriod = ref('')
const debiturName = ref('')
const contractNumber = ref('')
const accountNumber = ref('')
const pob = ref('')
const dob = ref('')
const gender = ref(null)
const occupation = ref(null)
const detailOccupation = ref('')
const customerContactAddress = ref('')
const customerContactCity = ref('')
const customerContactPhoneNumber = ref('')
const customerContactTelephone = ref('')
const customerContactEmail = ref('')
const companyName = ref('')
const companyField = ref(null)
const companyPosition = ref('')
const companyAddress = ref('')
const selectedBenefits = ref([])
const creditContract = ref(null)
const contractNumberLocked = ref(false)

const productTypeOptions = ['Produk Standar / PAB', 'Produk Non PAB']
const genderOptions = ['LAKI-LAKI', 'PEREMPUAN']
const companyFieldOptions = ['PERDAGANGAN', 'TELEKOMUNIKASI', 'JASA', 'BUMN', 'YAYASAN', 'KONSTRUKSI', 'PABRIK', 'BANK', 'LAIN-LAIN']
const minStartDate = moment().add(-1, 'month').format('YYYY-MM-DD')

const currentProduct = computed(() => {
  if (!productKey.value) return null
  return productOptions.value.find((p) => String(productOptionValue(p)) === String(productKey.value)) || null
})

const currentInsurance = computed(() =>
  insuranceOptions.value.find((i) => String(i.id) === String(insuranceId.value)) || null,
)
const currentBroker = computed(() =>
  brokerOptions.value.find((b) => String(b.broker_id) === String(brokerId.value)) || null,
)

const mainBenefits = computed(() => currentProduct.value?.main_benefit || [])
const additionalBenefits = computed(() => currentProduct.value?.additional_benefit || [])
const minSumInsured = computed(() => currentProduct.value?.min_sum_insured ? rupiah(currentProduct.value.min_sum_insured) : '')
const maxSumInsured = computed(() => currentProduct.value?.max_sum_insured ? rupiah(currentProduct.value.max_sum_insured) : '')
const limitPeriod = computed(() => currentProduct.value?.limit_period || '')

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (restituteId && newContractNumber) await loadRestituteDebitur()
})

async function loadPartnerOptions(user = auth.user) {
  const allPartners = await getSubmissionPartners()
  if (user?.role === 'Admin' || user?.role === 'Broker') {
    partnerOptions.value = allPartners
  } else if (user?.role === 'Bank' || user?.role === 'Branch Bank') {
    partnerOptions.value = allPartners.filter(
      (partner) => Number(partner.partner_id) === Number(user?.partner_id || session.partnerId),
    )
  } else {
    // SCC tidak memberi pilihan bank kepada role lain pada halaman input ini.
    partnerOptions.value = []
  }
}

watch(partnerId, async () => {
  memberId.value = null
  productType.value = null
  productKey.value = null
  memberOptions.value = []
  productOptions.value = []
  insuranceOptions.value = []
  brokerOptions.value = []
  if (partnerId.value) await loadMembers()
})

watch(productType, async () => {
  productKey.value = null
  insuranceId.value = null
  brokerId.value = null
  productOptions.value = []
  insuranceOptions.value = []
  brokerOptions.value = []
  if (partnerId.value && productType.value) {
    productOptions.value = await getSubmissionProducts(partnerId.value, productType.value, withoutUnderwriting.value)
  }
})

watch(withoutUnderwriting, async (enabled) => {
  // Mode tanpa riwayat underwriting di SCC memang melewati pemeriksaan Lifins,
  // tetapi NIK tetap wajib dikirim pada payload pengajuan.
  nikChecked.value = enabled
  if (enabled && !partnerOptions.value.length) await loadPartnerOptions()
})

watch(productKey, async () => {
  selectedBenefits.value = []
  insuranceId.value = null
  brokerId.value = null
  insuranceOptions.value = []
  brokerOptions.value = []
  if (currentProduct.value && productType.value === 'Produk Standar / PAB') {
    insuranceOptions.value = await getSubmissionInsurances(currentProduct.value.id)
  }
})

watch(insuranceId, async () => {
  brokerId.value = null
  brokerOptions.value = []
  if (insuranceId.value) brokerOptions.value = await getSubmissionBrokers(insuranceId.value)
})

function productOptionValue(product) {
  return productType.value === 'Produk Non PAB' ? product.bundle_product_id : product.id
}

async function loadMembers() {
  const members = await getSubmissionMembersByPartner(partnerId.value)
  const user = auth.user
  if (user?.role === 'Branch Bank') {
    memberOptions.value = members.filter((m) => Number(m.member_id) === Number(user.member_id))
  } else {
    memberOptions.value = members
  }
}

function uppercaseValue(value) {
  return value ? String(value).toUpperCase() : value
}

function normalizeMoney() {
  const n = parseNumber(sumInsured.value)
  sumInsured.value = n ? formatNumber(n) : ''
}

async function cekNik() {
  if (!idCardNumber.value || idCardNumber.value.length !== 16) {
    return window.Swal.fire({ icon: 'error', text: 'NIK wajib 16 digit', padding: '1em' })
  }
  checkingNik.value = true
  try {
    const res = await checkLifinsNik(idCardNumber.value)
    if (res.exist === false) {
      nikChecked.value = false
      return window.Swal.fire({ icon: 'error', text: 'NIK tidak terdaftar di sistem', padding: '1em' })
    }
    const d = res.data || {}
    debiturName.value = uppercaseValue(d.debitur_name) || ''
    dob.value = d.dob ? moment(d.dob, 'DD/MM/YYYY').format('YYYY-MM-DD') : ''
    gender.value = d.gender ? (d.gender === 'Male' ? 'LAKI-LAKI' : 'PEREMPUAN') : null
    customerContactPhoneNumber.value = d.phone_number || ''
    customerContactEmail.value = uppercaseValue(d.email) || ''
    nikChecked.value = true
    await loadPartnerOptions()
    window.Swal.fire({ icon: 'success', text: 'NIK terdaftar di sistem', padding: '1em' })
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    checkingNik.value = false
  }
}

async function loadRestituteDebitur() {
  try {
    const d = await getRestituteDebitur(restituteId)
    idCardNumber.value = d.id_card_number || ''
    debiturName.value = uppercaseValue(d.debitur_name) || ''
    contractNumber.value = uppercaseValue(newContractNumber) || ''
    pob.value = uppercaseValue(d.pob) || ''
    dob.value = d.dob ? moment(d.dob, 'DD/MM/YYYY').format('YYYY-MM-DD') : ''
    gender.value = d.gender || null
    customerContactAddress.value = uppercaseValue(d.customer_contact_address) || ''
    customerContactCity.value = uppercaseValue(d.customer_contact_city) || ''
    customerContactPhoneNumber.value = d.customer_contact_phone_number || ''
    customerContactTelephone.value = d.customer_contact_telephone || ''
    customerContactEmail.value = uppercaseValue(d.customer_contact_email) || ''
    companyName.value = uppercaseValue(d.company_name) || ''
    companyField.value = d.company_field || null
    companyPosition.value = uppercaseValue(d.company_position) || ''
    companyAddress.value = uppercaseValue(d.company_address) || ''
    contractNumberLocked.value = true
    nikChecked.value = true
    await loadPartnerOptions()
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Gagal memuat data restitusi', padding: '2em' })
  }
}

function validateBase() {
  const required = [
    [idCardNumber.value, 'Wajib isi nik'],
    [nikChecked.value, 'NIK wajib dicek terlebih dahulu'],
    [partnerId.value, 'Wajib isi bank'],
    [memberId.value, 'Wajib isi cabang bank'],
    [productType.value, 'Wajib isi jenis produk'],
    [productKey.value, 'Wajib isi produk asuransi'],
    [sumInsured.value, 'Wajib isi uang pertanggungan'],
    [startDate.value, 'Wajib isi mulai asuransi'],
    [insurancePeriod.value, 'Wajib isi masa asuransi'],
    [debiturName.value, 'Wajib isi nama debitur'],
    [contractNumber.value, 'Wajib isi no. akad'],
    [accountNumber.value, 'Wajib isi no. rekening pinjaman'],
    [pob.value, 'Wajib isi tempat lahir'],
    [dob.value, 'Wajib isi tanggal lahir'],
    [gender.value, 'Wajib isi jenis kelamin'],
    [occupation.value, 'Wajib isi pekerjaan'],
    [detailOccupation.value, 'Wajib isi detail pekerjaan'],
    [customerContactAddress.value, 'Wajib isi alamat'],
  ]
  if (productType.value === 'Produk Standar / PAB') {
    required.push([insuranceId.value, 'Wajib isi perusahaan asuransi'])
    required.push([brokerId.value !== null && brokerId.value !== '', 'Wajib isi broker'])
  }
  for (const [ok, msg] of required) {
    if (!ok) {
      window.Swal.fire({ icon: 'error', text: msg, padding: '1em' })
      return false
    }
  }
  return true
}

function validatePreview() {
  // Preview SCC hanya membutuhkan data yang dipakai kalkulasi premi; field
  // debitur lain tidak boleh memblokir permintaan preview.
  const required = [
    [productType.value, 'Wajib isi jenis produk'],
    [productKey.value, 'Wajib isi produk asuransi'],
    [sumInsured.value, 'Wajib isi uang pertanggungan'],
    [insurancePeriod.value, 'Wajib isi masa asuransi'],
    [dob.value, 'Wajib isi tanggal lahir'],
  ]
  if (productType.value === 'Produk Standar / PAB') {
    required.splice(2, 0, [insuranceId.value, 'Wajib isi perusahaan asuransi'])
  }
  for (const [ok, msg] of required) {
    if (!ok) {
      window.Swal.fire({ icon: 'error', text: msg, padding: '1em' })
      return false
    }
  }
  return true
}

function premiumPayload() {
  const payload = {
    sum_insured: parseNumber(sumInsured.value),
    insurance_period: parseInt(insurancePeriod.value, 10),
    dob: moment(dob.value).format('DD/MM/YYYY'),
    additional_benefit: selectedBenefits.value,
  }
  if (productType.value === 'Produk Standar / PAB') {
    payload.product_type = 'pab'
    payload.product_id = parseInt(currentProduct.value.id, 10)
    payload.insurance_id = parseInt(insuranceId.value, 10)
  } else {
    payload.product_type = 'non-pab'
    payload.bundle_product_id = parseInt(productKey.value, 10)
    payload.insurance_id = 0
  }
  return payload
}

async function previewPremi() {
  if (!validatePreview()) return
  previewing.value = true
  try {
    const { data } = await previewSubmissionPremium(premiumPayload())
    window.Swal.fire({
      icon: 'info',
      title: 'Kalkulasi Premi',
      html: `Calculated Premium: <b>${rupiah(data?.data?.calculated_premium)}</b><br/>Assumption Premium: <b>${rupiah(data?.data?.assumption_premium)}</b>`,
      padding: '2em',
    })
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    previewing.value = false
  }
}

async function simpan() {
  if (!validateBase()) return
  const file = creditContract.value?.files?.[0]
  if (!file) return window.Swal.fire({ icon: 'error', text: 'Wajib upload akad kredit bank', padding: '1em' })

  submitting.value = true
  try {
    const path = await uploadFile(file)
    const payload = {
      user_id: parseInt(auth.user?.id ?? session.userId, 10),
      start_date: moment(startDate.value).format('DD/MM/YYYY'),
      sum_insured: parseNumber(sumInsured.value),
      insurance_period: parseInt(insurancePeriod.value, 10),
      debitur_name: uppercaseValue(debiturName.value),
      contract_number: uppercaseValue(contractNumber.value),
      account_number: parseInt(accountNumber.value, 10),
      id_card_type: 'KTP',
      id_card_number: idCardNumber.value,
      pob: uppercaseValue(pob.value),
      dob: moment(dob.value).format('DD/MM/YYYY'),
      gender: gender.value,
      occupation: occupation.value,
      detail_occupation: uppercaseValue(detailOccupation.value),
      customer_contact_address: uppercaseValue(customerContactAddress.value),
      customer_contact_city: uppercaseValue(customerContactCity.value),
      customer_contact_phone_number: customerContactPhoneNumber.value,
      customer_contact_telephone: customerContactTelephone.value,
      customer_contact_email: uppercaseValue(customerContactEmail.value),
      company_name: uppercaseValue(companyName.value),
      company_field: companyField.value,
      company_position: uppercaseValue(companyPosition.value),
      company_address: uppercaseValue(companyAddress.value),
      partner_id: parseInt(partnerId.value, 10),
      restitute_id: restituteId ? parseInt(restituteId, 10) : null,
      credit_contract: path,
      additional_benefit: selectedBenefits.value,
      member_id: parseInt(memberId.value, 10),
    }
    if (productType.value === 'Produk Standar / PAB') {
      payload.product_type = 'pab'
      payload.product_id = parseInt(currentProduct.value.id, 10)
      payload.insurance_id = parseInt(insuranceId.value, 10)
      payload.broker_id = parseInt(currentBroker.value?.broker_id ?? 0, 10)
    } else {
      payload.product_type = 'non-pab'
      payload.bundle_product_id = parseInt(productKey.value, 10)
    }

    const { data } = await storeSubmission(payload)
    if (data.status === 200) {
      await window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
      if (restituteId) router.push({ name: 'list-restitusi' })
      else resetAfterStore()
    } else {
      window.Swal.fire({ icon: 'error', text: data.message || 'Terjadi Kesalahan', padding: '1em' })
    }
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    submitting.value = false
  }
}

function resetAfterStore() {
  // Pengajuan biasa di SCC tetap berada pada halaman ini lalu mengosongkan form,
  // sehingga pengguna dapat langsung memasukkan pengajuan berikutnya.
  withoutUnderwriting.value = false
  nikChecked.value = false
  idCardNumber.value = ''
  partnerId.value = null
  memberId.value = null
  productType.value = null
  productKey.value = null
  insuranceId.value = null
  brokerId.value = null
  sumInsured.value = ''
  startDate.value = ''
  insurancePeriod.value = ''
  debiturName.value = ''
  contractNumber.value = ''
  accountNumber.value = ''
  pob.value = ''
  dob.value = ''
  gender.value = null
  occupation.value = null
  detailOccupation.value = ''
  customerContactAddress.value = ''
  customerContactCity.value = ''
  customerContactPhoneNumber.value = ''
  customerContactTelephone.value = ''
  customerContactEmail.value = ''
  companyName.value = ''
  companyField.value = null
  companyPosition.value = ''
  companyAddress.value = ''
  selectedBenefits.value = []
  if (creditContract.value) creditContract.value.value = ''
}
</script>

<template>
  <div>
    <PageHeader title="Input Pengajuan" subtitle="Input pengajuan asuransi sesuai alur Penutupan." />

    <div class="space-y-5">
      <Card title="Pengajuan Asuransi">
        <div v-if="!restituteId" class="mb-4 flex items-center gap-3">
          <input v-model="withoutUnderwriting" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          <span class="text-sm text-slate-700 dark:text-slate-300">Input Pengajuan Tanpa Riwayat Underwriting</span>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="sm:col-span-2">
            <label class="form-label">NIK <span class="text-danger">*</span></label>
            <input v-model="idCardNumber" maxlength="16" class="form-input" placeholder="Masukan NIK" @input="idCardNumber = idCardNumber.replace(/\\D/g, '')" />
          </div>
          <div class="flex items-end">
            <BaseButton class="w-full" :loading="checkingNik" :disabled="withoutUnderwriting" @click="cekNik">Cek NIK</BaseButton>
          </div>
          <BaseSelect v-model="partnerId" :options="partnerOptions" option-label="partner_name" option-value="partner_id" label="Bank" placeholder="Pilih Bank" required />
          <BaseSelect v-model="memberId" :options="memberOptions" option-label="member_name" option-value="member_id" label="Cabang Bank" placeholder="Pilih Cabang" required />
          <BaseSelect v-model="productType" :options="productTypeOptions" label="Jenis Produk" placeholder="Pilih Jenis Produk" required />
        </div>
      </Card>

      <Card title="Asuransi">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BaseSelect
            v-model="productKey"
            :options="productOptions"
            :option-label="productType === 'Produk Non PAB' ? 'name' : 'product_name'"
            :option-value="productType === 'Produk Non PAB' ? 'bundle_product_id' : 'id'"
            label="Produk Asuransi"
            placeholder="Pilih Produk"
            required
          />
          <BaseSelect v-model="insuranceId" :options="insuranceOptions" option-label="insurance_name" option-value="id" label="Perusahaan Asuransi" placeholder="Pilih Asuransi" :disabled="productType === 'Produk Non PAB'" />
          <BaseSelect v-model="brokerId" :options="brokerOptions" option-label="broker_name" option-value="broker_id" label="Broker" placeholder="Pilih Broker" :disabled="productType === 'Produk Non PAB'" />
          <div>
            <label class="form-label">Uang Pertanggungan <span class="text-danger">*</span></label>
            <input v-model="sumInsured" class="form-input" placeholder="Masukan uang pertanggungan" @input="normalizeMoney" />
            <p v-if="minSumInsured || maxSumInsured" class="mt-1 text-xs text-slate-500">Range {{ minSumInsured }} - {{ maxSumInsured }}</p>
          </div>
          <div>
            <label class="form-label">Mulai Asuransi <span class="text-danger">*</span></label>
            <input v-model="startDate" type="date" class="form-input" :min="minStartDate" />
          </div>
          <div>
            <label class="form-label">Masa Asuransi <span class="text-danger">*</span></label>
            <input v-model="insurancePeriod" type="number" class="form-input" placeholder="Bulan" />
            <p v-if="limitPeriod" class="mt-1 text-xs text-slate-500">Maks. {{ limitPeriod }} Bulan</p>
          </div>
        </div>
      </Card>

      <Card title="Data Debitur">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label class="form-label">Nama Debitur <span class="text-danger">*</span></label><input v-model="debiturName" class="form-input" @input="debiturName = uppercaseValue(debiturName)" /></div>
          <div><label class="form-label">No. Akad <span class="text-danger">*</span></label><input v-model="contractNumber" class="form-input" :disabled="contractNumberLocked" @input="contractNumber = uppercaseValue(contractNumber)" /></div>
          <div><label class="form-label">No. Rekening Pinjaman <span class="text-danger">*</span></label><input v-model="accountNumber" class="form-input" /></div>
          <div><label class="form-label">Jenis Identitas</label><input value="KTP" class="form-input" disabled /></div>
          <div><label class="form-label">Tempat Lahir <span class="text-danger">*</span></label><input v-model="pob" class="form-input" @input="pob = uppercaseValue(pob)" /></div>
          <div><label class="form-label">Tanggal Lahir <span class="text-danger">*</span></label><input v-model="dob" type="date" class="form-input" /></div>
          <BaseSelect v-model="gender" :options="genderOptions" label="Jenis Kelamin" placeholder="Pilih Jenis Kelamin" required />
          <BaseSelect v-model="occupation" :options="currentProduct?.occupation || []" label="Pekerjaan" placeholder="Pilih Pekerjaan" required />
          <div><label class="form-label">Upload Akad Kredit Bank <span class="text-danger">*</span></label><input ref="creditContract" type="file" class="form-input" /></div>
          <div class="lg:col-span-3"><label class="form-label">Detail Pekerjaan <span class="text-danger">*</span></label><input v-model="detailOccupation" class="form-input" @input="detailOccupation = uppercaseValue(detailOccupation)" /></div>
        </div>
      </Card>

      <Card title="Kontak Debitur">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2"><label class="form-label">Alamat <span class="text-danger">*</span></label><input v-model="customerContactAddress" class="form-input" @input="customerContactAddress = uppercaseValue(customerContactAddress)" /></div>
          <div><label class="form-label">Kota</label><input v-model="customerContactCity" class="form-input" @input="customerContactCity = uppercaseValue(customerContactCity)" /></div>
          <div><label class="form-label">No. Handphone</label><input v-model="customerContactPhoneNumber" class="form-input" /></div>
          <div><label class="form-label">Telepon</label><input v-model="customerContactTelephone" class="form-input" /></div>
          <div><label class="form-label">Email</label><input v-model="customerContactEmail" class="form-input" @input="customerContactEmail = uppercaseValue(customerContactEmail)" /></div>
        </div>
      </Card>

      <Card title="Tempat Bekerja">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label class="form-label">Nama Instansi / Perusahaan</label><input v-model="companyName" class="form-input" @input="companyName = uppercaseValue(companyName)" /></div>
          <BaseSelect v-model="companyField" :options="companyFieldOptions" label="Jenis Bidang Usaha" placeholder="Pilih Jenis Bidang Usaha" />
          <div><label class="form-label">Jabatan</label><input v-model="companyPosition" class="form-input" @input="companyPosition = uppercaseValue(companyPosition)" /></div>
          <div><label class="form-label">Alamat</label><input v-model="companyAddress" class="form-input" @input="companyAddress = uppercaseValue(companyAddress)" /></div>
        </div>
      </Card>

      <Card title="Manfaat">
        <div class="space-y-2">
          <label v-for="b in mainBenefits" :key="`main-${b}`" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked disabled class="h-4 w-4 rounded border-slate-300" /> {{ b }}
          </label>
          <label v-for="b in additionalBenefits" :key="`add-${b}`" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input v-model="selectedBenefits" :value="b" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" /> {{ b }}
          </label>
        </div>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <BaseButton variant="outline-primary" :loading="previewing" @click="previewPremi">Lihat Kalkulasi Premi</BaseButton>
          <BaseButton :loading="submitting" @click="simpan">Simpan</BaseButton>
        </div>
      </Card>
    </div>
  </div>
</template>

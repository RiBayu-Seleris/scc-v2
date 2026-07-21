<script setup>
/**
 * LAPORAN PRODUKSI (multi-tab).
 *
 * Menggabungkan 11 file laporan produksi lama menjadi satu komponen konfigurable:
 * Akseptasi, Surat Feebase, Asuransi, Summary, SPPA, Restrukturisasi, Revisi,
 * Produksi Telat, Produksi Pending, Bordero, Tanggungan, YES File.
 *
 * Route/tab/endpoint/payload mengikuti SCC. Tiga tab lama
 * (Restrukturisasi, Produksi Telat, Produksi Pending) hanya punya tombol tanpa
 * handler submit; di sini tombolnya memberi pesan bahwa export belum tersedia
 * di source lama.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  generateCheckedReportFile,
  generateReportFileGet,
  getAllBrokers,
  getAllInsurances,
  getAllPartners,
  getAllReassurances,
  getAllRetrosesi,
  getCompaniesByPartner,
  getDashboardBanks,
  getMemberOfficesByBranch,
  getMembersByPartner,
  getProductsByPartner,
} from '@/lib/services/report'
import { getSession } from '@/lib/auth'
// Daftar tab + gating role dipusatkan di src/config/productionTabs.js
// (dipakai juga oleh ProductionReportAkseptasi.vue).
import { PRODUCTION_TABS as TABS, filterProductionTabs } from '@/config/productionTabs'
import { moment, today } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FileDown } from 'lucide-vue-next'

const props = defineProps({
  variant: { type: String, default: 'akseptasi' },
})

const route = useRoute()
const session = getSession()

const CONFIG = {
  akseptasi: {
    endpoint: 'report/production/each-branch',
    fields: ['bank', 'member', 'office', 'broker', 'insurance', 'product', 'timeFilter', 'submissionStatus'],
  },
  asuransi: {
    endpoint: 'report/production/all-branch',
    fields: ['bank', 'member', 'broker', 'insurance', 'product', 'timeFilter'],
    availability: { type: 'sum', key: 'insurance_company' },
  },
  summary: {
    endpoint: 'report/production/money-branch',
    fields: ['bank', 'broker', 'insurance', 'timeFilter'],
    availability: { type: 'sum', key: 'branch' },
  },
  sppa: { endpoint: 'report/production/sppa', fields: ['bank', 'broker'], availability: { type: 'not-null', key: 'data' } },
  revisi: { endpoint: 'report/production/revision-data', fields: ['bank', 'member'], availability: { type: 'sum', key: 'branch' } },
  tanggungan: { endpoint: 'report/production/dependent-payment', fields: ['bank', 'member'], availability: { type: 'total', key: 'total_debitur' } },
  'yes-file': { endpoint: 'report/yes-file/chubb', fields: [] },
  bordero: { endpoint: 'submission/bordero-data', fields: ['reportType', 'paymentStatus'], availability: { type: 'array', key: 'data' } },
  'surat-feebase': { endpoint: 'report/fee-base', method: 'get', fields: ['feeBank', 'month', 'year'] },
  restrukturisasi: { fields: ['bank', 'member', 'broker', 'insurance', 'restructurisationStatus'], unavailable: true },
  'produksi-telat': { fields: ['bank', 'member', 'broker', 'insurance', 'product'], unavailable: true },
  'produksi-pending': { fields: ['bank', 'member', 'broker', 'insurance'], unavailable: true },
}

const activeConfig = computed(() => CONFIG[props.variant] || CONFIG.akseptasi)
const activeTitle = computed(() => TABS.find((t) => t.key === props.variant)?.label || 'Akseptasi')

// Tab yang tampil sesuai role (gating dipusatkan di config/productionTabs.js).
const auth = useAuthStore()
const visibleTabs = computed(() => filterProductionTabs(session.role, auth.user?.broker_id))

useMeta({ title: () => 'Laporan Produksi - ' + activeTitle.value })

const startDate = ref(moment().startOf('month').format('YYYY-MM-DD'))
const endDate = ref(today('YYYY-MM-DD'))
const bankId = ref(null)
const memberId = ref(null)
const officeId = ref(null)
const brokerId = ref(null)
const insuranceCompanyId = ref(null)
const productId = ref(null)
const timeFilter = ref(null)
const submissionStatus = ref(null)
const reportType = ref(null)
const paymentStatus = ref(null)
const reinsuranceId = ref(null)
const retrocessionId = ref(null)
const restructurisationStatus = ref(null)
const selectedMonth = ref(null)
const selectedYear = ref(null)

const bankOptions = ref([])
const memberOptions = ref([])
const officeOptions = ref([])
const brokerOptions = ref([])
const insuranceOptions = ref([])
const productOptions = ref([])
const allInsuranceOptions = ref([])
const reinsuranceOptions = ref([])
const retrocessionOptions = ref([])
const loading = ref(false)

const timeFilterOptions = ['Waktu Penginputan', 'Waktu Akad']
const submissionStatusOptions = [
  'Semua Status Pengajuan',
  'Diterima',
  'Diterima Standar',
  'Diterima dengan Lien Clause',
  'Diterima dengan Extra Premi',
  'Menunggu Keputusan Underwriting',
  'Menunggu Hasil Pemeriksaan Kesehatan',
  'Dibatalkan',
  'Ditolak',
]
const reportTypeOptions = ['Bank ke Asuransi', 'Asuransi ke Reasuransi', 'Reasuransi ke Retrosesi']
const paymentStatusOptions = ['Semua', 'Sudah Bayar', 'Belum Bayar']
const restructurisationStatusOptions = ['Semua', 'Restruktur Register', 'Restruktur Dikonfirmasi']
const monthOptions = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
].map((label, i) => ({ label, value: i + 1 }))
const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

function hasField(field) {
  return activeConfig.value.fields.includes(field)
}

function toOptions(list, label, value) {
  return list.map((item) => ({ ...item, label: item[label], value: item[value] }))
}

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

onMounted(async () => {
  if (!auth.user) await auth.fetchUser() // untuk role & broker_id (visibilitas tab)
  // SCC hanya memanggil endpoint opsi yang benar-benar dipakai varian aktif.
  // Ini penting agar halaman tidak membuat request tambahan dengan kontrak berbeda.
  if (hasField('bank')) {
    bankOptions.value = toOptions(await getAllPartners().catch(() => []), 'partner_name', 'partner_id')
  } else if (hasField('feeBank')) {
    bankOptions.value = toOptions(await getDashboardBanks().catch(() => []), 'partner_name', 'partner_id')
  }
  if (hasField('broker')) {
    brokerOptions.value = toOptions(await getAllBrokers().catch(() => []), 'broker_name', 'broker_id')
  }
  if (props.variant === 'bordero') {
    const [insurances, reassurances, retrosesis] = await Promise.all([
      getAllInsurances().catch(() => []),
      getAllReassurances().catch(() => []),
      getAllRetrosesi().catch(() => []),
    ])
    allInsuranceOptions.value = toOptions(insurances, 'insurance_name', 'insurance_id')
    reinsuranceOptions.value = toOptions(reassurances, 'reassurance_name', 'reassurance_id')
    retrocessionOptions.value = toOptions(retrosesis, 'retrosesi_name', 'retrosesi_id')
  }
})

watch(bankId, async (id) => {
  memberId.value = null
  officeId.value = null
  insuranceCompanyId.value = null
  productId.value = null
  memberOptions.value = []
  officeOptions.value = []
  insuranceOptions.value = []
  productOptions.value = []
  if (!id || Number(id) === 0) return

  // Broker tidak ikut cascade bank: SCC memakai submission/all-broker sekali saat mount.
  const [members, companies, products] = await Promise.all([
    hasField('member') ? getMembersByPartner(id).catch(() => []) : [],
    hasField('insurance') && props.variant !== 'bordero' ? getCompaniesByPartner(id).catch(() => []) : [],
    hasField('product') ? getProductsByPartner(id).catch(() => []) : [],
  ])
  if (hasField('member')) memberOptions.value = toOptions(members, 'member_name', 'member_id')
  if (hasField('insurance') && props.variant !== 'bordero') insuranceOptions.value = toOptions(companies, 'company_name', 'company_id')
  if (hasField('product')) productOptions.value = toOptions(products, 'product_name', 'id')
})

watch(memberId, async (id) => {
  officeId.value = null
  officeOptions.value = []
  if (!id || Number(id) === 0) {
    officeOptions.value = [{ label: 'Semua Kantor', value: 0 }]
    return
  }
  officeOptions.value = toOptions(await getMemberOfficesByBranch(id).catch(() => []), 'member_name', 'member_id')
})

function validate() {
  // Surat Fee Base di SCC hanya memakai bank, bulan, dan tahun; tanggal yang
  // tersedia pada komponen bersama tidak boleh ikut mengubah payload/validasi.
  if (props.variant !== 'surat-feebase' && !startDate.value) return 'Dari Tanggal wajib diisi'
  if (props.variant !== 'surat-feebase' && !endDate.value) return 'Sampai Tanggal wajib diisi'
  if (hasField('bank') && !bankId.value) return 'Bank wajib diisi'
  if (hasField('feeBank') && !bankId.value) return 'Bank wajib diisi'
  if (hasField('member') && memberId.value === null) return 'Nama Cabang wajib diisi'
  if (hasField('office') && officeId.value === null) return 'Nama Kantor wajib diisi'
  if (hasField('broker') && brokerId.value === null) return 'Broker wajib diisi'
  if (hasField('insurance') && insuranceCompanyId.value === null) return 'Asuransi wajib diisi'
  if (hasField('product') && productId.value === null) return 'Produk wajib diisi'
  if (hasField('timeFilter') && !timeFilter.value) return 'Filter Waktu wajib diisi'
  if (hasField('submissionStatus') && !submissionStatus.value) return 'Status Pengajuan wajib diisi'
  if (hasField('reportType') && !reportType.value) return 'Tipe Laporan wajib diisi'
  if (hasField('paymentStatus') && !paymentStatus.value) return 'Status Pembayaran wajib diisi'
  if (props.variant === 'surat-feebase' && (!selectedMonth.value || !selectedYear.value)) return 'Bulan dan Tahun wajib diisi'
  return ''
}

function productionPayload() {
  const dates = {
    start_date: moment(startDate.value).format('YYYY-MM-DD'),
    end_date: moment(endDate.value).format('YYYY-MM-DD'),
  }
  const partner_id = parseInt(bankId.value, 10)
  if (props.variant === 'asuransi') return {
    ...dates,
    partner_id,
    member_id: parseInt(memberId.value, 10),
    broker_id: parseInt(brokerId.value, 10),
    insurance_company_id: parseInt(insuranceCompanyId.value, 10),
    product_id: parseInt(productId.value, 10),
    time_filter: timeFilter.value,
  }
  if (props.variant === 'summary') return {
    ...dates,
    partner_id,
    broker_id: parseInt(brokerId.value, 10),
    insurance_company_id: parseInt(insuranceCompanyId.value, 10),
    time_filter: timeFilter.value,
  }
  if (props.variant === 'sppa') return {
    ...dates,
    partner_id,
    broker_id: parseInt(brokerId.value, 10),
  }
  if (props.variant === 'revisi' || props.variant === 'tanggungan') return {
    ...dates,
    partner_id,
    member_id: parseInt(memberId.value, 10),
  }
  // YES File di SCC hanya menerima rentang tanggal.
  return dates
}

function borderoPayload() {
  const base = {
    start_date: moment(startDate.value).format('YYYY-MM-DD'),
    end_date: moment(endDate.value).format('YYYY-MM-DD'),
    payment_status: paymentStatus.value,
  }
  if (reportType.value === 'Bank ke Asuransi') {
    return { ...base, partner_id: parseInt(bankId.value, 10), insurance_id: parseInt(insuranceCompanyId.value, 10), bordero_type: 'partner-insurance' }
  }
  if (reportType.value === 'Asuransi ke Reasuransi') {
    return { ...base, insurance_id: parseInt(insuranceCompanyId.value, 10), reassurance_id: parseInt(reinsuranceId.value, 10), bordero_type: 'insurance-reassurance' }
  }
  return { ...base, reassurance_id: parseInt(reinsuranceId.value, 10), retrosesi_id: parseInt(retrocessionId.value, 10), bordero_type: 'reassurance-retrosesi' }
}

async function cetak() {
  if (activeConfig.value.unavailable) {
    // Tombol tiga varian ini memang tidak memiliki handler di SCC.
    return
  }
  const error = validate()
  if (error) return alert('error', error)

  loading.value = true
  let res
  if (props.variant === 'surat-feebase') {
    res = await generateReportFileGet(activeConfig.value.endpoint, {
      partner_id: bankId.value,
      branch_id: undefined,
      year: selectedYear.value,
      month: selectedMonth.value,
    })
  } else if (props.variant === 'bordero') {
    if (reportType.value === 'Bank ke Asuransi' && (!bankId.value || !insuranceCompanyId.value)) {
      loading.value = false
      return alert('error', 'Bank dan Asuransi wajib diisi')
    }
    if (reportType.value === 'Asuransi ke Reasuransi' && (!insuranceCompanyId.value || !reinsuranceId.value)) {
      loading.value = false
      return alert('error', 'Asuransi dan Reasuransi wajib diisi')
    }
    if (reportType.value === 'Reasuransi ke Retrosesi' && (!reinsuranceId.value || !retrocessionId.value)) {
      loading.value = false
      return alert('error', 'Reasuransi dan Retrosesi wajib diisi')
    }
    res = await generateCheckedReportFile(activeConfig.value.endpoint, borderoPayload(), activeConfig.value.availability)
  } else {
    res = await generateCheckedReportFile(activeConfig.value.endpoint, productionPayload(), activeConfig.value.availability)
  }
  loading.value = false
  if (!res.ok) alert('error', res.message)
}
</script>

<template>
  <div>
    <PageHeader title="Laporan Produksi" :subtitle="activeTitle" />

    <div class="mb-4 flex flex-wrap gap-2">
      <router-link
        v-for="tab in visibleTabs"
        :key="tab.route"
        :to="{ name: tab.route }"
        class="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
        :class="
          route.name === tab.route
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        "
      >
        {{ tab.label }}
      </router-link>
    </div>

    <Card>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label class="form-label">Dari Tanggal <span class="text-danger">*</span></label>
          <input v-model="startDate" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">Sampai Tanggal <span class="text-danger">*</span></label>
          <input v-model="endDate" type="date" class="form-input" />
        </div>

        <BaseSelect
          v-if="hasField('bank') || hasField('feeBank')"
          v-model="bankId"
          :options="bankOptions"
          label="Nama Bank"
          placeholder="Pilih Bank"
          required
        />
        <BaseSelect
          v-if="hasField('member')"
          v-model="memberId"
          :options="memberOptions"
          label="Nama Cabang"
          :placeholder="bankId ? 'Pilih Cabang' : 'Pilih Bank dulu'"
          :disabled="!bankId"
          required
        />
        <BaseSelect
          v-if="hasField('office')"
          v-model="officeId"
          :options="officeOptions"
          label="Nama Kantor"
          :placeholder="memberId ? 'Pilih Kantor' : 'Pilih Cabang dulu'"
          :disabled="!memberId"
          required
        />
        <BaseSelect
          v-if="hasField('broker')"
          v-model="brokerId"
          :options="brokerOptions"
          label="Broker"
          :placeholder="bankId ? 'Pilih Broker' : 'Pilih Bank dulu'"
          :disabled="!bankId"
          required
        />
        <BaseSelect
          v-if="hasField('insurance') && props.variant !== 'bordero'"
          v-model="insuranceCompanyId"
          :options="insuranceOptions"
          label="Asuransi"
          :placeholder="bankId ? 'Pilih Asuransi' : 'Pilih Bank dulu'"
          :disabled="!bankId"
          required
        />
        <BaseSelect
          v-if="props.variant === 'bordero' && (reportType === 'Bank ke Asuransi' || reportType === 'Asuransi ke Reasuransi')"
          v-model="insuranceCompanyId"
          :options="allInsuranceOptions"
          label="Asuransi"
          placeholder="Pilih Asuransi"
          required
        />
        <BaseSelect
          v-if="props.variant === 'bordero' && (reportType === 'Asuransi ke Reasuransi' || reportType === 'Reasuransi ke Retrosesi')"
          v-model="reinsuranceId"
          :options="reinsuranceOptions"
          label="Reasuransi"
          placeholder="Pilih Reasuransi"
          required
        />
        <BaseSelect
          v-if="props.variant === 'bordero' && reportType === 'Reasuransi ke Retrosesi'"
          v-model="retrocessionId"
          :options="retrocessionOptions"
          label="Retrosesi"
          placeholder="Pilih Retrosesi"
          required
        />
        <BaseSelect
          v-if="hasField('product')"
          v-model="productId"
          :options="productOptions"
          label="Produk"
          :placeholder="bankId ? 'Pilih Produk' : 'Pilih Bank dulu'"
          :disabled="!bankId"
          required
        />
        <BaseSelect v-if="hasField('timeFilter')" v-model="timeFilter" :options="timeFilterOptions" label="Filter Waktu" placeholder="Pilih Filter Waktu" required />
        <BaseSelect v-if="hasField('submissionStatus')" v-model="submissionStatus" :options="submissionStatusOptions" label="Status Pengajuan" placeholder="Pilih Status Pengajuan" required />
        <BaseSelect v-if="hasField('reportType')" v-model="reportType" :options="reportTypeOptions" label="Tipe Laporan" placeholder="Pilih Tipe Laporan" required />
        <BaseSelect v-if="hasField('paymentStatus')" v-model="paymentStatus" :options="paymentStatusOptions" label="Status Pembayaran" placeholder="Pilih Status Pembayaran" required />
        <BaseSelect v-if="hasField('restructurisationStatus')" v-model="restructurisationStatus" :options="restructurisationStatusOptions" label="Status Restrukturisasi" placeholder="Pilih Status" required />
        <BaseSelect v-if="props.variant === 'surat-feebase'" v-model="selectedMonth" :options="monthOptions" label="Bulan" placeholder="Pilih Bulan" option-label="label" option-value="value" required />
        <BaseSelect v-if="props.variant === 'surat-feebase'" v-model="selectedYear" :options="years" label="Tahun" placeholder="Pilih Tahun" required />
      </div>

      <div class="mt-6 flex justify-end">
        <BaseButton variant="primary" :loading="loading" @click="cetak">
          <FileDown class="h-4 w-4" /> Cetak Excel
        </BaseButton>
      </div>
    </Card>
  </div>
</template>

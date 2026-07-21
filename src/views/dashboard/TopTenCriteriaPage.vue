<script setup>
/**
 * DASHBOARD - TOP 10 CRITERIA.
 *
 * Port behavior dari ehd-backoffice:
 * - 5 route/tab internal Top 10.
 * - Filter periode + cabang.
 * - Search, pagination start/length=10.
 * - Endpoint dan key respons sama dengan source lama.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSession } from '@/lib/auth'
import {
  DASHBOARD_START_DATE,
  DASHBOARD_END_DATE,
  dashboardScopeParams,
  getDashboardFilterSelection,
  getTopTenCriteria,
} from '@/lib/services/dashboard'
import { formatNumber, rupiah, moment } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { Search } from 'lucide-vue-next'

useMeta({ title: 'Top 10 Criteria' })

const route = useRoute()
const router = useRouter()
const session = getSession()

const tabs = [
  { label: 'Top 10 Debitur Diakseptasi', route: 'top-ten-criteria' },
  { label: 'Top 10 Debitur Klaim', route: 'top-ten-criteria-klaim' },
  { label: 'Top 10 Debitur Lapses', route: 'top-ten-criteria-lapses' },
  { label: 'Top 10 Nilai Klaim', route: 'top-ten-criteria-klaim-value' },
  { label: 'Top 10 Nilai Premi', route: 'top-ten-criteria-premi-value' },
]

const colors = ['#2ec4b6', '#2374ab', '#1dc457', '#7b91fc', '#ff5cb0', '#ff9f19', '#de3968', '#1a46bf', '#85bae0', '#fc6514', '#89cc16']

const configs = {
  'top-ten-criteria': {
    title: 'Top 10 Debitur Diakseptasi',
    endpoint: 'dashboard/top-ten/acceptance',
    sections: [
      { key: 'acceptance_debitur', title: 'Debitur Diakseptasi', valueLabel: 'Jumlah' },
      { key: 'acceptance_debitur_standard', title: 'Debitur Diakseptasi Standard', valueLabel: 'Jumlah' },
      { key: 'acceptance_debitur_substandard', title: 'Debitur Diakseptasi Substandard', valueLabel: 'Jumlah' },
      { key: 'premium_debitur', title: 'Total Premi Bruto', valueLabel: 'Total (IDR)', money: true },
      { key: 'sum_insured_debitur', title: 'Total Uang Pertanggungan (UP)', valueLabel: 'Total (IDR)', money: true },
    ],
  },
  'top-ten-criteria-klaim': {
    title: 'Top 10 Debitur Klaim',
    endpoint: 'dashboard/top-ten/branch-claim',
    sections: [
      { key: 'claim_debitur', title: 'Debitur Klaim', valueLabel: 'Jumlah' },
      { key: 'nd_claim', title: 'Debitur Klaim Meninggal Dunia Alami', valueLabel: 'Jumlah' },
      { key: 'early_claim', title: 'Debitur Early Claim Death', valueLabel: 'Jumlah' },
      { key: 'paa_claim', title: 'Debitur Klaim Meninggal Dunia Kecelakaan', valueLabel: 'Jumlah' },
      { key: 'phk_claim', title: 'Debitur Klaim PHK', valueLabel: 'Jumlah' },
      { key: 'tpd_claim', title: 'Debitur Klaim TPD', valueLabel: 'Jumlah' },
      { key: 'ci_claim', title: 'Debitur Klaim Sakit Kritis', valueLabel: 'Jumlah' },
      { key: 'wp_claim', title: 'Debitur Klaim Gagal Bayar', valueLabel: 'Jumlah' },
      { key: 'incurred_claim', title: 'Total Nilai Klaim Terjadi', valueLabel: 'Total (IDR)', money: true },
      { key: 'paid_claim', title: 'Total Nilai Klaim Dibayar', valueLabel: 'Total (IDR)', money: true },
      { key: 'proccess_claim', title: 'Total Nilai Klaim Diproses', valueLabel: 'Total (IDR)', money: true },
    ],
  },
  'top-ten-criteria-lapses': {
    title: 'Top 10 Debitur Lapses',
    endpoint: 'dashboard/top-ten/branch-restitute',
    sections: [
      { key: 'count_restitute_total', title: 'Debitur Lapses', valueLabel: 'Jumlah' },
      { key: 'count_lapse_restitute', title: 'Debitur Lapses Tanpa Top Up', valueLabel: 'Jumlah' },
      { key: 'count_topup_restitute', title: 'Debitur Lapses Dengan Top Up', valueLabel: 'Jumlah' },
      { key: 'sum_lapse_restitute', title: 'Total Nilai Refund Premi - Lapse Tanpa Top Up', valueLabel: 'Total (IDR)', money: true },
      { key: 'sum_topup_restitute', title: 'Total Nilai Refund Premi - Lapse Dengan Top Up', valueLabel: 'Total (IDR)', money: true },
    ],
  },
  'top-ten-criteria-klaim-value': {
    title: 'Top 10 Nilai Klaim',
    endpoint: 'dashboard/top-ten/debitur-claim',
    sections: [
      { key: 'claim_submitted', title: 'Klaim Diajukan', valueLabel: 'Nilai Klaim (IDR)', money: true },
      { key: 'claim_paid', title: 'Klaim Dibayarkan', valueLabel: 'Nilai Klaim (IDR)', money: true },
      { key: 'claim_submitted_proccess', title: 'Klaim Diproses', valueLabel: 'Nilai Klaim (IDR)', money: true },
      { key: 'early_claim_submitted', title: 'Klaim Meninggal Dunia Dibawah 12 Tahun', valueLabel: 'Nilai Klaim (IDR)', money: true },
    ],
  },
  'top-ten-criteria-premi-value': {
    title: 'Top 10 Nilai Premi',
    endpoint: 'dashboard/top-ten/debitur-acceptance',
    sections: [
      { key: 'total_premium', title: 'Nilai Premi Bruto', valueLabel: 'Nilai Premi (IDR)', money: true },
      { key: 'sum_insured', title: 'Nilai Uang Pertanggungan (UP)', valueLabel: 'Nilai UP (IDR)', money: true },
      { key: 'extra_premium_rate', title: 'Nilai Ekstra Mortalita (EM)', valueLabel: 'EM', percent: true },
    ],
  },
}

const config = computed(() => configs[route.name] || configs['top-ten-criteria'])
const loading = ref(false)
const rows = ref({})
const counts = ref({})
const branchCount = ref(0)
const currentStart = ref(0)
const totalRecords = ref(0)
const search = ref('')
const memberId = ref(null)
const brokerId = ref(null)
const insuranceId = ref(null)
const reinsuranceId = ref(null)
const retrocessionId = ref(null)
const productId = ref(null)
const memberOptions = ref([])
const brokerOptions = ref([])
const insuranceOptions = ref([])
const reinsuranceOptions = ref([])
const retrocessionOptions = ref([])
const productOptions = ref([])
const startDate = ref(DASHBOARD_START_DATE)
const endDate = ref(DASHBOARD_END_DATE)
const period = ref(null)

const periodOptions = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Bulan Ini', value: 'this_month' },
  { label: 'Bulan Lalu', value: 'last_month' },
  { label: 'Lainnya', value: 'custom' },
]

const currentPage = computed(() => Math.floor(currentStart.value / 10) + 1)
const maxPage = computed(() => Math.max(1, Math.ceil((totalRecords.value || 0) / 10)))

function formatValue(value, section) {
  if (section.money) return rupiah(value)
  if (section.percent) return `${formatNumber(value)}%`
  return formatNumber(value)
}

function tableRows(section) {
  return rows.value[section.key] || []
}

function sectionCount(section) {
  const value = counts.value[section.key]
  return formatValue(value, section)
}

function applyPeriod(value) {
  if (!value || value === 'custom') return
  const now = moment()
  if (value === 'today') {
    startDate.value = now.format('YYYY-MM-DD')
    endDate.value = now.format('YYYY-MM-DD')
  } else if (value === 'this_month') {
    startDate.value = now.clone().startOf('month').format('YYYY-MM-DD')
    endDate.value = now.format('YYYY-MM-DD')
  } else if (value === 'last_month') {
    startDate.value = now.clone().subtract(1, 'month').startOf('month').format('YYYY-MM-DD')
    endDate.value = now.clone().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
  }
  loadData(0)
}

async function loadFilterOptions() {
  const partnerId = session.partnerId
  const data = await getDashboardFilterSelection(partnerId)
  memberOptions.value = data.member || []
  brokerOptions.value = data.broker || []
  insuranceOptions.value = data.insurance_company || []
  reinsuranceOptions.value = data.reassurance || []
  retrocessionOptions.value = data.retrosesi || []
  productOptions.value = data.product || []
}

async function loadData(start = currentStart.value) {
  loading.value = true
  try {
    const scope = await dashboardScopeParams()
    const params = {
      ...scope,
      start_date: startDate.value,
      end_date: endDate.value,
      search: search.value,
      length: 10,
      start,
    }
    if (memberId.value) params.member_id = memberId.value
    if (brokerId.value) params.broker_id = brokerId.value
    if (insuranceId.value) params.insurance_company_id = insuranceId.value
    if (reinsuranceId.value) params.reassurance_id = reinsuranceId.value
    if (retrocessionId.value) params.retrosesi_id = retrocessionId.value
    if (productId.value) params.product_id = productId.value

    const res = await getTopTenCriteria(config.value.endpoint, params)
    const data = res.data
    const nextRows = {}
    const nextCounts = {}
    config.value.sections.forEach((section) => {
      nextRows[section.key] = data?.[section.key]?.branch || []
      nextCounts[section.key] = data?.[section.key]?.count || 0
    })
    rows.value = nextRows
    counts.value = nextCounts
    branchCount.value = data.total_branch || 0
    totalRecords.value = res.filter.recordsTotal || res.filter.recordsFiltered || branchCount.value || 0
    currentStart.value = start
  } finally {
    loading.value = false
  }
}

function nextPage() {
  if (currentPage.value < maxPage.value) loadData(currentStart.value + 10)
}

function previousPage() {
  if (currentStart.value > 0) loadData(Math.max(0, currentStart.value - 10))
}

function resetFilter() {
  memberId.value = null
  brokerId.value = null
  insuranceId.value = null
  reinsuranceId.value = null
  retrocessionId.value = null
  productId.value = null
  period.value = null
  search.value = ''
  startDate.value = DASHBOARD_START_DATE
  endDate.value = DASHBOARD_END_DATE
  loadData(0)
}

watch(() => route.name, () => loadData(0))

onMounted(async () => {
  await loadFilterOptions()
  await loadData(0)
})
</script>

<template>
  <div>
    <PageHeader title="Top 10 Criteria" subtitle="Dashboard ranking cabang berdasarkan kriteria produksi, klaim, restitusi, dan nilai premi." />

    <div class="dashboard-strip">
      <button
        v-for="tab in tabs"
        :key="tab.route"
        type="button"
        class="dashboard-strip-item"
        :class="{ active: route.name === tab.route }"
        @click="router.push({ name: tab.route })"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ config.title }}</h2>
        <p class="text-sm text-slate-500">{{ formatNumber(branchCount) }} cabang dalam hasil.</p>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <BaseSelect v-model="memberId" :options="memberOptions" option-label="member_name" option-value="member_id" placeholder="Semua Cabang" label="Cabang" />
        <BaseSelect v-model="brokerId" :options="brokerOptions" option-label="broker_name" option-value="broker_id" placeholder="Semua Broker" label="Broker" />
        <BaseSelect v-model="insuranceId" :options="insuranceOptions" option-label="insurance_company_name" option-value="insurance_company_id" placeholder="Semua Asuransi" label="Asuransi" />
        <BaseSelect v-model="reinsuranceId" :options="reinsuranceOptions" option-label="reassurance_name" option-value="reassurance_id" placeholder="Semua Reasuransi" label="Reasuransi" />
        <BaseSelect v-model="retrocessionId" :options="retrocessionOptions" option-label="retrosesi_name" option-value="retrosesi_id" placeholder="Semua Retrosesi" label="Retrosesi" />
        <BaseSelect v-model="productId" :options="productOptions" option-label="product_name" option-value="product_id" placeholder="Semua Produk" label="Produk" />
        <BaseSelect v-model="period" :options="periodOptions" option-label="label" option-value="value" placeholder="Pilih Periode" label="Filter Waktu" @update:model-value="applyPeriod" />
        <div>
          <label class="form-label">Dari Tanggal</label>
          <input v-model="startDate" type="date" class="form-input" :disabled="period && period !== 'custom'" />
        </div>
        <div>
          <label class="form-label">Sampai Tanggal</label>
          <input v-model="endDate" type="date" class="form-input" :disabled="period && period !== 'custom'" />
        </div>
        <div class="flex items-end gap-2">
          <button class="btn-primary h-10" :disabled="loading" @click="loadData(0)">Terapkan</button>
          <button class="btn-secondary h-10" :disabled="loading" @click="resetFilter">Reset</button>
        </div>
      </div>
    </div>

    <div class="mt-4 flex max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
      <Search class="h-4 w-4 text-slate-400" />
      <input v-model="search" type="text" class="w-full bg-transparent text-sm outline-none" placeholder="Cari cabang..." @keyup.enter="loadData(0)" />
    </div>

    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card v-for="(section, idx) in config.sections" :key="section.key" no-body class="overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 text-white" :style="{ backgroundColor: colors[idx % colors.length] }">
          <div>
            <div class="font-bold">{{ section.title }}</div>
            <div class="text-xs opacity-90">Total: {{ sectionCount(section) }}</div>
          </div>
        </div>
        <div class="table-wrap border-0">
          <table class="table">
            <thead>
              <tr>
                <th class="w-16">No</th>
                <th>Nama Cabang</th>
                <th class="text-right">{{ section.valueLabel }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in tableRows(section)" :key="`${section.key}-${i}`">
                <td>{{ currentStart + i + 1 }}</td>
                <td class="font-medium text-slate-700 dark:text-slate-200">{{ item.branch_name || item.name || '-' }}</td>
                <td class="text-right">{{ formatValue(item.count_debitur, section) }}</td>
              </tr>
              <tr v-if="!tableRows(section).length">
                <td colspan="3" class="py-8 text-center text-slate-400">Belum ada data.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <div class="mt-5 flex items-center justify-end gap-3">
      <button class="btn-secondary" :disabled="loading || currentStart === 0" @click="previousPage">Sebelumnya</button>
      <span class="text-sm text-slate-500">Halaman {{ currentPage }} / {{ maxPage }}</span>
      <button class="btn-secondary" :disabled="loading || currentPage >= maxPage" @click="nextPage">Berikutnya</button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 0 8px;
}
.dashboard-strip-item {
  white-space: nowrap;
  border-radius: 10px;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: rgb(71 85 105);
  transition: all 0.18s ease;
}
.dashboard-strip-item:hover,
.dashboard-strip-item.active {
  border-color: #10b585;
  background: #10b585;
  color: white;
}
:global(.dark) .dashboard-strip-item {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}
</style>

<script setup>
/**
 * DASHBOARD — PROFIL RISIKO (5 halaman: akseptasi, polis klaim, polis lapses,
 * polis berjalan, loss ratio polis berjalan).
 *
 * DISAMAKAN PERSIS dengan ehd-backoffice (views/dashboard/profil_risiko*.vue):
 * - Strip menu 5 halaman di atas.
 * - Baris tab METRIK (mis. Jumlah Debitur | Nilai Premi Bruto | NERA) — klik
 *   langsung memuat ulang data.
 * - Baris tab STATUS untuk halaman klaim/lapses (di aslinya juga tab, bukan dropdown).
 * - Tombol "Filter" (ikon corong) membuka dropdown berisi HANYA:
 *   Cabang + Filter Waktu (Hari Ini/Bulan Ini/Bulan Lalu/Lainnya) + rentang
 *   tanggal yang muncul saat "Lainnya". (Filter broker/asuransi/reasuransi/
 *   retrosesi/produk di sumber aslinya di-comment — tidak ditampilkan.)
 *   - "Terapkan" menutup dropdown + fetch; "Reset" hanya mengosongkan Cabang.
 *   - Memilih periode langsung fetch; "Lainnya" menunggu rentang tanggal lengkap.
 * - Kartu nilai teal (#2ec4b6) dengan ikon per metrik + gambar pattern kanan.
 * - 9 chart bar (tinggi 400) dalam grid 2 kolom.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { getSession } from '@/lib/auth'
import {
  DASHBOARD_START_DATE,
  DASHBOARD_END_DATE,
  dashboardScopeParams,
  getDashboardFilterSelection,
  getRiskProfile,
} from '@/lib/services/dashboard'
import { formatNumber, rupiah, moment } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { Filter } from 'lucide-vue-next'

useMeta({ title: 'Profil Risiko' })

const route = useRoute()
const router = useRouter()
const session = getSession()

const profileTabs = [
  { label: 'Profil Risiko Akseptasi', route: 'profil-risiko' },
  { label: 'Profil Risiko Polis Klaim', route: 'profil-risiko-polis-klaim' },
  { label: 'Profil Risiko Polis Lapses', route: 'profil-risiko-polis-lapses' },
  { label: 'Profil Risiko Polis Berjalan', route: 'profil-risiko-polis-berjalan' },
  { label: 'Profil Loss Ratio Polis Berjalan', route: 'profil-loss-ratio-polis-berjalan' },
]

const configs = {
  'profil-risiko': {
    title: 'Profil Risiko Akseptasi',
    metrics: [
      { key: 'count', label: 'Jumlah Debitur', endpoint: 'dashboard/risk-profile/insurance/count-debitur', cardTitle: 'Jumlah Debitur', suffix: 'Debitur' },
      { key: 'premium', label: 'Nilai Premi Bruto', endpoint: 'dashboard/risk-profile/insurance/total-premium', cardTitle: 'Total Nilai Premi Bruto', suffix: 'IDR', money: true },
      { key: 'sum', label: 'Nilai Eksposur Risiko Awal (NERA)', endpoint: 'dashboard/risk-profile/insurance/sum-insured', cardTitle: 'Total Nilai Eksposur Risiko Awal (NERA)', suffix: 'IDR', money: true },
    ],
    charts: [
      ['Distribusi Jenis Kelamin', 'sex'],
      ['Distribusi Usia Masuk', 'age'],
      ['Distribusi Uang Pertanggungan (UP)', 'sum_insured'],
      ['Distribusi Pekerjaan', 'occupation'],
      ['Distribusi Masa Asuransi', 'tenor'],
      ['Distribusi Hasil Seleksi Risiko', 'extra_mortality'],
      ['Distribusi Kategori UW', 'underwriting_category'],
      ['Distribusi Keputusan Underwriting', 'underwriting_decision'],
      ['Distribusi Nilai Premi Bruto', 'total_premium'],
    ],
  },
  'profil-risiko-polis-klaim': {
    title: 'Profil Risiko Polis Klaim',
    statusParam: 'claim_status',
    statuses: [
      { label: 'Klaim Dalam Proses', value: 'claim_proccess' },
      { label: 'Klaim Dibayar', value: 'claim_paid' },
      { label: 'Total Klaim Terjadi Belum Dilaporkan', value: 'claim_registered' },
      { label: 'Total Klaim Terjadi Dilaporkan', value: 'claim_reported' },
      { label: 'Total Klaim Terjadi', value: 'claim_ultimate' },
    ],
    metrics: [
      { key: 'count', label: 'Jumlah Debitur Klaim', endpoint: 'dashboard/risk-profile/claim/count-debitur', cardTitle: 'Jumlah Debitur Klaim', suffix: 'Debitur' },
      { key: 'claim', label: 'Nilai Klaim Bruto', endpoint: 'dashboard/risk-profile/claim/claim-submitted', cardTitle: 'Total Nilai Klaim Bruto', suffix: 'IDR', money: true },
    ],
    charts: [
      ['Distribusi Jenis Kelamin', 'sex'],
      ['Distribusi Usia Masuk', 'age'],
      ['Distribusi Uang Pertanggungan (UP)', 'sum_insured'],
      ['Distribusi Pekerjaan', 'occupation'],
      ['Distribusi Masa Asuransi', 'tenor'],
      ['Distribusi Hasil Seleksi Risiko', 'extra_mortality'],
      ['Distribusi Kategori UW', 'underwriting_category'],
      ['Distribusi Penyebab Klaim', 'claim_reasoning'],
      ['Distribusi Jenis Klaim', 'claim_type'],
      ['Distribusi Periode Klaim', 'claim_period'],
      ['Distribusi Nilai Klaim', 'claim_submitted'],
    ],
  },
  'profil-risiko-polis-lapses': {
    title: 'Profil Risiko Polis Lapses',
    statusParam: 'restitute_type',
    statuses: [
      { label: 'Lapses Tanpa Top Up', value: 'lapse' },
      { label: 'Lapses Dengan Top Up', value: 'topup' },
    ],
    metrics: [
      { key: 'count', label: 'Jumlah Debitur Lapses', endpoint: 'dashboard/risk-profile/restitute/count-debitur', cardTitle: 'Jumlah Debitur Lapses', suffix: 'Debitur' },
      { key: 'refund', label: 'Nilai Refund Premi', endpoint: 'dashboard/risk-profile/restitute/total-refund', cardTitle: 'Total Nilai Refund Premi (Restitusi)', suffix: 'IDR', money: true },
      { key: 'additional', label: 'Nilai Tambahan Premi Bruto Top Up', endpoint: 'dashboard/risk-profile/restitute/additional-premium', cardTitle: 'Total Nilai Tambahan Premi Bruto Top Up', suffix: 'IDR', money: true, topupOnly: true },
    ],
    charts: [
      ['Distribusi Jenis Kelamin', 'sex'],
      ['Distribusi Usia Masuk', 'age'],
      ['Distribusi Uang Pertanggungan (UP)', 'sum_insured'],
      ['Distribusi Pekerjaan', 'occupation'],
      ['Distribusi Masa Asuransi', 'tenor'],
      ['Distribusi Hasil Seleksi Risiko', 'extra_mortality'],
      ['Distribusi Kategori UW', 'underwriting_category'],
      ['Distribusi Bulan Berjalan', 'month_into'],
      ['Distribusi Nilai Refund Premi', 'total_restitute_premium'],
    ],
  },
  'profil-risiko-polis-berjalan': {
    title: 'Profil Risiko Polis Berjalan',
    metrics: [
      { key: 'count_debitur', label: 'Jumlah Debitur Berjalan', endpoint: 'dashboard/risk-profile/policy', extra: { policy: 'count_debitur' }, cardTitle: 'Jumlah Debitur Berjalan', suffix: 'Debitur' },
      { key: 'earned_premium', label: 'Earned Premium', endpoint: 'dashboard/risk-profile/policy', extra: { policy: 'earned_premium' }, cardTitle: 'Total Nilai Premi Bruto Berjalan (Earned Premium)', suffix: 'IDR', money: true },
      { key: 'earned_sum_insured', label: 'NERB', endpoint: 'dashboard/risk-profile/policy', extra: { policy: 'earned_sum_insured' }, cardTitle: 'Total Nilai Eksposur Risiko Berjalan (NERB)', suffix: 'IDR', money: true },
      { key: 'unearned_premium', label: 'Unearned Premium Reserve', endpoint: 'dashboard/risk-profile/policy', extra: { policy: 'unearned_premium' }, cardTitle: 'Total Nilai Unearned Premium Reserve', suffix: 'IDR', money: true },
    ],
    charts: [
      ['Distribusi Jenis Kelamin', 'sex'],
      ['Distribusi Usia Masuk', 'age'],
      ['Distribusi Uang Pertanggungan (UP)', 'sum_insured'],
      ['Distribusi Pekerjaan', 'occupation'],
      ['Distribusi Masa Asuransi', 'tenor'],
      ['Distribusi Hasil Seleksi Risiko', 'extra_mortality'],
      ['Distribusi Kategori UW', 'underwriting_category'],
      ['Distribusi Keputusan Underwriting', 'underwriting_decision'],
      ['Distribusi Nilai Premi Bruto', 'total_premium'],
      ['Distribusi Periode Polis', 'policy_period'],
    ],
  },
  'profil-loss-ratio-polis-berjalan': {
    title: 'Profil Loss Ratio Polis Berjalan',
    lossRatio: true,
    metrics: [
      { key: 'reported', label: 'Reported Loss Ratio', endpoint: 'dashboard/risk-profile/loss-ratio', extra: { loss_ratio: 'reported' }, cardTitle: 'Reported Loss Ratio', suffix: 'Debitur' },
      { key: 'ultimate', label: 'Ultimated Loss Ratio', endpoint: 'dashboard/risk-profile/loss-ratio', extra: { loss_ratio: 'ultimate' }, cardTitle: 'Ultimated Loss Ratio', suffix: 'IDR', money: true },
    ],
    charts: [
      ['Distribusi Jenis Kelamin', 'sex'],
      ['Distribusi Usia Masuk', 'age'],
      ['Distribusi Uang Pertanggungan (UP)', 'sum_insured'],
      ['Distribusi Pekerjaan', 'occupation'],
      ['Distribusi Masa Asuransi', 'tenor'],
      ['Distribusi Hasil Seleksi Risiko', 'extra_mortality'],
      ['Distribusi Kategori UW', 'underwriting_category'],
    ],
  },
}

const config = computed(() => configs[route.name] || configs['profil-risiko'])
const selectedMetric = ref('')
const selectedStatus = ref('')
const data = ref({})
const loading = ref(false)

// ---- Filter (dropdown "Filter", persis aslinya: hanya Cabang + Filter Waktu) ----
const showFilter = ref(false)
const filterRef = ref(null)
const memberId = ref(null)
const memberOptions = ref([])
const period = ref(null)
const startDate = ref(DASHBOARD_START_DATE)
const endDate = ref(DASHBOARD_END_DATE)

// Klik di luar hanya menutup panel (tanpa fetch) — sama seperti dropdown Bootstrap asli.
onClickOutside(filterRef, () => (showFilter.value = false))

// Nilai 'lainnya' mengikuti sumber asli.
const periodeOptions = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Bulan Ini', value: 'this_month' },
  { label: 'Bulan Lalu', value: 'last_month' },
  { label: 'Lainnya', value: 'lainnya' },
]

const metricOptions = computed(() => {
  const metrics = config.value.metrics || []
  // Metrik "Top Up" hanya relevan saat status lapses = topup (mengikuti aslinya).
  if (route.name === 'profil-risiko-polis-lapses' && selectedStatus.value === 'lapse') {
    return metrics.filter((m) => !m.topupOnly)
  }
  return metrics
})

const currentMetric = computed(() => metricOptions.value.find((m) => m.key === selectedMetric.value) || metricOptions.value[0])
const statusOptions = computed(() => config.value.statuses || [])

const cardValue = computed(() => {
  const value = data.value.total_debitur
  return currentMetric.value?.money ? rupiah(value) : formatNumber(value)
})

// Ikon kartu mengikuti aslinya: metrik uang -> "Featured icon1.png",
// jumlah debitur -> ikon profil risiko; halaman loss ratio -> ikon loss ratio.
const cardIcon = computed(() => {
  if (config.value.lossRatio) return '/assets/images/loss-ratio-icon-2.png'
  return currentMetric.value?.money
    ? '/assets/images/Featured icon1.png'
    : '/assets/images/profil-risiko-akseptasi-icon.png'
})

function chartData(key) {
  const source = data.value?.[key] || {}
  const labels = source[`${key}_label`] || source.label || source.labels || []
  const values =
    source[`${key}_count`] ||
    source[`${key}_percentage`] ||
    source.count ||
    source.value ||
    source.values ||
    []
  return {
    labels: Array.isArray(labels) ? labels : [],
    values: Array.isArray(values) ? values.map((v) => Number(v) || 0) : [],
  }
}

function chartOptions(key) {
  const c = chartData(key)
  return {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    xaxis: { categories: c.labels },
    colors: ['#10b585'],
    plotOptions: { bar: { borderRadius: 5, columnWidth: '48%' } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#e2e8f0' },
  }
}

function chartSeries(key) {
  return [{ name: 'Jumlah', data: chartData(key).values }]
}

function hasChartData(key) {
  return chartData(key).labels.length > 0
}

/**
 * Periode berubah -> hitung tanggal & langsung fetch (persis watcher aslinya).
 * "Lainnya": kosongkan tanggal & tunggu user memilih rentang lengkap.
 */
watch(period, (value) => {
  if (!value) return
  const now = moment()
  if (value === 'today') {
    startDate.value = now.format('YYYY-MM-DD')
    endDate.value = now.format('YYYY-MM-DD')
    loadData()
  } else if (value === 'this_month') {
    startDate.value = now.clone().startOf('month').format('YYYY-MM-DD')
    endDate.value = now.format('YYYY-MM-DD')
    loadData()
  } else if (value === 'last_month') {
    startDate.value = now.clone().subtract(1, 'month').startOf('month').format('YYYY-MM-DD')
    endDate.value = now.clone().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
    loadData()
  } else if (value === 'lainnya') {
    startDate.value = ''
    endDate.value = ''
  }
})

// Rentang manual ("Lainnya"): fetch begitu kedua tanggal terisi (seperti flatpickr range).
watch([startDate, endDate], () => {
  if (period.value === 'lainnya' && startDate.value && endDate.value) loadData()
})

function resetStateForRoute() {
  selectedMetric.value = config.value.metrics?.[0]?.key || ''
  selectedStatus.value = config.value.statuses?.[0]?.value || ''
  data.value = {}
}

async function loadFilterOptions() {
  const filter = await getDashboardFilterSelection(session.partnerId)
  memberOptions.value = filter.member || []
}

async function loadData() {
  if (!currentMetric.value) return
  loading.value = true
  try {
    const scope = await dashboardScopeParams()
    const params = {
      ...scope,
      ...(currentMetric.value.extra || {}),
    }
    if (startDate.value) params.start_date = startDate.value
    if (endDate.value) params.end_date = endDate.value
    if (memberId.value) params.member_id = memberId.value
    if (config.value.statusParam && selectedStatus.value) params[config.value.statusParam] = selectedStatus.value
    data.value = await getRiskProfile(currentMetric.value.endpoint, params)
  } finally {
    loading.value = false
  }
}

/** "Reset" di dropdown: kosongkan Cabang saja (persis resetFilter('all') pada UI aktif asli). */
function resetDropdownFilter() {
  memberId.value = null
}

/** "Terapkan": tutup dropdown lalu fetch (persis changeShowFilter(false) asli). */
function applyFilter() {
  showFilter.value = false
  loadData()
}

watch(() => route.name, async () => {
  resetStateForRoute()
  await loadData()
})

watch(selectedMetric, () => loadData())
watch(selectedStatus, () => {
  if (!metricOptions.value.some((m) => m.key === selectedMetric.value)) {
    selectedMetric.value = metricOptions.value[0]?.key || ''
  }
  loadData()
})

onMounted(async () => {
  resetStateForRoute()
  await loadFilterOptions()
  await loadData()
})
</script>

<template>
  <div>
    <PageHeader title="Profil Risiko" subtitle="Distribusi profil risiko berdasarkan data akseptasi, klaim, lapse, polis berjalan, dan loss ratio." />

    <!-- Strip 5 halaman profil risiko -->
    <div class="dashboard-strip">
      <button
        v-for="tab in profileTabs"
        :key="tab.route"
        type="button"
        class="dashboard-strip-item"
        :class="{ active: route.name === tab.route }"
        @click="router.push({ name: tab.route })"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="profil-risiko-title mt-4">{{ config.title }}</div>

    <!-- Baris tab metrik (kiri) + tombol Filter (kanan) — persis header aslinya -->
    <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="m in metricOptions"
          :key="m.key"
          type="button"
          class="metric-tab"
          :class="{ active: selectedMetric === m.key }"
          @click="selectedMetric = m.key"
        >
          {{ m.label }}
        </button>
      </div>

      <!-- Tombol Filter + dropdown (Cabang + Filter Waktu) -->
      <div ref="filterRef" class="relative">
        <button type="button" class="filter-trigger" @click="showFilter = !showFilter">
          <Filter class="h-4 w-4" />
          <span>Filter</span>
        </button>

        <transition name="dropdown-pop">
          <div
            v-if="showFilter"
            class="absolute right-0 z-40 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-4 shadow-floating dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="mb-1 flex items-center justify-between">
              <label class="form-label mb-0">Cabang</label>
              <button type="button" class="text-xs font-medium text-primary-500 hover:underline" @click="resetDropdownFilter">
                Reset
              </button>
            </div>
            <BaseSelect
              v-model="memberId"
              :options="memberOptions"
              option-label="member_name"
              option-value="member_id"
              placeholder="Pilih cabang"
            />

            <label class="form-label mb-1 mt-4">Filter Waktu</label>
            <BaseSelect
              v-model="period"
              :options="periodeOptions"
              option-label="label"
              option-value="value"
              placeholder="Pilih periode"
              :searchable="false"
            />

            <!-- Rentang tanggal hanya untuk periode "Lainnya" (persis aslinya) -->
            <div v-if="period === 'lainnya'" class="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label class="form-label">Dari</label>
                <input v-model="startDate" type="date" class="form-input" />
              </div>
              <div>
                <label class="form-label">Sampai</label>
                <input v-model="endDate" type="date" class="form-input" />
              </div>
            </div>

            <div class="mt-5 flex justify-end gap-2">
              <button type="button" class="btn-secondary btn-sm" @click="resetDropdownFilter">Reset</button>
              <button type="button" class="btn-primary btn-sm" @click="applyFilter">Terapkan</button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Baris tab status (halaman klaim & lapses) — di aslinya juga tab -->
    <div v-if="statusOptions.length" class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="s in statusOptions"
        :key="s.value"
        type="button"
        class="metric-tab"
        :class="{ active: selectedStatus === s.value }"
        @click="selectedStatus = s.value"
      >
        {{ s.label }}
      </button>
    </div>

    <!-- Kartu nilai (teal + ikon + pattern) — persis .top-card aslinya -->
    <div class="top-card mt-4">
      <div class="relative z-10 flex items-center gap-3">
        <img :src="cardIcon" alt="" class="h-12 w-12" />
        <div class="text-base font-semibold">{{ currentMetric?.cardTitle }}</div>
      </div>
      <img src="/assets/images/pattren.png" alt="" class="top-card-pattern" />
      <div class="relative z-10 mt-3 text-2xl font-bold">
        {{ cardValue }} <span class="text-base font-semibold opacity-90">{{ currentMetric?.suffix }}</span>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card v-for="[title, key] in config.charts" :key="key" :title="title">
        <apexchart v-if="hasChartData(key)" type="bar" height="400" :options="chartOptions(key)" :series="chartSeries(key)" />
        <p v-else class="py-12 text-center text-sm text-slate-400">Belum ada data.</p>
      </Card>
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
.dashboard-strip-item,
.metric-tab {
  white-space: nowrap;
  border-radius: 8px;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: rgb(71 85 105);
  transition: all 0.18s ease;
}
.metric-tab {
  padding: 7px 11px;
}
.dashboard-strip-item:hover,
.metric-tab:hover {
  border-color: #93c5fd;
  color: #2563eb;
}
.dashboard-strip-item.active,
.metric-tab.active {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
  font-weight: 600;
}
:global(.dark) .dashboard-strip-item,
:global(.dark) .metric-tab {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.profil-risiko-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: rgb(30 41 59);
}
:global(.dark) .profil-risiko-title {
  color: rgb(241 245 249);
}

/* Tombol Filter (ikon corong) seperti aslinya */
.filter-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: white;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: rgb(75 85 99);
  transition: all 0.18s ease;
}
.filter-trigger:hover {
  border-color: #93c5fd;
  color: #2563eb;
}
:global(.dark) .filter-trigger {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

/* Kartu nilai teal dengan pattern kanan — meniru .top-card ehd-backoffice */
.top-card {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  background-color: #2563eb;
  color: white;
  padding: 18px 20px;
}
.top-card-pattern {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  opacity: 0.9;
}

.dropdown-pop-enter-active,
.dropdown-pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.dropdown-pop-enter-from,
.dropdown-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>

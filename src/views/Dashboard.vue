<script setup>
/**
 * DASHBOARD utama (Home) — konten DISAMAKAN PERSIS dengan ehd-backoffice
 * `views/dashboard.vue` (endpoint GET dashboard/main):
 *
 *  1. Tombol "Filter" (dropdown: Cabang + Filter Waktu, pola sama dgn Profil Risiko).
 *  2. Dua kartu besar: Total Polis (Polis) & Total Debitur (Debitur).
 *  3. Total Premi & Total Uang Pertanggungan (IDR).
 *  4. Premi/UP per status: Inforce, Pending, Outstanding, Incomplete (8 kartu).
 *  5. "Status Kepesertaan": Inforce, Pending, Outstanding, Incomplete, Maturity,
 *     Lapse, Top Up/Rollover, Dibatalkan, Ditolak (9 angka).
 *  6. 4 chart: Total Polis Per Gender (donut), Per Keputusan Akseptasi (bar),
 *     Per Produk Bank (donut), Per Tabel Medis (donut).
 *
 * Mapping field respons persis updateDashboardData() aslinya.
 */
import { ref, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { onClickOutside } from "@vueuse/core";
import api from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  DASHBOARD_START_DATE,
  DASHBOARD_END_DATE,
  dashboardScopeParams,
  getDashboardFilterSelection,
} from "@/lib/services/dashboard";
import { formatNumber, moment } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { useMeta } from "@/composables/useMeta";
import PageHeader from "@/components/ui/PageHeader.vue";
import Card from "@/components/ui/Card.vue";
import BaseSelect from "@/components/ui/BaseSelect.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { Filter } from "lucide-vue-next";
import Clock from "/assets/icons/clock.svg";
import Checklist from "/assets/icons/checklist.svg";
import Line from "/assets/icons/line.svg";
import Warning from "/assets/icons/warning.svg";
import PolisLine from "/assets/images/polis-line.svg";
import PolisIcon from "/assets/icons/file.svg";
import DebiturLine from "/assets/images/debitur-line.svg";
import DebiturIcon from "/assets/icons/users.svg";
import PremiLine from "/assets/images/premi-line.svg";
import PremiIcon from "/assets/icons/credit-card.svg";
import UpLine from "/assets/images/up-line.svg";
import UpIcon from "/assets/icons/shield.svg";

useMeta({ title: "Dashboard" });

const ui = useUiStore();
const { isDark } = storeToRefs(ui);
const session = getSession();

const loading = ref(false);
const data = ref({}); // respons dashboard/main

// ---- Filter (dropdown Cabang + Filter Waktu — persis aslinya) ----
const showFilter = ref(false);
const filterRef = ref(null);
const memberId = ref(null);
const memberOptions = ref([]);
const period = ref(null);
const startDate = ref(DASHBOARD_START_DATE); // default asli: 2023-01-01
const endDate = ref(DASHBOARD_END_DATE); //               2030-01-01

onClickOutside(filterRef, () => (showFilter.value = false));

const periodeOptions = [
  { label: "Hari Ini", value: "today" },
  { label: "Bulan Ini", value: "this_month" },
  { label: "Bulan Lalu", value: "last_month" },
  { label: "Lainnya", value: "lainnya" },
];

async function loadDashboard() {
  loading.value = true;
  try {
    const scope = await dashboardScopeParams();
    const params = { ...scope };
    if (startDate.value) params.start_date = startDate.value;
    if (endDate.value) params.end_date = endDate.value;
    if (memberId.value) params.member_id = memberId.value;
    const res = await api.get("dashboard/main", { params });
    data.value = res.data?.data || {};
  } catch {
    data.value = {};
  } finally {
    loading.value = false;
  }
}

// Periode -> hitung tanggal & langsung fetch; "Lainnya" -> isi rentang manual.
watch(period, (value) => {
  if (!value) return;
  const now = moment();
  if (value === "today") {
    startDate.value = now.format("YYYY-MM-DD");
    endDate.value = now.format("YYYY-MM-DD");
    loadDashboard();
  } else if (value === "this_month") {
    startDate.value = now.clone().startOf("month").format("YYYY-MM-DD");
    endDate.value = now.format("YYYY-MM-DD");
    loadDashboard();
  } else if (value === "last_month") {
    startDate.value = now
      .clone()
      .subtract(1, "month")
      .startOf("month")
      .format("YYYY-MM-DD");
    endDate.value = now
      .clone()
      .subtract(1, "month")
      .endOf("month")
      .format("YYYY-MM-DD");
    loadDashboard();
  } else if (value === "lainnya") {
    startDate.value = "";
    endDate.value = "";
  }
});
watch([startDate, endDate], () => {
  if (period.value === "lainnya" && startDate.value && endDate.value)
    loadDashboard();
});

function resetDropdownFilter() {
  memberId.value = null;
}
function applyFilter() {
  showFilter.value = false;
  loadDashboard();
}

onMounted(async () => {
  try {
    const filter = await getDashboardFilterSelection(session.partnerId);
    memberOptions.value = filter.member || [];
  } catch {
    /* opsi cabang gagal dimuat — filter tetap bisa dipakai tanpa cabang */
  }
  await loadDashboard();
});

// ---- Nilai kartu (mapping field persis updateDashboardData asli) ----
const n = (v) => formatNumber(v ?? 0);

// Kartu ringkasan atas (4 kartu identik, beda label/field/satuan) -> dirender via v-for.
// Menambah/mengubah kartu cukup di sini. `key` merujuk field di respons `data`.
const summaryCards = [
  {
    icon: PolisIcon,
    bgFrom: "#1E40AF",
    bgTo: "#3B82F6",
    bgLine: PolisLine,
    label: "Total Polis",
    key: "total_policy",
    unit: "Polis",
  },
  {
    icon: DebiturIcon,
    bgFrom: "#077B26",
    bgTo: "#3BF670",
    bgLine: DebiturLine,
    label: "Total Debitur",
    key: "total_debitur",
    unit: "Debitur",
  },
  {
    icon: PremiIcon,
    bgFrom: "#8E1AB1",
    bgTo: "#D43BF6",
    bgLine: PremiLine,
    label: "Total Premi",
    key: "total_premium",
    unit: "IDR",
  },
  {
    icon: UpIcon,
    bgFrom: "#B13B1A",
    bgTo: "#F66A3B",
    bgLine: UpLine,
    label: "Uang Pertanggungan",
    key: "total_sum_insured",
    unit: "IDR",
  },
];

// Warna aksen strip kiri kartu (persis inline style dashboard asli):
// semua kartu "Premi" teal, semua kartu "UP" biru.
// const ACCENT_PREMI = "#01b7ba";
const ACCENT_UP = "#2374ab";

// Baris premi/UP per status (label, field & warna aksen persis aslinya).
const dataRows = computed(() => {
  const d = data.value;
  const premiFrom = "#F0C9F9";
  const premiTo = "#BC32DB";
  const upFrom = "#FFE8E0";
  const upTo = "#F66A3B";

  return [
    {
      key: "premi",
      title: "Ringkasan Premi",
      unit: "IDR",
      data: [
        {
          label: "Premi Inforce",
          icon: Checklist,
          bgIcon: "#3B82F610",
          value: n(d.total_inforce_total_premium),
          bgFrom: "#E2E8F0",
          bgTo: "#901CB3",
          bgCardFrom: "#FFFFFF",
          bgCardTo: "#F3CEFE80",
          divFrom: premiFrom,
          divTo: premiTo,
        },
        {
          label: "Premi Pending",
          icon: Clock,
          bgIcon: "#F59E0B10",
          value: n(d.total_pending_total_premium),
          bgFrom: "#E2E8F0",
          bgTo: "#901CB3",
          bgCardFrom: "#FFFFFF",
          bgCardTo: "#F3CEFE80",
          divFrom: premiFrom,
          divTo: premiTo,
        },
        {
          label: "Premi Outstanding",
          icon: Warning,
          bgIcon: "#EF444410",
          value: n(d.total_outstanding_total_premium),
          bgFrom: "#E2E8F0",
          bgTo: "#901CB3",
          bgCardFrom: "#FFFFFF",
          bgCardTo: "#F3CEFE80",
          divFrom: premiFrom,
          divTo: premiTo,
        },
        {
          label: "Premi Incomplete",
          icon: Line,
          bgIcon: "#06B6D410",
          value: n(d.total_onreview_total_premium),
          bgFrom: "#E2E8F0",
          bgTo: "#901CB3",
          bgCardFrom: "#FFFFFF",
          bgCardTo: "#F3CEFE80",
          divFrom: premiFrom,
          divTo: premiTo,
        },
      ],
    },
    {
      key: "up",
      title: "Ringkasan Uang Pertanggungan",
      unit: "IDR",
      data: [
        {
          label: "UP Inforce",
          icon: Checklist,
          bgIcon: "#3B82F610",
          value: n(d.total_inforce_sum_insured),
          bgFrom: "#E2E8F0",
          bgTo: "#F66A3B",
          bgCardFrom: "#FFFFFF",
          bgCardTo: "#F3CEFE80",
          divFrom: upFrom,
          divTo: upTo,
        },
        {
          label: "UP Pending",
          icon: Clock,
          bgIcon: "#F59E0B10",
          value: n(d.total_pending_sum_insured),
          bgFrom: "#E2E8F0",
          bgTo: "#F66A3B",
          bgCardFrom: "#FFFFFF",
          bgCardTo: "#F3CEFE80",
          divFrom: upFrom,
          divTo: upTo,
        },
        {
          label: "UP Outstanding",
          icon: Warning,
          bgIcon: "#EF444410",
          value: n(d.total_outstanding_sum_insured),
          bgFrom: "#E2E8F0",
          bgTo: "#F66A3B",
          bgCardFrom: "#FFFFFF",
          bgCardTo: "#F3CEFE80",
          divFrom: upFrom,
          divTo: upTo,
        },
        {
          label: "UP Incomplete",
          icon: Line,
          bgIcon: "#06B6D410",
          value: n(d.total_onreview_sum_insured),
          bgFrom: "#E2E8F0",
          bgTo: "#F66A3B",
          bgCardFrom: "#FFFFFF",
          bgCardTo: "#F3CEFE80",
          divFrom: upFrom,
          divTo: upTo,
        },
      ],
    },
  ];
});

// Status Kepesertaan (urutan, mapping & warna bar atas persis aslinya).
const statusRows = computed(() => {
  const d = data.value;
  return [
    { label: "Inforce", value: n(d.total_inforce), color: "#3B82F6" },
    { label: "Pending", value: n(d.total_pending), color: "#F59E0B" },
    { label: "Outstanding", value: n(d.total_outstanding), color: "#EF4444" },
    { label: "Incomplete", value: n(d.total_onreview), color: "#06B6D4" },
    { label: "Maturity", value: n(d.total_maturity), color: "#8B5CF6" },
    { label: "Lapse", value: n(d.total_lapse), color: "#6366F1" },
    { label: "Top Up/Rollover", value: n(d.total_topup), color: "#06B6D4" },
    { label: "Dibatalkan", value: n(d.total_restitute), color: "#94A3B8" },
    { label: "Ditolak", value: n(d.total_rejected), color: "#E22F4A" },
  ];
});

// ---- Chart (jenis & sumber data persis aslinya) ----
const chartTheme = computed(() => (isDark.value ? "dark" : "light"));
const palette = [
  "#2563eb",
  "#10b585",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
];

function donut(source) {
  const labels = source?.label || [];
  const series = (source?.value || []).map(Number);
  return {
    hasData: labels.length > 0,
    series,
    options: {
      chart: { type: "donut", background: "transparent" },
      labels,
      colors: palette,
      legend: { position: "bottom" },
      dataLabels: { enabled: true },
      theme: { mode: chartTheme.value },
      stroke: { width: 0 },
    },
  };
}

function bar(source) {
  const categories = source?.label || [];
  const series = (source?.value || []).map(Number);
  return {
    hasData: categories.length > 0,
    series: [{ name: "Jumlah", data: series }],
    options: {
      chart: {
        type: "bar",
        background: "transparent",
        toolbar: { show: false },
      },
      xaxis: {
        categories,
        // Label teks di bawah bar disembunyikan (sering miring & terpotong bila
        // nama kategorinya panjang) — diganti legend berwarna di bawah grafik.
        labels: { show: false },
        axisTicks: { show: false },
      },
      // distributed: tiap bar memakai warna sendiri dari palet,
      // sehingga legend menjadi penanda "warna = kategori".
      colors: palette,
      plotOptions: {
        bar: { borderRadius: 5, columnWidth: "48%", distributed: true },
      },
      dataLabels: { enabled: false },
      // Legend penanda warna -> nama kategori; diberi jarak dari grafik
      // (offsetY + itemMargin) tapi tetap di dalam card yang sama.
      legend: {
        show: true,
        position: "bottom",
        horizontalAlign: "center",
        offsetY: 8,
        itemMargin: { horizontal: 12, vertical: 4 },
        markers: { radius: 3 },
      },
      theme: { mode: chartTheme.value },
      yaxis: {
        labels: {
          style: { colors: isDark.value ? "#94a3b8" : "#64748b" },
        },
      },
      grid: {
        show: true,
        borderColor: isDark.value ? "#334155" : "#e2e8f0",
        // Garis grid horizontal (sumbu-Y) DITAMPILKAN supaya tidak polos;
        // garis vertikal (sumbu-X) disembunyikan agar bersih seperti contoh.
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
        padding: { left: 8, right: 8 },
      },
    },
  };
}

const genderChart = computed(() => donut(data.value.gender));
const riskChart = computed(() => bar(data.value.risk_category));
const productChart = computed(() => donut(data.value.product));
const submissionChart = computed(() => donut(data.value.submission_type));
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      subtitle="Ringkasan polis, premi, dan status kepesertaan."
    >
      <!-- Tombol Filter + dropdown (Cabang + Filter Waktu) — persis aslinya -->
      <div ref="filterRef" class="relative">
        <button
          type="button"
          class="btn-secondary"
          @click="showFilter = !showFilter"
        >
          <Filter class="h-4 w-4" />
          <span>Filter</span>
        </button>

        <transition name="dropdown-pop">
          <div
            v-if="showFilter"
            class="absolute right-0 z-40 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-4 shadow-floating dark:border-slate-700 dark:bg-slate-900"
          >
            <div class="mb-1 flex items-center justify-between">
              <label class="form-label mb-0">Cabang</label>
              <button
                type="button"
                class="text-xs font-medium text-primary-600 hover:underline"
                @click="resetDropdownFilter"
              >
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

            <div
              v-if="period === 'lainnya'"
              class="mt-4 grid grid-cols-2 gap-2"
            >
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
              <button
                type="button"
                class="btn-secondary btn-sm"
                @click="resetDropdownFilter"
              >
                Reset
              </button>
              <button
                type="button"
                class="btn-primary btn-sm"
                @click="applyFilter"
              >
                Terapkan
              </button>
            </div>
          </div>
        </transition>
      </div>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-20 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-6">
      <!-- 1. Dua kartu besar: Total Polis & Total Debitur -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="card in summaryCards"
          :key="card.key"
          class="relative flex flex-col justify-between gap-y-8 rounded-xl py-6 px-4"
          :style="{
            backgroundImage: `linear-gradient(to right, ${card.bgFrom} 30%, ${card.bgTo} 150%)`,
          }"
        >
          <div class="absolute inset-0 flex-1 left-0 top-0">
            <img :src="card.bgLine" alt="" srcset="" />
          </div>
          <div
            class="size-9 rounded-md p-2"
            :style="{
              backgroundImage: `linear-gradient(to bottom right, #FFFFFF 40%, ${card.bgTo} 200%)`,
            }"
          >
            <img :src="card.icon" alt="" srcset="" class="w-full h-full" />
          </div>
          <div class="w-full h-auto flex flex-col gap-y-2">
            <div class="relative z-10 text-[16px] font-[700] text-[#FFFFFF]/80">
              {{ card.label }}
            </div>
            <div class="relative z-10 text-[20px] font-[700] text-[#FFFFFF]">
              {{ n(data[card.key]) }}
              <span class="text-sm font-medium text-[#FFFFFF]/50">{{
                card.unit
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Premi/UP per status — strip warna menempel di tepi kiri kartu (persis pola aslinya) -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div
          v-for="group in dataRows"
          :key="group.key"
          class="flex flex-col gap-y-3"
        >
          <h2 class="text-[16px] font-[600] text-[#1E293B] dark:text-slate-100">
            {{ group.title }}
          </h2>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card
              v-for="row in group.data"
              :key="row.label"
              class="relative overflow-hidden"
              :bg-from="row.bgFrom"
              :bg-to="row.bgTo"
              :bg-card-from="row.bgCardFrom"
              :bg-card-to="row.bgCardTo"
            >
              <div
                class="absolute inset-y-2.5 left-0 w-1.5 rounded-r z-10"
                :style="{
                  backgroundImage: `linear-gradient(to right, ${row.divFrom}, ${row.divTo})`,
                }"
              />
              <div
                class="relative w-full h-full pl-4 py-4 gap-x-3 flex flex-row"
              >
                <div
                  class="w-10 h-10 shrink-0 flex justify-center items-center rounded-md p-2.5"
                  :style="{
                    backgroundColor: `${row.bgIcon}`,
                  }"
                >
                  <img
                    :src="row.icon"
                    alt=""
                    srcset=""
                    class="w-full h-full object-cover"
                  />
                </div>
                <div
                  class="w-full h-11 flex flex-col gap-y-1 justify-center items-start"
                >
                  <p
                    class="truncate text-[10px] font-[500] text-[#94A3B8] dark:text-slate-400"
                  >
                    {{ row.label }}
                  </p>
                  <p
                    class="text-[16px] font-[600] text-slate-800 dark:text-slate-100"
                  >
                    {{ row.value }}
                    <span class="text-[12px] font-medium text-slate-400">{{
                      group.unit
                    }}</span>
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <!-- 4. Status Kepesertaan — tiap tile punya bar warna di ATAS (persis pola aslinya) -->
      <Card title="Status Kepesertaan">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          <div
            v-for="s in statusRows"
            :key="s.label"
            class="relative overflow-hidden pt-4 pb-3 px-3 rounded-lg border border-slate-200 text-center dark:border-slate-800"
          >
            <div
              class="w-full h-auto flex flex-col gap-y-2 justify-start items-start"
            >
              <p
                class="text-[24px] font-[700] text-[#1E293B] dark:text-slate-100"
              >
                {{ s.value }}
              </p>
              <p
                class="text-[11px] font-[400] text-[#64748B] dark:text-slate-400"
              >
                {{ s.label }}
              </p>
            </div>
            <div
              class="absolute h-1 w-[85%] left-1/2 bottom-0 -translate-x-1/2 rounded-t-full"
              :style="{ backgroundColor: s.color }"
            />
          </div>
        </div>
      </Card>

      <!-- 5. Empat chart (judul & sumber persis aslinya) -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          class="w-full h-auto border-[2px] rounded-xl flex flex-col gap-y-4 border-[#E2E8F0]"
        >
          <div
            class="w-full h-auto flex justify-start items-center px-4 border-b-[2px] border-[#E2E8F0] py-3"
          >
            <p class="text-[#1E293B] font-[600] text-[14px]">
              Total Polis Per Gender
            </p>
          </div>

          <apexchart
            v-if="genderChart.hasData"
            type="donut"
            height="300"
            :options="genderChart.options"
            :series="genderChart.series"
          />
          <p v-else class="py-12 text-center text-sm text-slate-400">
            Belum ada data.
          </p>
        </div>

        <div
          class="w-full h-auto border-[2px] rounded-xl flex flex-col gap-y-4 border-[#E2E8F0]"
        >
          <div
            class="w-full h-auto flex justify-start items-center px-4 border-b-[2px] border-[#E2E8F0] py-3"
          >
            <p class="text-[#1E293B] font-[600] text-[14px]">
              Total Polis Per Keputusan Akseptasi
            </p>
          </div>

          <apexchart
            v-if="riskChart.hasData"
            type="bar"
            height="300"
            :options="riskChart.options"
            :series="riskChart.series"
          />
          <p v-else class="py-12 text-center text-sm text-slate-400">
            Belum ada data.
          </p>
        </div>

        <div
          class="w-full h-auto border-[2px] rounded-xl flex flex-col gap-y-4 border-[#E2E8F0]"
        >
          <div
            class="w-full h-auto flex justify-start items-center px-4 border-b-[2px] border-[#E2E8F0] py-3"
          >
            <p class="text-[#1E293B] font-[600] text-[14px]">
              Total Polis Per Produk Bank
            </p>
          </div>

          <apexchart
            v-if="productChart.hasData"
            type="donut"
            height="300"
            :options="productChart.options"
            :series="productChart.series"
          />
          <p v-else class="py-12 text-center text-sm text-slate-400">
            Belum ada data.
          </p>
        </div>

        <div
          class="w-full h-auto border-[2px] rounded-xl flex flex-col gap-y-4 border-[#E2E8F0]"
        >
          <div
            class="w-full h-auto flex justify-start items-center px-4 border-b-[2px] border-[#E2E8F0] py-3"
          >
            <p class="text-[#1E293B] font-[600] text-[14px]">
              Total Polis Per Tabel Medis
            </p>
          </div>

          <apexchart
            v-if="submissionChart.hasData"
            type="donut"
            height="300"
            :options="submissionChart.options"
            :series="submissionChart.series"
          />
          <p v-else class="py-12 text-center text-sm text-slate-400">
            Belum ada data.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Kartu besar biru dengan pattern (meniru .top-card ehd-backoffice) */
/* .top-card {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  background-color: #2563eb;
  color: white;
  padding: 18px 20px;
} */

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

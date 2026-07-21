<script setup>
/**
 * DASHBOARD varian CHUBB (user asuransi Chubb, InsuredCompanyId '12').
 * Port dari seleris-credit-cover `views/dashboardChubb.vue`.
 *
 * Perbedaan dengan dashboard lain:
 *  - Muat awal : GET dashboard/main dengan partner_id = bank saat LOGIN
 *    (localStorage "partnerIdSelecteds" — TIDAK ikut berubah saat ganti bank di header).
 *  - Filter    : GET dashboard/chubb/main (+ partner_id kecuali "Semua Bank",
 *    + member_id bila dipilih, + rentang tanggal).
 *  - Isi       : 4 seksi metrik (Debitur/Polis/Premi/UP) x 6 status
 *    (Submission, Inforce, Inforce Before Payment, On Progress, Ditolak, Dibatalkan),
 *    ringkasan status (Maturity/Klaim/Top Up), dan 4 bar chart horizontal
 *    Keputusan Akseptasi (Submission, Inforce, EHD Submission, EHD Inforce).
 */
import { ref, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { onClickOutside } from "@vueuse/core";
import api from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  DASHBOARD_START_DATE,
  DASHBOARD_END_DATE,
  getDashboardFilterSelection,
} from "@/lib/services/dashboard";
import { moment } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { useMeta } from "@/composables/useMeta";
import { chubbBarChart, n } from "./dashboardCharts";
import PageHeader from "@/components/ui/PageHeader.vue";
import Card from "@/components/ui/Card.vue";
import BaseSelect from "@/components/ui/BaseSelect.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { Filter } from "lucide-vue-next";
import MetricIcon from "/assets/icons/clock.svg";

useMeta({ title: "Dashboard" });

const ui = useUiStore();
const { isDark } = storeToRefs(ui);
const session = getSession();

const loading = ref(false);
const data = ref({});

// ---- Filter ----
const showFilter = ref(false);
const filterRef = ref(null);
const bankId = ref(null); // 'all' = Semua Bank (partner_id tidak dikirim)
const bankOptions = ref([]);
const memberId = ref(null);
const memberOptions = ref([]);
const period = ref(null);
const startDate = ref(DASHBOARD_START_DATE);
const endDate = ref(DASHBOARD_END_DATE);

onClickOutside(filterRef, () => (showFilter.value = false));

const periodeOptions = [
  { label: "Hari Ini", value: "today" },
  { label: "Bulan Ini", value: "this_month" },
  { label: "Bulan Lalu", value: "last_month" },
  { label: "Lainnya", value: "lainnya" },
];

const filterAktif = computed(() => {
  const opt = periodeOptions.find((o) => o.value === period.value);
  if (opt && opt.value !== "lainnya") return opt.label;
  if (startDate.value && endDate.value)
    return `${startDate.value} s/d ${endDate.value}`;
  return "Semua Waktu";
});

/** Muat awal: dashboard/main dengan bank saat login (persis aslinya). */
async function loadInitial() {
  loading.value = true;
  try {
    const res = await api.get("dashboard/main", {
      params: {
        start_date: startDate.value || DASHBOARD_START_DATE,
        end_date: endDate.value || DASHBOARD_END_DATE,
        partner_id: session.partnerIdLogin || session.partnerId,
      },
    });
    data.value = res.data?.data || {};
  } catch {
    data.value = {};
  } finally {
    loading.value = false;
  }
}

/** Filter: dashboard/chubb/main. "Semua Bank" -> partner_id tidak dikirim. */
async function loadFiltered() {
  loading.value = true;
  try {
    const params = {
      start_date: startDate.value || DASHBOARD_START_DATE,
      end_date: endDate.value || DASHBOARD_END_DATE,
    };
    const pid =
      bankId.value === null || bankId.value === ""
        ? session.partnerIdLogin || session.partnerId
        : bankId.value;
    if (pid !== "all" && pid !== "" && pid !== null) params.partner_id = pid;
    if (memberId.value) params.member_id = memberId.value;
    const res = await api.get("dashboard/chubb/main", { params });
    data.value = res.data?.data || {};
  } catch {
    data.value = {};
  } finally {
    loading.value = false;
  }
}

async function loadMemberOptions() {
  try {
    const pid =
      bankId.value && bankId.value !== "all"
        ? bankId.value
        : session.partnerIdLogin || session.partnerId;
    const filter = await getDashboardFilterSelection(pid);
    memberOptions.value = filter.member || [];
  } catch {
    memberOptions.value = [];
  }
}

async function bankSelected() {
  memberId.value = null;
  await loadMemberOptions();
  await loadFiltered();
}

watch(period, (value) => {
  if (!value) return;
  const now = moment();
  if (value === "today") {
    startDate.value = now.format("YYYY-MM-DD");
    endDate.value = now.format("YYYY-MM-DD");
    loadFiltered();
  } else if (value === "this_month") {
    startDate.value = now.clone().startOf("month").format("YYYY-MM-DD");
    endDate.value = now.format("YYYY-MM-DD");
    loadFiltered();
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
    loadFiltered();
  } else if (value === "lainnya") {
    startDate.value = "";
    endDate.value = "";
  }
});
watch([startDate, endDate], () => {
  if (period.value === "lainnya" && startDate.value && endDate.value)
    loadFiltered();
});

function applyFilter() {
  showFilter.value = false;
  loadFiltered();
}

onMounted(async () => {
  try {
    const res = await api.get("dashboard/select-bank");
    bankOptions.value = [
      { partner_id: "all", partner_name: "Semua Bank" },
      ...(res.data?.data || []),
    ];
  } catch {
    bankOptions.value = [{ partner_id: "all", partner_name: "Semua Bank" }];
  }
  await loadMemberOptions();
  await loadInitial();
});

// ---- 4 seksi metrik x 6 status (mapping field persis aslinya) ----
const STATUSES = [
  { key: "submission", label: "Submission" },
  { key: "inforce", label: "Inforce" },
  { key: "inforce_before_payment", label: "Inforce Before Payment" },
  { key: "progress", label: "On Progress" },
  { key: "rejected", label: "Ditolak" },
  { key: "canceled", label: "Dibatalkan" },
];

const metricSections = computed(() => {
  const d = data.value;
  return [
    {
      title: "Total Debitur",
      unit: "",
      values: STATUSES.map((s) => n(d[`total_debitur_${s.key}`])),
      theme: {
        bgFrom: "#E2E8F0",
        bgTo: "#2563EB",
        bgCardFrom: "#FFFFFF",
        bgCardTo: "#DBEAFE",
        divFrom: "#BFDBFE",
        divTo: "#3B82F6",
      },
    },
    {
      title: "Total Polis",
      unit: "",
      values: STATUSES.map((s) => n(d[`total_policy_${s.key}`])),
      theme: {
        bgFrom: "#E2E8F0",
        bgTo: "#0891B2",
        bgCardFrom: "#FFFFFF",
        bgCardTo: "#CFFAFE",
        divFrom: "#A5F3FC",
        divTo: "#06B6D4",
      },
    },
    {
      title: "Total Premi",
      unit: "IDR",
      values: STATUSES.map((s) => n(d[`total_premium_${s.key}`])),
      theme: {
        bgFrom: "#E2E8F0",
        bgTo: "#901CB3",
        bgCardFrom: "#FFFFFF",
        bgCardTo: "#F3CEFE",
        divFrom: "#F0C9F9",
        divTo: "#BC32DB",
      },
    },
    {
      title: "Total Uang Pertanggungan",
      unit: "IDR",
      values: STATUSES.map((s) => n(d[`total_up_${s.key}`])),
      theme: {
        bgFrom: "#E2E8F0",
        bgTo: "#F66A3B",
        bgCardFrom: "#FFFFFF",
        bgCardTo: "#FFE8E0",
        divFrom: "#FFE8E0",
        divTo: "#F66A3B",
      },
    },
  ];
});

// Ringkasan status kepesertaan (persis aslinya: Maturity, Klaim, Top Up).
const summaryRows = computed(() => {
  const d = data.value;
  return [
    { label: "Maturity", value: n(d.total_maturity), color: "#8B5CF6" },
    { label: "Klaim", value: n(d.total_claim), color: "#EF4444" },
    { label: "Top Up/Rollover", value: n(d.total_topup), color: "#06B6D4" },
  ];
});

// ---- 4 bar chart horizontal (kategori & field persis aslinya) ----
const FULL_CATEGORIES = [
  "Diterima Standar",
  "Diterima Dengan Lien Clause",
  "Diterima Dengan Extra Premi",
  "Menunggu Keputusan Underwriting",
  "Menunggu Pemeriksaan Kesehatan",
  "Ditolak",
  "Dibatalkan",
];
const INFORCE_CATEGORIES = FULL_CATEGORIES.slice(0, 3);

const akseptasiSubmissionChart = computed(() => {
  const d = data.value;
  return chubbBarChart(
    FULL_CATEGORIES,
    [
      d.total_policy_standard,
      d.total_policy_lien,
      d.total_policy_ep,
      d.total_policy_pending_uw,
      d.total_policy_pending_medical,
      d.total_policy_rejected,
      d.total_policy_canceled,
    ],
    isDark.value,
  );
});
const akseptasiInforceChart = computed(() => {
  const d = data.value;
  return chubbBarChart(
    INFORCE_CATEGORIES,
    [
      d.total_policy_standard_inforce,
      d.total_policy_lien_inforce,
      d.total_policy_ep_inforce,
    ],
    isDark.value,
  );
});
const ehdSubmissionChart = computed(() => {
  const d = data.value;
  return chubbBarChart(
    FULL_CATEGORIES,
    [
      d.total_policy_ehd_standard,
      d.total_policy_ehd_lien,
      d.total_policy_ehd_ep,
      d.total_policy_ehd_pending_uw,
      d.total_policy_ehd_pending_medical,
      d.total_policy_ehd_rejected,
      d.total_policy_ehd_canceled,
    ],
    isDark.value,
  );
});
const ehdInforceChart = computed(() => {
  const d = data.value;
  return chubbBarChart(
    INFORCE_CATEGORIES,
    [
      d.total_policy_ehd_standard_inforce,
      d.total_policy_ehd_lien_inforce,
      d.total_policy_ehd_ep_inforce,
    ],
    isDark.value,
  );
});
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      :subtitle="`Ringkasan polis Chubb per status. Filter aktif: ${filterAktif}`"
    >
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
            <label class="form-label mb-1">Bank</label>
            <BaseSelect
              v-model="bankId"
              :options="bankOptions"
              option-label="partner_name"
              option-value="partner_id"
              placeholder="Pilih bank"
              @update:model-value="bankSelected"
            />

            <label class="form-label mb-1 mt-4">Cabang</label>
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
      <!-- Seluruh varian memakai pola kartu metrik yang sama dengan takaful-backoffice-v1. -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section
          v-for="section in metricSections"
          :key="section.title"
          class="flex flex-col gap-y-3"
        >
          <h2
            class="text-[16px] font-semibold text-[#1E293B] dark:text-slate-100"
          >
            {{ section.title }}
          </h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card
              v-for="(status, i) in STATUSES"
              :key="status.key"
              class="relative overflow-hidden"
              :bg-from="section.theme.bgFrom"
              :bg-to="section.theme.bgTo"
              :bg-card-from="section.theme.bgCardFrom"
              :bg-card-to="section.theme.bgCardTo"
            >
              <div
                class="absolute inset-y-2.5 left-0 z-10 w-1.5 rounded-r"
                :style="{
                  backgroundImage: `linear-gradient(to right, ${section.theme.divFrom}, ${section.theme.divTo})`,
                }"
              />
              <div
                class="relative flex h-full w-full flex-row gap-x-2 py-4 pl-4"
              >
                <div
                  class="flex h-11 w-10 shrink-0 items-center justify-center rounded-md bg-[#3B82F6] p-2"
                >
                  <img
                    :src="MetricIcon"
                    alt=""
                    class="h-full w-full object-cover"
                  />
                </div>
                <div
                  class="flex h-11 min-w-0 flex-1 flex-col items-start justify-center gap-y-1"
                >
                  <p
                    class="w-full truncate text-[12px] font-medium text-[#94A3B8] dark:text-slate-400"
                  >
                    {{ status.label }}
                  </p>
                  <p
                    class="w-full truncate text-base font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ section.values[i] }}
                    <span
                      v-if="section.unit"
                      class="text-xs font-medium text-slate-400"
                      >{{ section.unit }}</span
                    >
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>

      <!-- Ringkasan Status Kepesertaan -->
      <Card title="Ringkasan Status Kepesertaan">
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="s in summaryRows"
            :key="s.label"
            class="relative overflow-hidden rounded-lg border border-slate-200 px-3 pb-3 pt-4 text-center dark:border-slate-800"
          >
            <p class="text-[24px] font-bold text-slate-800 dark:text-slate-100">
              {{ s.value }}
            </p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              {{ s.label }}
            </p>
            <div
              class="absolute bottom-0 left-1/2 h-1 w-[85%] -translate-x-1/2 rounded-t-full"
              :style="{ backgroundColor: s.color }"
            />
          </div>
        </div>
      </Card>

      <!-- Analisis Data Polis: 4 bar chart horizontal -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Total Polis Per Keputusan Akseptasi - Submission">
          <apexchart
            v-if="akseptasiSubmissionChart.hasData"
            type="bar"
            height="300"
            :options="akseptasiSubmissionChart.options"
            :series="akseptasiSubmissionChart.series"
          />
          <p v-else class="py-12 text-center text-sm text-slate-400">
            Belum ada data.
          </p>
        </Card>
        <Card title="Total Polis Per Keputusan Akseptasi - Inforce">
          <apexchart
            v-if="akseptasiInforceChart.hasData"
            type="bar"
            height="300"
            :options="akseptasiInforceChart.options"
            :series="akseptasiInforceChart.series"
          />
          <p v-else class="py-12 text-center text-sm text-slate-400">
            Belum ada data.
          </p>
        </Card>
        <Card title="Total Polis EHD - Submission">
          <apexchart
            v-if="ehdSubmissionChart.hasData"
            type="bar"
            height="300"
            :options="ehdSubmissionChart.options"
            :series="ehdSubmissionChart.series"
          />
          <p v-else class="py-12 text-center text-sm text-slate-400">
            Belum ada data.
          </p>
        </Card>
        <Card title="Total Polis EHD - Inforce">
          <apexchart
            v-if="ehdInforceChart.hasData"
            type="bar"
            height="300"
            :options="ehdInforceChart.options"
            :series="ehdInforceChart.series"
          />
          <p v-else class="py-12 text-center text-sm text-slate-400">
            Belum ada data.
          </p>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

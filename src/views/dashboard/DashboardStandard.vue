<script setup>
/**
 * DASHBOARD varian BANK dan MANAGEMENT (satu komponen, dibedakan lewat prop).
 * Port dari seleris-credit-cover `views/DashboardBank.vue` & `views/dashboardMangement.vue`
 * — keduanya memakai endpoint & mapping data yang sama, bedanya hanya kartu yang tampil:
 *
 *   variant="bank"        (role Bank / Branch Bank / Broker)
 *     - Premi/UP : Inforce, Incomplete, Dibatalkan, Ditolak
 *     - Status   : Inforce, Incomplete, Maturity, Lapse, Top Up/Rollover, Dibatalkan, Ditolak
 *     - Pilihan Bank hanya untuk Broker (role Bank/Branch Bank terkunci ke banknya);
 *       Branch Bank juga terkunci ke cabangnya sendiri (member_id ikut terkirim).
 *
 *   variant="management"  (role Management)
 *     - Premi/UP : Inforce, Pending, Outstanding, Incomplete, Dibatalkan, Ditolak
 *     - Status   : 9 status lengkap
 *     - Bebas memilih Bank.
 *
 * Sumber data: GET dashboard/main (+ start_date, end_date, partner_id, member_id).
 * Kartu "Dibatalkan" memakai field total_cancelled (persis aslinya; ini berbeda
 * dengan dashboard utama yang memakai total_restitute).
 */
import { ref, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { onClickOutside } from "@vueuse/core";
import api from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";
import {
  DASHBOARD_START_DATE,
  DASHBOARD_END_DATE,
  getDashboardFilterSelection,
} from "@/lib/services/dashboard";
import { moment } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { useMeta } from "@/composables/useMeta";
import { donutChart, barChart, n } from "./dashboardCharts";
import PageHeader from "@/components/ui/PageHeader.vue";
import Card from "@/components/ui/Card.vue";
import BaseSelect from "@/components/ui/BaseSelect.vue";
import Spinner from "@/components/ui/Spinner.vue";
import { Filter } from "lucide-vue-next";
import MetricIcon from "/assets/icons/clock.svg";

const props = defineProps({
  variant: { type: String, required: true }, // 'bank' | 'management'
});

useMeta({ title: "Dashboard" });

const ui = useUiStore();
const auth = useAuthStore();
const { isDark } = storeToRefs(ui);
const session = getSession();

const loading = ref(false);
const data = ref({});

// ---- Filter ----
const showFilter = ref(false);
const filterRef = ref(null);
const bankId = ref(null);
const bankOptions = ref([]);
const memberId = ref(null);
const memberOptions = ref([]);
const period = ref(null);
const startDate = ref(DASHBOARD_START_DATE);
const endDate = ref(DASHBOARD_END_DATE);
const role = ref("");
const lockedMemberId = ref(null); // Branch Bank: cabang terkunci

onClickOutside(filterRef, () => (showFilter.value = false));

const periodeOptions = [
  { label: "Hari Ini", value: "today" },
  { label: "Bulan Ini", value: "this_month" },
  { label: "Bulan Lalu", value: "last_month" },
  { label: "Lainnya", value: "lainnya" },
];

// Bank/Branch Bank tidak boleh ganti bank; Broker & Management boleh.
const canChooseBank = computed(
  () => !["Bank", "Branch Bank"].includes(role.value),
);
const isBranchBank = computed(() => role.value === "Branch Bank");

// Label ringkas filter waktu yang sedang aktif (meniru "filterAktif" aslinya).
const filterAktif = computed(() => {
  const opt = periodeOptions.find((o) => o.value === period.value);
  if (opt && opt.value !== "lainnya") return opt.label;
  if (startDate.value && endDate.value)
    return `${startDate.value} s/d ${endDate.value}`;
  return "Semua Waktu";
});

function activePartnerId() {
  if (canChooseBank.value && bankId.value !== null && bankId.value !== "")
    return bankId.value;
  return session.partnerId;
}

async function loadDashboard() {
  loading.value = true;
  try {
    const params = {
      start_date: startDate.value || DASHBOARD_START_DATE,
      end_date: endDate.value || DASHBOARD_END_DATE,
      partner_id: activePartnerId(),
    };
    const member = lockedMemberId.value || memberId.value;
    if (member) params.member_id = member;
    const res = await api.get("dashboard/main", { params });
    data.value = res.data?.data || {};
  } catch {
    data.value = {};
  } finally {
    loading.value = false;
  }
}

async function loadMemberOptions() {
  try {
    const filter = await getDashboardFilterSelection(activePartnerId());
    memberOptions.value = filter.member || [];
  } catch {
    memberOptions.value = [];
  }
}

// Ganti bank -> reset cabang & muat ulang opsi cabang + data.
async function bankSelected() {
  memberId.value = null;
  await loadMemberOptions();
  await loadDashboard();
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
  if (!isBranchBank.value) memberId.value = null;
}
function applyFilter() {
  showFilter.value = false;
  loadDashboard();
}

onMounted(async () => {
  const user = auth.user || (await auth.fetchUser()) || {};
  role.value = user.role || session.role || "";

  // Branch Bank: cabang terkunci ke cabang miliknya (persis aslinya).
  if (role.value === "Branch Bank" && user.member_id) {
    lockedMemberId.value = user.member_id;
  }

  // Opsi bank hanya dimuat untuk role yang boleh memilih bank.
  if (canChooseBank.value) {
    try {
      const res = await api.get("dashboard/select-bank");
      bankOptions.value = res.data?.data || [];
      // Pilih bank aktif dari sesi bila ada di daftar.
      const current = bankOptions.value.find(
        (b) => String(b.partner_id) === String(session.partnerId),
      );
      if (current) bankId.value = current.partner_id;
    } catch {
      bankOptions.value = [];
    }
  }

  await loadMemberOptions();
  await loadDashboard();
});

// ---- Kartu Premi/UP per varian ----
const PREMI_CARD_THEME = {
  bgFrom: "#E2E8F0",
  bgTo: "#901CB3",
  bgCardFrom: "#FFFFFF",
  bgCardTo: "#F3CEFE",
  divFrom: "#F0C9F9",
  divTo: "#BC32DB",
};

const UP_CARD_THEME = {
  bgFrom: "#E2E8F0",
  bgTo: "#F66A3B",
  bgCardFrom: "#FFFFFF",
  bgCardTo: "#FFE8E0",
  divFrom: "#FFE8E0",
  divTo: "#F66A3B",
};

const premiRows = computed(() => {
  const d = data.value;
  const rows = [
    { label: "Total Premi Inforce", value: n(d.total_inforce_total_premium) },
  ];
  if (props.variant === "management") {
    rows.push(
      { label: "Total Premi Pending", value: n(d.total_pending_total_premium) },
      {
        label: "Total Premi Outstanding",
        value: n(d.total_outstanding_total_premium),
      },
    );
  }
  rows.push(
    {
      label: "Total Premi Incomplete",
      value: n(d.total_onreview_total_premium),
    },
    {
      label: "Total Premi Dibatalkan",
      value: n(d.total_cancelled_total_premium),
    },
    { label: "Total Premi Ditolak", value: n(d.total_rejected_total_premium) },
  );
  return rows.map((row) => ({ ...row, ...PREMI_CARD_THEME }));
});

const upRows = computed(() => {
  const d = data.value;
  const rows = [
    { label: "Total UP Inforce", value: n(d.total_inforce_sum_insured) },
  ];
  if (props.variant === "management") {
    rows.push(
      { label: "Total UP Pending", value: n(d.total_pending_sum_insured) },
      {
        label: "Total UP Outstanding",
        value: n(d.total_outstanding_sum_insured),
      },
    );
  }
  rows.push(
    { label: "Total UP Incomplete", value: n(d.total_onreview_sum_insured) },
    { label: "Total UP Dibatalkan", value: n(d.total_cancelled_sum_insured) },
    { label: "Total UP Ditolak", value: n(d.total_rejected_sum_insured) },
  );
  return rows.map((row) => ({ ...row, ...UP_CARD_THEME }));
});

// ---- Status Kepesertaan per varian ("Dibatalkan" = total_cancelled) ----
const statusRows = computed(() => {
  const d = data.value;
  const rows = [
    { label: "Inforce", value: n(d.total_inforce), color: "#3B82F6" },
  ];
  if (props.variant === "management") {
    rows.push(
      { label: "Pending", value: n(d.total_pending), color: "#F59E0B" },
      { label: "Outstanding", value: n(d.total_outstanding), color: "#EF4444" },
    );
  }
  rows.push(
    { label: "Incomplete", value: n(d.total_onreview), color: "#06B6D4" },
    { label: "Maturity", value: n(d.total_maturity), color: "#8B5CF6" },
    { label: "Lapse", value: n(d.total_lapse), color: "#6366F1" },
    { label: "Top Up/Rollover", value: n(d.total_topup), color: "#06B6D4" },
    { label: "Dibatalkan", value: n(d.total_cancelled), color: "#94A3B8" },
    { label: "Ditolak", value: n(d.total_rejected), color: "#E22F4A" },
  );
  return rows;
});

// ---- Chart (sama dengan dashboard utama) ----
const genderChart = computed(() => donutChart(data.value.gender, isDark.value));
const riskChart = computed(() =>
  barChart(data.value.risk_category, isDark.value),
);
const productChart = computed(() =>
  donutChart(data.value.product, isDark.value),
);
const submissionChart = computed(() =>
  donutChart(data.value.submission_type, isDark.value),
);
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      :subtitle="`Ringkasan polis, premi, dan status kepesertaan. Filter aktif: ${filterAktif}`"
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
            <template v-if="canChooseBank">
              <label class="form-label mb-1">Bank</label>
              <BaseSelect
                v-model="bankId"
                :options="bankOptions"
                option-label="partner_name"
                option-value="partner_id"
                placeholder="Pilih bank"
                @update:model-value="bankSelected"
              />
            </template>

            <div class="mb-1 mt-4 flex items-center justify-between">
              <label class="form-label mb-0">Cabang</label>
              <button
                v-if="!isBranchBank"
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
              :disabled="isBranchBank"
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
      <!-- Ringkasan utama mengikuti komposisi empat kartu takaful-backoffice-v1. -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="top-card">
          <div class="relative z-10 text-[13px] font-medium opacity-90">
            Total Polis
          </div>
          <div class="relative z-10 text-2xl font-semibold">
            {{ n(data.total_policy) }}
            <span class="text-sm font-medium opacity-80">Polis</span>
          </div>
        </div>
        <div class="top-card">
          <div class="relative z-10 text-[13px] font-medium opacity-90">
            Total Debitur
          </div>
          <div class="relative z-10 text-2xl font-semibold">
            {{ n(data.total_debitur) }}
            <span class="text-sm font-medium opacity-80">Debitur</span>
          </div>
        </div>
        <div class="top-card">
          <div class="relative z-10 text-[13px] font-medium opacity-90">
            Total Premi
          </div>
          <div class="relative z-10 truncate text-2xl font-semibold">
            {{ n(data.total_premium) }}
            <span class="text-sm font-medium opacity-80">IDR</span>
          </div>
        </div>
        <div class="top-card">
          <div class="relative z-10 text-[13px] font-medium opacity-90">
            Total Uang Pertanggungan
          </div>
          <div class="relative z-10 truncate text-2xl font-semibold">
            {{ n(data.total_sum_insured) }}
            <span class="text-sm font-medium opacity-80">IDR</span>
          </div>
        </div>
      </div>

      <!-- Premi & UP per status -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div class="flex flex-col gap-y-3">
          <h2
            class="text-[16px] font-semibold text-slate-800 dark:text-slate-100"
          >
            Ringkasan Premi
          </h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card
              v-for="row in premiRows"
              :key="row.label"
              class="relative overflow-hidden"
              :bg-from="row.bgFrom"
              :bg-to="row.bgTo"
              :bg-card-from="row.bgCardFrom"
              :bg-card-to="row.bgCardTo"
            >
              <div
                class="absolute inset-y-2.5 left-0 z-10 w-1.5 rounded-r"
                :style="{
                  backgroundImage: `linear-gradient(to right, ${row.divFrom}, ${row.divTo})`,
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
                    {{ row.label }}
                  </p>
                  <p
                    class="w-full truncate text-base font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ row.value }}
                    <span class="text-xs font-medium text-slate-400">IDR</span>
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <div class="flex flex-col gap-y-3">
          <h2
            class="text-[16px] font-semibold text-slate-800 dark:text-slate-100"
          >
            Ringkasan Uang Pertanggungan
          </h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card
              v-for="row in upRows"
              :key="row.label"
              class="relative overflow-hidden"
              :bg-from="row.bgFrom"
              :bg-to="row.bgTo"
              :bg-card-from="row.bgCardFrom"
              :bg-card-to="row.bgCardTo"
            >
              <div
                class="absolute inset-y-2.5 left-0 z-10 w-1.5 rounded-r"
                :style="{
                  backgroundImage: `linear-gradient(to right, ${row.divFrom}, ${row.divTo})`,
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
                    {{ row.label }}
                  </p>
                  <p
                    class="w-full truncate text-base font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {{ row.value }}
                    <span class="text-xs font-medium text-slate-400">IDR</span>
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <!-- Status Kepesertaan -->
      <Card title="Status Kepesertaan">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          <div
            v-for="s in statusRows"
            :key="s.label"
            class="relative overflow-hidden rounded-lg border border-slate-200 px-3 pb-3 pt-4 text-center dark:border-slate-800"
          >
            <div
              class="flex h-auto w-full flex-col items-start justify-start gap-y-2"
            >
              <p
                class="text-[24px] font-bold text-slate-800 dark:text-slate-100"
              >
                {{ s.value }}
              </p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                {{ s.label }}
              </p>
            </div>
            <div
              class="absolute bottom-0 left-1/2 h-1 w-[85%] -translate-x-1/2 rounded-t-full"
              :style="{ backgroundColor: s.color }"
            />
          </div>
        </div>
      </Card>

      <!-- 4 chart -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Total Polis Per Gender">
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
        </Card>
        <Card title="Total Polis Per Keputusan Akseptasi">
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
        </Card>
        <Card title="Total Polis Per Produk Bank">
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
        </Card>
        <Card title="Total Polis Per Tabel Medis">
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
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-card {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  background-color: #2563eb;
  color: white;
  padding: 18px 20px;
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

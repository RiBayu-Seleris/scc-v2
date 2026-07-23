<script setup>
/**
 * HALAMAN DAFTAR PENUTUPAN.
 *
 * Di SCC, Penutupan terdiri dari banyak file list-data yang mirip,
 * tetapi tidak identik: route tab berbeda, filter API berbeda, beberapa kolom
 * berubah sesuai partner, dan Debit Note punya aksi konfirmasi pendebitan.
 *
 * Komponen ini tetap reusable, tetapi `view` menentukan konfigurasi persis:
 * filter `submission/list`, grup tab, kolom, dan aksi khusus.
 */
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  submissionListFetcher,
  confirmSubmissionDebet,
} from "@/lib/services/submission";
import { TAKAFUL_INSURANCE_COMPANY_ID, isTakaful } from "@/config/insuranceMenus";
import { getSession } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import { useMeta } from "@/composables/useMeta";
import PageHeader from "@/components/ui/PageHeader.vue";
import Card from "@/components/ui/Card.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Badge from "@/components/ui/Badge.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import { CheckCircle2, Eye } from "lucide-vue-next";

const props = defineProps({
  // Nama view internal, mis. 'pengajuan-non-medis', 'debit-note'.
  view: { type: String, default: "" },
  // Kompatibilitas route lama yang masih mengirim props manual.
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  filter: { type: Object, default: null },
  detailRoute: { type: String, default: "detail-debitur" },
});

const router = useRouter();
const route = useRoute();
const session = getSession();
const partnerId = Number(session.partnerId || 0);

const selectedIds = ref([]);
const tableRef = ref(null);
const confirming = ref(false);

// Tab PERSIS pengajuan_non_medis.vue asli: "Otomatis" di-comment (tidak ada),
// label memakai kata "Pengajuan ...".
const penutupanTabs = [
  { label: "Pengajuan HD", route: "list-data-pengajuan-ehd" },
  { label: "Pengajuan Non Medis", route: "list-data-pengajuan-non-medis" },
  { label: "Pengajuan Medis", route: "list-data-pengajuan-medis" },
  { label: "Pengajuan Lengkap", route: "list-data-pengajuan-lengkap" },
  { label: "Pengajuan Ditolak", route: "list-data-pengajuan-ditolak" },
];

const underwritingTabs = [
  { label: "Otomatis", route: "list-data-underwriting" },
  { label: "Non Medis", route: "list-data-underwriting-non-medis" },
  { label: "Medis", route: "list-data-underwriting-medis" },
];

const keputusanTabs = [
  { label: "Diterima", route: "list-data-keputusan" },
  { label: "Ditolak", route: "list-data-keputusan-ditolak" },
  { label: "Ditunda", route: "list-data-keputusan-ditunda" },
];

const statusTabs = [
  { label: "Inforce", route: "list-pengajuan-inforce" },
  { label: "Pending", route: "list-pengajuan-pending" },
  { label: "Outstanding", route: "list-pengajuan-outstanding" },
  { label: "Incomplete", route: "list-data-pengajuan-lengkap" },
  { label: "Dibatalkan", route: "list-pembatalan" },
  { label: "Ditolak", route: "list-pengajuan-ditolak" },
];

const coverNoteTabs = [
  { label: "Sudah Bayar", route: "list-cover-note" },
  { label: "Belum Bayar", route: "list-cover-note-belum-bayar" },
];

const debitNoteTabs = [
  { label: "Belum Dikonfirmasi", route: "list-debit-note" },
  { label: "Sudah Dikonfirmasi", route: "list-debit-note-sudah-dikonfirmasi" },
];

const pembatalanTabs = [
  { label: "Pengajuan Dibatalkan", route: "list-pembatalan" },
  {
    label: "Pembatalan Nomor Sertifikat",
    route: "list-pembatalan-nomor-sertifikat",
  },
];

const takafulPengajuanTabs = [
  { label: "Pengajuan Lengkap", route: "takaful-pengajuan-lengkap" },
  {
    label: "Pengajuan Belum Lengkap",
    route: "takaful-pengajuan-belum-lengkap",
  },
];

const takafulKeputusanTabs = [
  { label: "Keputusan Diterima", route: "takaful-keputusan-diterima" },
  { label: "Keputusan Ditolak", route: "takaful-keputusan-ditolak" },
];

const viewConfigs = {
  "pengajuan-otomatis": {
    title: "List Pengajuan",
    filter: { submission: "fcl" },
    group: "pengajuan",
    columns: "pengajuan-otomatis",
  },
  "pengajuan-ehd": {
    title: "List Pengajuan",
    filter: { acceptance: "onreview", submission: "ehd" },
    group: "pengajuan",
    columns: "pengajuan",
  },
  "pengajuan-non-medis": {
    title: "List Pengajuan",
    filter: { acceptance: "onreview", submission: "non-medis" },
    group: "pengajuan",
    columns: "pengajuan",
  },
  "pengajuan-medis": {
    title: "List Pengajuan",
    filter: { acceptance: "onreview", submission: "medis" },
    group: "pengajuan",
    columns: "pengajuan",
  },
  "pengajuan-lengkap": {
    title: "List Pengajuan Belum Lengkap",
    filter: { acceptance: "unrisked" },
    group: "pengajuan",
    columns: "pengajuan",
  },
  "pengajuan-ditolak": {
    title: "List Pengajuan Ditolak",
    filter: { acceptance: "rejected" },
    group: "pengajuan",
    columns: "pengajuan",
  },

  // Takaful memakai submission/list yang sama; ID asuransi berasal dari config
  // supaya penambahan cabang perusahaan lain tidak memerlukan komponen baru.
  "takaful-pengajuan-lengkap": {
    title: "List Pengajuan",
    filter: {
      insurance_company_id: TAKAFUL_INSURANCE_COMPANY_ID,
      acceptance: "onreview",
    },
    group: "takaful-pengajuan",
    columns: "pengajuan",
  },
  "takaful-pengajuan-belum-lengkap": {
    title: "List Pengajuan",
    filter: {
      insurance_company_id: TAKAFUL_INSURANCE_COMPANY_ID,
      acceptance: "unrisked",
    },
    group: "takaful-pengajuan",
    columns: "pengajuan",
  },
  "takaful-keputusan-diterima": {
    title: "List Keputusan",
    filter: {
      insurance_company_id: TAKAFUL_INSURANCE_COMPANY_ID,
      acceptance: "accepted",
    },
    group: "takaful-keputusan",
    columns: "pengajuan",
  },
  "takaful-keputusan-ditolak": {
    title: "List Keputusan",
    filter: {
      insurance_company_id: TAKAFUL_INSURANCE_COMPANY_ID,
      acceptance: "rejected",
    },
    group: "takaful-keputusan",
    columns: "pengajuan",
  },

  underwriting: {
    title: "List Data Underwriting",
    filter: { submission: "fcl" },
    group: "underwriting",
    columns: "underwriting",
    constantStatus: "Menunggu Konfirmasi Broker",
  },
  "underwriting-non-medis": {
    title: "List Data Underwriting",
    filter: { acceptance: "accepted", submission: "non-medis" },
    group: "underwriting",
    columns: "underwriting",
    constantStatus: "Menunggu Konfirmasi Broker",
  },
  "underwriting-medis": {
    title: "List Data Underwriting",
    filter: { acceptance: "accepted", submission: "medis" },
    group: "underwriting",
    columns: "underwriting",
    constantStatus: "Menunggu Konfirmasi Broker",
  },

  keputusan: {
    title: "List Keputusan",
    filter: { acceptance: "accepted" },
    group: "keputusan",
    columns: "keputusan-diterima",
  },
  "keputusan-ditolak": {
    title: "List Keputusan Ditolak",
    filter: { acceptance: "rejected" },
    group: "keputusan",
    columns: "keputusan",
  },
  "keputusan-ditunda": {
    title: "List Keputusan Ditunda",
    filter: { acceptance: "cancelled" },
    group: "keputusan",
    columns: "keputusan",
  },

  // Filter rekonsiliasi hanya dipakai role Management di SCC. Role lain tetap
  // menerima seluruh pengajuan accepted dalam cakupan role masing-masing.
  "pengajuan-inforce": {
    title: "List Pengajuan Inforce",
    filter: { acceptance: "accepted" },
    roleFilters: {
      Management: { already_recon: true, payment_status: "paid_by_recon" },
    },
    group: "status",
    columns: "keputusan-status",
  },
  "pengajuan-pending": {
    title: "List Pengajuan Pending",
    filter: { acceptance: "accepted" },
    roleFilters: {
      Management: { already_recon: true, payment_status: "paid" },
    },
    group: "status",
    columns: "keputusan-status",
  },
  "pengajuan-outstanding": {
    title: "List Pengajuan Outstanding",
    filter: { acceptance: "accepted" },
    roleFilters: { Management: { already_recon: false } },
    group: "status",
    columns: "keputusan-status",
  },
  "pengajuan-dibatalkan": {
    title: "List Pengajuan Dibatalkan",
    filter: { acceptance: "cancelled" },
    group: "pembatalan",
    columns: "pembatalan",
  },
  "pengajuan-ditolak-status": {
    title: "List Pengajuan Ditolak",
    filter: { acceptance: "rejected" },
    group: "status",
    columns: "pengajuan",
  },
  "pembatalan-nomor-sertifikat": {
    title: "Pembatalan Nomor Sertifikat",
    filter: { acceptance: "cancelled" },
    group: "pembatalan",
    columns: "pembatalan-sertifikat",
    constantStatus: "Menunggu Konfirmasi Broker",
  },

  "cover-note": {
    title: "List Cover Note",
    filter: { acceptance: "accepted", payment: "paid" },
    group: "cover-note",
    columns: "cover-note",
  },
  "cover-note-belum-bayar": {
    title: "List Cover Note Belum Bayar",
    filter: { acceptance: "accepted", payment: "unpaid" },
    group: "cover-note",
    columns: "cover-note",
  },
  "debit-note": {
    title: "List Debit Note",
    filter: { acceptance: "accepted", payment: "unpaid" },
    group: "debit-note",
    columns: "debit-note",
    selectable: true,
  },
  "debit-note-sudah-dikonfirmasi": {
    title: "List Debit Note Sudah Dikonfirmasi",
    filter: { acceptance: "accepted", payment: "paid" },
    group: "debit-note",
    columns: "cover-note",
  },
  "dokumen-surat": {
    title: "Dokumen & Surat",
    filter: { acceptance: "accepted", payment: "paid" },
    columns: "dokumen",
  },
};

const config = computed(() => {
  if (props.view && viewConfigs[props.view]) return viewConfigs[props.view];
  return {
    title: props.title || "List Pengajuan",
    filter: props.filter || {},
    columns: "pengajuan",
  };
});

useMeta({ title: () => config.value.title });

const tabs = computed(() => {
  switch (config.value.group) {
    case "pengajuan":
      return penutupanTabs;
    case "underwriting":
      return underwritingTabs;
    case "keputusan":
      return keputusanTabs;
    case "status":
      return statusTabs;
    case "cover-note":
      return coverNoteTabs;
    case "debit-note":
      return debitNoteTabs;
    case "pembatalan":
      return pembatalanTabs;
    case "takaful-pengajuan":
      return takafulPengajuanTabs;
    case "takaful-keputusan":
      return takafulKeputusanTabs;
    default:
      return [];
  }
});

function submissionIdentifier(row) {
  if (partnerId === 26) return row.submission_unique_code;
  return row.submission_number;
}

function automaticSubmissionIdentifier(row) {
  return partnerId === 16 ? row.submission_number : row.contract_number;
}

function submissionIdentifierLabel() {
  if (partnerId === 26) return "Kode Unik Broker";
  if (partnerId === 25) return "Nomor Registrasi";
  return "No. Pengajuan Kredit";
}

function noAkadLabel() {
  if (partnerId === 16) return "Nomor Akad";
  if (partnerId === 31) return "Nomor LD";
  return "";
}

const baseColumns = {
  aksi: { key: "aksi", label: "Aksi", align: "center", width: "84px" },
  broker: {
    key: "insurance_broker",
    label: "Nama Broker",
    hidden: ![26, 27, 28, 29].includes(partnerId),
  },
  broker26: {
    key: "insurance_broker",
    label: "Nama Broker",
    hidden: partnerId !== 26,
  },
  pengajuanNumber: {
    key: "submission_identifier",
    label: submissionIdentifierLabel(),
    formatter: (_, row) => submissionIdentifier(row),
    hidden: partnerId === 31,
  },
  pengajuanNumberAlways: {
    key: "submission_identifier",
    label: submissionIdentifierLabel(),
    formatter: (_, row) => submissionIdentifier(row),
  },
  pengajuanOtomatisNumber: {
    key: "submission_identifier",
    label: "No. Pengajuan Kredit",
    formatter: (_, row) => automaticSubmissionIdentifier(row),
  },
  // Khusus Takaful, kolom ini disebut "Kode Unik TSS"; selain itu "Kode Unik e-HD".
  // Nilai ditampilkan PENUH dalam 1 baris (tanpa dipotong/elipsis); kolom boleh melebar.
  ehd: {
    key: "ehd_number",
    label: isTakaful() ? "Kode Unik TSS" : "Kode Unik e-HD",
  },
  kodeAo: {
    key: "submission_number",
    label: "Kode AO",
    hidden: partnerId !== 26,
  },
  akad: {
    key: "contract_number",
    label: noAkadLabel(),
    hidden: !(partnerId === 16 || partnerId === 31),
  },
  nik: { key: "id_card_number", label: "NIK" },
  identitas: { key: "id_card_number", label: "No. Identitas" },
  member: { key: "member", label: "Nama Cabang" },
  kantor: { key: "member", label: "Nama Kantor" },
  debitur: { key: "debitur_name", label: "Nama Debitur" },
  produk: { key: "product_id", label: "Nama Produk" },
  usia: { key: "age", label: "Usia", formatter: (v) => `${v || 0} Tahun` },
  period: {
    key: "insurance_period",
    label: "Masa Asuransi",
    formatter: (v) => `${v || 0} Bulan`,
  },
  start: { key: "start_date", label: "Mulai Asuransi" },
  end: { key: "end_date", label: "Akhir Asuransi" },
  sum: {
    key: "sum_insured",
    label: "Uang Pertanggungan",
    align: "right",
    formatter: (v) => rupiah(v),
  },
  basic: {
    key: "basic_premium",
    label: "Premi",
    align: "right",
    formatter: (v) => rupiah(v),
  },
  extra: {
    key: "extra_premium",
    label: "Premi EM/EP",
    align: "right",
    formatter: (v) => rupiah(v),
  },
  rate: { key: "extra_premium_rate", label: "EM", formatter: (v) => `${v} %` },
  total: {
    key: "total_premium",
    label: "Total Premi",
    align: "right",
    formatter: (v) => rupiah(v),
  },
  status: { key: "acceptance_status_description", label: "Status" },
  created: { key: "created_at", label: "Tanggal Input" },
};

function columnsFor(type) {
  const pengajuan = [
    baseColumns.aksi,
    baseColumns.broker,
    baseColumns.pengajuanNumber,
    baseColumns.ehd,
    baseColumns.kodeAo,
    baseColumns.nik,
    baseColumns.member,
    baseColumns.debitur,
    baseColumns.produk,
    baseColumns.usia,
    baseColumns.period,
    baseColumns.sum,
    baseColumns.basic,
    baseColumns.extra,
    baseColumns.total,
    baseColumns.status,
    baseColumns.created,
  ];

  const keputusan = [
    baseColumns.aksi,
    baseColumns.broker,
    baseColumns.pengajuanNumber,
    baseColumns.ehd,
    baseColumns.kodeAo,
    baseColumns.akad,
    baseColumns.nik,
    baseColumns.member,
    baseColumns.debitur,
    baseColumns.produk,
    baseColumns.usia,
    baseColumns.period,
    baseColumns.start,
    baseColumns.end,
    baseColumns.sum,
    baseColumns.basic,
    baseColumns.extra,
    baseColumns.status,
    baseColumns.created,
  ];

  if (type === "pengajuan-otomatis") {
    return [
      baseColumns.aksi,
      baseColumns.pengajuanOtomatisNumber,
      baseColumns.identitas,
      baseColumns.member,
      baseColumns.debitur,
      baseColumns.produk,
      baseColumns.usia,
      baseColumns.period,
      baseColumns.sum,
      baseColumns.basic,
      baseColumns.extra,
      baseColumns.total,
      baseColumns.status,
      baseColumns.created,
    ];
  }
  if (type === "underwriting") {
    return [
      baseColumns.aksi,
      baseColumns.broker26,
      baseColumns.pengajuanNumberAlways,
      baseColumns.ehd,
      baseColumns.kodeAo,
      baseColumns.identitas,
      baseColumns.kantor,
      baseColumns.debitur,
      baseColumns.produk,
      baseColumns.usia,
      baseColumns.period,
      baseColumns.start,
      baseColumns.end,
      baseColumns.sum,
      baseColumns.basic,
      baseColumns.extra,
      baseColumns.status,
      baseColumns.created,
    ].filter((c) => !c.hidden);
  }
  if (type === "keputusan") return keputusan.filter((c) => !c.hidden);
  if (type === "keputusan-diterima") {
    return [
      ...keputusan.slice(0, -2),
      baseColumns.rate,
      baseColumns.status,
      baseColumns.created,
    ].filter((c) => !c.hidden);
  }
  if (type === "keputusan-status") {
    return [
      baseColumns.aksi,
      baseColumns.broker26,
      baseColumns.pengajuanNumber,
      baseColumns.ehd,
      baseColumns.kodeAo,
      baseColumns.akad,
      baseColumns.nik,
      baseColumns.member,
      baseColumns.debitur,
      baseColumns.produk,
      baseColumns.usia,
      baseColumns.period,
      baseColumns.start,
      baseColumns.end,
      baseColumns.sum,
      baseColumns.basic,
      baseColumns.extra,
      baseColumns.rate,
      baseColumns.status,
      baseColumns.created,
    ].filter((c) => !c.hidden);
  }
  if (type === "pembatalan") {
    return [
      ...keputusan.slice(0, -2),
      baseColumns.total,
      baseColumns.status,
      baseColumns.created,
    ].filter((c) => !c.hidden);
  }
  if (type === "pembatalan-sertifikat") {
    return [
      baseColumns.aksi,
      { key: "contract_number", label: "No. Akad" },
      baseColumns.identitas,
      baseColumns.kantor,
      baseColumns.debitur,
      baseColumns.produk,
      baseColumns.usia,
      baseColumns.period,
      baseColumns.start,
      baseColumns.end,
      baseColumns.sum,
      baseColumns.basic,
      baseColumns.extra,
      baseColumns.status,
      baseColumns.created,
    ].filter((c) => !c.hidden);
  }
  if (type === "cover-note") {
    return [
      baseColumns.aksi,
      baseColumns.broker26,
      baseColumns.pengajuanNumberAlways,
      baseColumns.ehd,
      baseColumns.kodeAo,
      baseColumns.identitas,
      baseColumns.kantor,
      baseColumns.debitur,
      baseColumns.produk,
      baseColumns.usia,
      baseColumns.period,
      baseColumns.start,
      baseColumns.end,
      baseColumns.sum,
      baseColumns.basic,
      baseColumns.extra,
      baseColumns.status,
      baseColumns.created,
    ].filter((c) => !c.hidden);
  }
  if (type === "dokumen") {
    return [
      baseColumns.aksi,
      baseColumns.broker,
      baseColumns.pengajuanNumber,
      baseColumns.ehd,
      baseColumns.kodeAo,
      baseColumns.akad,
      baseColumns.nik,
      baseColumns.member,
      baseColumns.debitur,
      baseColumns.produk,
      baseColumns.usia,
      baseColumns.period,
      baseColumns.start,
      baseColumns.end,
      baseColumns.sum,
      baseColumns.basic,
      baseColumns.extra,
      baseColumns.status,
      baseColumns.created,
    ].filter((c) => !c.hidden);
  }
  if (type === "debit-note") {
    return [
      { key: "select", label: "", align: "center", width: "48px" },
      baseColumns.aksi,
      baseColumns.pengajuanNumberAlways,
      baseColumns.ehd,
      baseColumns.kodeAo,
      baseColumns.identitas,
      baseColumns.kantor,
      baseColumns.debitur,
      baseColumns.produk,
      baseColumns.usia,
      baseColumns.period,
      baseColumns.start,
      baseColumns.end,
      baseColumns.sum,
      baseColumns.basic,
      baseColumns.extra,
      baseColumns.status,
      baseColumns.created,
    ].filter((c) => !c.hidden);
  }
  return pengajuan.filter((c) => !c.hidden);
}

const columns = computed(() => columnsFor(config.value.columns));
const activeFilter = computed(() => config.value.filter);
const fetcher = computed(() =>
  submissionListFetcher(activeFilter.value, config.value.roleFilters),
);
const tableKey = computed(
  () =>
    `${props.view || route.name}:${JSON.stringify(activeFilter.value)}:${JSON.stringify(config.value.roleFilters || {})}`,
);

watch(tableKey, () => {
  selectedIds.value = [];
});

function openDetail(row) {
  // Semua tabel SCC memeriksa id dan NIK sebelum membuka detail; ini mencegah
  // baris tanpa identitas masuk ke alur detail yang tidak lengkap.
  if (!row?.id || !row.id_card_number) return;
  router.push({ name: props.detailRoute, params: { id: row.id } });
}

function statusVariant(text) {
  const t = (text || "").toLowerCase();
  if (
    t.includes("tolak") ||
    t.includes("reject") ||
    t.includes("batal") ||
    t.includes("cancel")
  )
    return "danger";
  if (
    t.includes("accept") ||
    t.includes("terima") ||
    t.includes("inforce") ||
    t.includes("paid")
  )
    return "success";
  if (
    t.includes("review") ||
    t.includes("pending") ||
    t.includes("tunda") ||
    t.includes("outstanding")
  )
    return "warning";
  return "primary";
}

function displayStatus(value) {
  return config.value.constantStatus || value;
}

function toggleSelected(id, checked) {
  const value = Number(id);
  if (!value) return;
  if (checked && !selectedIds.value.includes(value))
    selectedIds.value.push(value);
  if (!checked)
    selectedIds.value = selectedIds.value.filter((item) => item !== value);
}

function toggleAll(rows, checked) {
  // Select-all SCC hanya bekerja pada baris yang sedang tampil dan selalu
  // mengganti pilihan lama, bukan menambah pilihan dari halaman lain.
  selectedIds.value = checked
    ? rows.map((row) => Number(row.id)).filter(Boolean)
    : [];
}

async function confirmDebet() {
  if (!selectedIds.value.length) return;

  confirming.value = true;
  try {
    await confirmSubmissionDebet(selectedIds.value);
    selectedIds.value = [];
    tableRef.value?.reload();
    window.Swal.fire({
      icon: "success",
      title: "Pendebetan berhasil dikonfirmasi",
      padding: "2em",
    });
  } catch {
    window.Swal.fire({
      icon: "error",
      title: "Terjadi kesalahan saat konfirmasi pendebitan",
      padding: "2em",
    });
  } finally {
    confirming.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      :title="config.title"
      :subtitle="
        subtitle ||
        'Data Penutupan mengikuti filter dan status dari sistem lama.'
      "
    />

    <div v-if="tabs.length" class="mb-4 flex flex-wrap gap-2">
      <router-link
        v-for="tab in tabs"
        :key="tab.route"
        :to="{ name: tab.route }"
        class="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
        :class="
          $route.name === tab.route
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        "
      >
        {{ tab.label }}
      </router-link>
    </div>

    <Card no-body class="py-4">
      <DataTable
        ref="tableRef"
        :key="tableKey"
        :columns="columns"
        server-side
        :fetcher="fetcher"
        search-placeholder="Cari pengajuan, NIK, debitur..."
        empty-message="Belum ada data"
      >
        <template #toolbar>
          <BaseButton
            v-if="config.selectable && selectedIds.length"
            variant="success"
            :loading="confirming"
            @click="confirmDebet"
          >
            <CheckCircle2 class="h-4 w-4" /> Konfirmasi Pendebitan
          </BaseButton>
        </template>

        <template #header-select="{ rows }">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            :checked="
              rows.length > 0 &&
              rows.every((row) => selectedIds.includes(Number(row.id)))
            "
            @change="toggleAll(rows, $event.target.checked)"
          />
        </template>

        <template #cell-select="{ row }">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            :checked="selectedIds.includes(Number(row.id))"
            @change="toggleSelected(row.id, $event.target.checked)"
          />
        </template>

        <template #cell-aksi="{ row }">
          <div class="flex items-center justify-center gap-1.5">
            <button
              class="btn-icon btn-ghost text-primary-500"
              title="Lihat detail"
              @click="openDetail(row)"
            >
              <Eye class="h-5 w-5" />
            </button>
          </div>
        </template>

        <template #cell-acceptance_status_description="{ value }">
          <Badge :variant="statusVariant(displayStatus(value))">{{
            displayStatus(value)
          }}</Badge>
        </template>
      </DataTable>
    </Card>
  </div>
</template>

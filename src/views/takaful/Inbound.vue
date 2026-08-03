<script setup>
import { ref } from "vue";
import { Download } from "lucide-vue-next";
import api from "@/lib/api";
import { moment } from "@/lib/format";
import { safeUrl } from "@/lib/sanitize";
import { useMeta } from "@/composables/useMeta";
import PageHeader from "@/components/ui/PageHeader.vue";
import Card from "@/components/ui/Card.vue";
import DataTable from "@/components/ui/DataTable.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import DateRangePicker from "@/components/ui/DateRangePicker.vue";

useMeta({ title: "Inbound" });

const now = moment();
const rangeStart = ref(now.clone().startOf("month").toDate());
const rangeEnd = ref(now.clone().endOf("day").toDate());
const loading = ref(false);
const rows = ref([]);
const takafulBase = String(import.meta.env.VITE_API_URL || "").replace(
  "seleris-credit-cover",
  "takaful",
);
const columns = [
  { key: "number", label: "No", align: "center" },
  { key: "kode_tss", label: "Kode TSS" },
  { key: "date_time", label: "Date Time" },
  { key: "file_url", label: "Download", align: "center", sortable: false },
];

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: "2em" });
}
function formatApiDate(date) {
  return moment(date).format("DD/MM/YYYY HH:mm:ss");
}
function onRangeApply({ start, end }) {
  rangeStart.value = start;
  rangeEnd.value = end;
}
function rowDateTime(row) {
  if (!row?.start_date && !row?.end_date) return "-";
  const start = row.start_date
    ? moment(row.start_date).format("DD-MM-YYYY HH.mm")
    : "-";
  const end = row.end_date
    ? moment(row.end_date).format("DD-MM-YYYY HH.mm")
    : "-";
  return `${start} - ${end}`;
}
function setRows(data) {
  // Respons endpoint dapat menyertakan riwayat; hanya data nyata dari API yang ditampilkan.
  const history = Array.isArray(data?.inbounds)
    ? data.inbounds
    : Array.isArray(data?.histories)
      ? data.histories
      : [];
  rows.value = history.map((row, index) => ({
    ...row,
    number: index + 1,
    date_time: rowDateTime(row),
  }));
}
async function downloadInbound() {
  if (!rangeStart.value || !rangeEnd.value)
    return alert("error", "Pilih periode terlebih dahulu");
  loading.value = true;
  try {
    const { data } = await api.get(`${takafulBase}document/inbound/excel`, {
      params: {
        start: formatApiDate(rangeStart.value),
        end: formatApiDate(rangeEnd.value),
      },
    });
    setRows(data?.data);
    const inboundUrl = data?.data?.inbound_url;
    if (inboundUrl) window.open(safeUrl(inboundUrl), "_blank", "noopener");
    else alert("info", data?.message || "Data tidak tersedia");
  } catch (error) {
    alert(
      "error",
      error?.response?.data?.message || "Gagal mengunduh data inbound",
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Inbound"
      subtitle="Pilih periode transaksi, lalu unduh datanya dalam format Excel."
    />
    <Card class="p-0">
      <div
        class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <label class="form-label"
            >Periode Transaksi <span class="text-danger">*</span></label
          >
          <DateRangePicker
            :start="rangeStart"
            :end="rangeEnd"
            @apply="onRangeApply"
          />
        </div>
        <BaseButton :loading="loading" @click="downloadInbound"
          ><Download class="h-4 w-4" /> Unduh Excel</BaseButton
        >
      </div>
    </Card>
    <Card no-body class="mt-5 p-4">
      <DataTable
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :searchable="false"
        empty-message="Belum ada data."
      >
        <template #cell-file_url="{ value }"
          ><a
            v-if="value"
            :href="safeUrl(value)"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-600 hover:underline"
            >Unduh</a
          ><span v-else>-</span></template
        >
      </DataTable>
    </Card>
  </div>
</template>

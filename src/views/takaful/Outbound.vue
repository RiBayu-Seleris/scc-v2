<script setup>
import { onMounted, ref } from "vue";
import { Download, Upload } from "lucide-vue-next";
import api from "@/lib/api";
import { moment } from "@/lib/format";
import { safeUrl } from "@/lib/sanitize";
import { useMeta } from "@/composables/useMeta";
import PageHeader from "@/components/ui/PageHeader.vue";
import Card from "@/components/ui/Card.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Modal from "@/components/ui/Modal.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import DateRangePicker from "@/components/ui/DateRangePicker.vue";

useMeta({ title: "Outbound" });

const templateUrl =
  "https://seleris.s3.ap-southeast-1.amazonaws.com/document/file-1785388755191216839-e8dy80.xlsx";
const now = moment();
const rangeStart = ref(
  now.clone().subtract(29, "days").startOf("day").toDate(),
);
const rangeEnd = ref(now.clone().endOf("day").toDate());
const rows = ref([]);
const loading = ref(false);
const showUpload = ref(false);
const selectedFile = ref(null);
const outboundTitle = ref("");
const outboundDescription = ref("");
const uploading = ref(false);
const takafulBase = String(import.meta.env.VITE_API_URL || "").replace(
  "seleris-credit-cover",
  "takaful",
);
const columns = [
  { key: "number", label: "No", align: "center" },
  { key: "outbound_filename", label: "Nama File" },
  { key: "outbound_timestamp", label: "Date Time" },
  { key: "outbound_title", label: "Judul" },
  { key: "outbound_description", label: "Deskripsi", wrap: true },
  { key: "outbound_url", label: "URL", align: "center", sortable: false },
];

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: "2em" });
}
function formatApiDate(date) {
  return moment(date).format("DD/MM/YYYY HH:mm:ss");
}
function formatTimestamp(value) {
  if (!value) return "-";
  const parsed = moment(
    value,
    ["YYYY-MM-DD HH:mm:ss.SSS ZZ", moment.ISO_8601],
    true,
  );
  return parsed.isValid()
    ? parsed.format("DD/MM/YYYY HH:mm:ss")
    : String(value);
}
function onRangeApply({ start, end }) {
  rangeStart.value = start;
  rangeEnd.value = end;
  loadHistory();
}
function resetForm() {
  selectedFile.value = null;
  outboundTitle.value = "";
  outboundDescription.value = "";
}
function onFileChange(event) {
  selectedFile.value = event.target.files?.[0] || null;
}
async function loadHistory() {
  loading.value = true;
  try {
    const { data } = await api.get(
      `${takafulBase}document/outbound/excel/histories`,
      {
        params: {
          start: formatApiDate(rangeStart.value),
          end: formatApiDate(rangeEnd.value),
        },
      },
    );
    const history = Array.isArray(data?.data) ? data.data : [];
    rows.value = history.map((row, index) => ({
      ...row,
      number: index + 1,
      outbound_timestamp: formatTimestamp(row.outbound_timestamp),
    }));
  } catch (error) {
    rows.value = [];
    alert(
      "error",
      error?.response?.data?.message || "Gagal memuat riwayat outbound",
    );
  } finally {
    loading.value = false;
  }
}
async function uploadExcel() {
  if (!outboundTitle.value.trim()) return alert("error", "Judul wajib diisi");
  if (!selectedFile.value)
    return alert("error", "Pilih file Excel terlebih dahulu");
  if (!/\.(xlsx|xls)$/i.test(selectedFile.value.name))
    return alert("error", "Format harus Excel (.xlsx atau .xls)");
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", selectedFile.value);
    // Upload memakai base SCC biasa; hanya registrasi outbound yang menuju service Takaful.
    const upload = await api.post("upload-file", formData);
    const path = upload.data?.status === 200 ? upload.data?.data?.path : null;
    if (!path) throw new Error("URL S3 tidak ditemukan pada response upload");
    const { data } = await api.post(`${takafulBase}document/outbound/excel`, {
      outbound_title: outboundTitle.value,
      outbound_description: outboundDescription.value,
      outbound_url: path,
    });
    if (data?.status && data.status !== 200)
      return alert("error", data?.message || "Gagal mengunggah outbound");
    await window.Swal.fire({
      icon: "success",
      title: data?.message || "Outbound berhasil diunggah",
      padding: "2em",
    });
    showUpload.value = false;
    resetForm();
    await loadHistory();
  } catch (error) {
    alert(
      "error",
      error?.response?.data?.message || "Gagal mengunggah outbound",
    );
  } finally {
    uploading.value = false;
  }
}
onMounted(loadHistory);
</script>

<template>
  <div>
    <PageHeader
      title="Outbound"
      subtitle="Unggah dan pantau riwayat dokumen outbound."
    >
      <BaseButton @click="showUpload = true"
        ><Upload class="h-4 w-4" /> Upload Excel</BaseButton
      >
    </PageHeader>
    <Card class="p-0"
      ><DateRangePicker
        :start="rangeStart"
        :end="rangeEnd"
        @apply="onRangeApply"
      />
      <p class="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Anda dapat mengunduh template excelnya dulu
        <a
          :href="templateUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="font-semibold text-primary-600 hover:underline"
          >Unduh Template</a
        >
      </p></Card
    >
    <Card no-body class="mt-5 p-4">
      <DataTable
        :columns="columns"
        :rows="rows"
        :loading="loading"
        empty-message="Belum ada data."
      >
        <template #cell-outbound_filename="{ row, value }"
          ><a
            v-if="value && row.outbound_url"
            :href="safeUrl(row.outbound_url)"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-primary-600 hover:underline"
            >{{ value }}</a
          ><span v-else>{{ value || "-" }}</span></template
        >
        <template #cell-outbound_url="{ value }"
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
    <Modal
      v-model="showUpload"
      title="Upload Excel"
      @update:model-value="!showUpload && resetForm()"
    >
      <div class="space-y-5">
        <div>
          <label class="form-label"
            >Judul <span class="text-danger">*</span></label
          ><input
            v-model="outboundTitle"
            type="text"
            class="form-input"
            placeholder="Judul dokumen outbound"
          />
        </div>
        <div>
          <label class="form-label">Deskripsi</label
          ><textarea
            v-model="outboundDescription"
            class="form-input"
            rows="3"
            placeholder="Deskripsi (opsional)"
          />
        </div>
        <div>
          <label class="form-label"
            >File Excel <span class="text-danger">*</span></label
          ><input
            type="file"
            class="form-input"
            accept=".xlsx,.xls"
            @change="onFileChange"
          />
          <p class="mt-2 text-xs text-slate-400">
            Format yang didukung: .xlsx, .xls
          </p>
          <p
            v-if="selectedFile"
            class="mt-3 break-all text-sm text-primary-600"
          >
            File dipilih: {{ selectedFile.name }}
          </p>
        </div>
      </div>
      <template #footer
        ><BaseButton variant="secondary" @click="showUpload = false"
          >Batal</BaseButton
        ><BaseButton :loading="uploading" @click="uploadExcel"
          >Upload</BaseButton
        ></template
      >
    </Modal>
  </div>
</template>

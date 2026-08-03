<script setup>
/**
 * DETAIL PENUTUPAN — REVISI DATA.
 * Endpoint sumber:
 * - GET  submission/revision-data/{id}?field_name=...
 * - PUT  submission/revision-data/{id}
 * - GET  submission/revision-data/history/{id}
 * - POST upload-file (opsional dokumen)
 */
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getSession } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";
import { formatDate, formatNumber, parseNumber } from "@/lib/format";
import { safeUrl } from "@/lib/sanitize";
import {
  getSubmissionRevisionField,
  getSubmissionRequiredDocuments,
  submissionRevisionHistoryFetcher,
  updateSubmissionRevision,
} from "@/lib/services/submission";
import { uploadFile } from "@/lib/services/upload";
import { penutupanDetailTabs } from "@/config/detailTabs";
import { useMeta } from "@/composables/useMeta";
import DetailTabsLayout from "@/components/layout/DetailTabsLayout.vue";
import Card from "@/components/ui/Card.vue";
import BaseSelect from "@/components/ui/BaseSelect.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import DataTable from "@/components/ui/DataTable.vue";
import { Download } from "lucide-vue-next";
import SubmissionRequiredDocuments from "@/components/shared/SubmissionRequiredDocuments.vue";

useMeta({ title: "Detail Penutupan — Revisi Data" });

const route = useRoute();
const auth = useAuthStore();
const session = getSession();
const id = route.params.id;

const category = ref(null);
const existingData = ref("");
const revisionData = ref("");
const description = ref("");
const file = ref(null);
const loadingField = ref(false);
const saving = ref(false);
const rawValue = ref("");
const profileReady = ref(false);
const requiredDocuments = ref([]);
const canManage = computed(
  () => !["Reassurance", "Retrosesi"].includes(auth.user?.role || session.role),
);

/**
 * Daftar kategori PERSIS seleris-credit-cover (urutan sama).
 * - key  : field pada respons GET revision-data untuk mengisi "Data Lama".
 *          Kategori tanpa key (null) memang tidak menampilkan data lama di aslinya.
 * - type : jenis input Data Baru — text | date | currency (Rp) | number | digits.
 */
const categoryMap = {
  "No. Akad": { key: "contract_number", type: "text" },
  "No. Rekening": { key: "account_number", type: "digits" },
  Nama: { key: "debitur_name", type: "text" },
  "Jenis Kelamin": { key: "gender", type: "text" },
  NIK: { key: "id_card_number", type: "digits" },
  "Instansi Pekerjaan": { key: "company_name", type: "text" },
  "Detail Pekerjaan": { key: "detail_occupation", type: "text" },
  "Tempat Lahir": { key: "pob", type: "text" },
  Asuransi: { key: null, type: "text" },
  Produk: { key: null, type: "text" },
  Pekerjaan: { key: null, type: "text" },
  "Uang Pertanggungan": { key: "sum_insured", type: "currency" },
  "Baki Debet": { key: null, type: "text" },
  "Tanggal Lahir": { key: "dob", type: "date" },
  "Masa Asuransi": { key: "insurance_period", type: "text" },
  "Mulai Asuransi": { key: "start_date", type: "date" },
  "Kantor Cabang": { key: null, type: "text" },
  "Batal Akseptasi": { key: null, type: "text" },
  Premi: { key: "premium", type: "number" },
  Usia: { key: "age", type: "number" },
  "No. Pengajuan Kredit": { key: "submission_number", type: "text" },
  "Kode Unik Broker": { key: "submission_unique_code", type: "text" },
};

const categoryOptions = Object.keys(categoryMap);
const categoryType = computed(() =>
  category.value ? categoryMap[category.value]?.type || "text" : "",
);
const historyFetcher = submissionRevisionHistoryFetcher(id);

const columns = [
  { key: "aksi", label: "Aksi", align: "center" },
  { key: "field_name", label: "Kategori" },
  { key: "data_before", label: "Data Lama", formatter: formatRevisionValue },
  { key: "data_after", label: "Data Baru", formatter: formatRevisionValue },
  { key: "description", label: "Keterangan" },
  {
    key: "created_at",
    label: "Tanggal Ubah",
    formatter: (v) =>
      formatDate(v, "HH:mm DD-MM-YYYY", "YYYY-MM-DD HH:mm:ss.SSS"),
  },
  { key: "user_name", label: "User Input" },
];

function formatRevisionValue(value, row) {
  if (
    (row?.field_name === "Uang Pertanggungan" ||
      row?.field_name === "Premi" ||
      row?.field_name === "Gaji") &&
    value
  ) {
    return "Rp " + Number(value).toLocaleString("id-ID");
  }
  return value || "-";
}

async function loadCategory() {
  existingData.value = "";
  revisionData.value = "";
  rawValue.value = "";
  if (!category.value) return;
  const meta = categoryMap[category.value];
  // Kategori tanpa key tidak menampilkan data lama (persis aslinya).
  if (!meta?.key) return;
  loadingField.value = true;
  try {
    const res = await getSubmissionRevisionField(id);
    let value = res[meta.key];
    if (meta.type === "currency" && value != null)
      value = "Rp " + Number(value).toLocaleString("id-ID");
    existingData.value = value || "";
  } catch {
    window.Swal.fire({
      icon: "error",
      title: "Terjadi Kesalahan",
      padding: "2em",
    });
  } finally {
    loadingField.value = false;
  }
}

function normalizeCurrency() {
  const n = parseNumber(revisionData.value);
  rawValue.value = n ? String(n) : "";
  revisionData.value = n ? "Rp " + formatNumber(n) : "";
}

function cleanNewValue() {
  if (categoryType.value === "currency") return rawValue.value;
  // SCC mengirim isi input apa adanya; format tanggal tidak boleh diubah karena
  // kontrak endpoint revision-data menerima nilai baru generik.
  return revisionData.value;
}

async function save() {
  if (!canManage.value) return;
  if (!category.value || !revisionData.value) {
    return window.Swal.fire({
      icon: "error",
      text: "Kategori dan data baru wajib diisi",
      padding: "1em",
    });
  }
  saving.value = true;
  try {
    const selectedFile = file.value?.files?.[0];
    // SCC mengizinkan revisi tanpa dokumen dan mengirim document_url null.
    const documentUrl = selectedFile ? await uploadFile(selectedFile) : null;

    await updateSubmissionRevision(id, {
      new_value: cleanNewValue(),
      description: description.value,
      document_url: documentUrl,
      user_id: parseInt(session.userId, 10),
      field_name: category.value,
    });
    await window.Swal.fire({
      icon: "success",
      title: "Berhasil!",
      padding: "2em",
    });
    category.value = null;
    existingData.value = "";
    revisionData.value = "";
    description.value = "";
    if (file.value) file.value.value = "";
  } catch {
    window.Swal.fire({
      icon: "error",
      title: "Terjadi Kesalahan",
      padding: "2em",
    });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const user = auth.user || (await auth.fetchUser());
  // Data revisi tidak boleh diminta saat profil gagal karena role menentukan hak ubah.
  if (!user) return;
  requiredDocuments.value = await getSubmissionRequiredDocuments(id);
  profileReady.value = true;
});

function download(row) {
  if (row.document_url)
    window.open(safeUrl(row.document_url), "_blank", "noopener");
}
</script>

<template>
  <DetailTabsLayout
    :tabs="penutupanDetailTabs"
    :id="id"
    title="Detail Penutupan"
    :back="{ name: 'list-data-pengajuan-non-medis' }"
  >
    <div v-if="profileReady" class="space-y-5">
      <SubmissionRequiredDocuments
        :submission-id="id"
        :documents="requiredDocuments"
        :can-notify="canManage"
      />
      <Card v-if="canManage" title="Form Revisi Data">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseSelect
            v-model="category"
            :options="categoryOptions"
            label="Kategori"
            placeholder="Pilih Kategori"
            required
            @update:model-value="loadCategory"
          />
          <div>
            <label class="form-label">Data Lama</label>
            <input
              :value="loadingField ? 'Memuat...' : existingData"
              class="form-input"
              disabled
            />
          </div>
          <div>
            <label class="form-label"
              >Data Baru <span class="text-danger">*</span></label
            >
            <input
              v-if="categoryType === 'date'"
              v-model="revisionData"
              type="date"
              class="form-input"
            />
            <input
              v-else-if="categoryType === 'currency'"
              v-model="revisionData"
              class="form-input"
              placeholder="Rp 0"
              @input="normalizeCurrency"
            />
            <!-- number: Premi & Usia; digits: No. Rekening & NIK (hanya angka, persis aslinya) -->
            <input
              v-else-if="categoryType === 'number'"
              v-model="revisionData"
              type="number"
              class="form-input"
            />
            <input
              v-else-if="categoryType === 'digits'"
              v-model="revisionData"
              class="form-input"
              inputmode="numeric"
              @input="
                revisionData = (revisionData || '').replace(/[^0-9]/g, '')
              "
            />
            <input
              v-else
              v-model="revisionData"
              class="form-input"
              @input="revisionData = revisionData?.toUpperCase()"
            />
          </div>
          <div>
            <label class="form-label">Dokumen Pendukung</label>
            <input ref="file" type="file" class="form-input" />
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">Keterangan</label>
            <input
              v-model="description"
              class="form-input"
              @input="description = description?.toUpperCase()"
            />
          </div>
        </div>
        <div class="mt-5 flex justify-end">
          <BaseButton :loading="saving" @click="save">Simpan Revisi</BaseButton>
        </div>
      </Card>

      <Card bare no-body class="p-0">
        <DataTable
          :columns="columns"
          server-side
          :fetcher="historyFetcher"
          search-placeholder="Cari history revisi..."
          empty-message="Belum ada history revisi"
        >
          <template #cell-aksi="{ row }">
            <button
              v-if="row.document_url"
              class="btn-icon btn-ghost text-primary-500"
              title="Unduh dokumen"
              @click="download(row)"
            >
              <Download class="h-5 w-5" />
            </button>
          </template>
        </DataTable>
      </Card>
    </div>
  </DetailTabsLayout>
</template>

<script setup>
/**
 * TAB DOKUMEN (reusable) — untuk detail Restitusi & Klaim.
 *
 * Fitur (mengikuti aslinya):
 *   - Daftar dokumen (DataTable mode server) + tombol unduh & hapus per baris.
 *   - Form unggah: jenis dokumen, nama dokumen, keterangan, berkas.
 *     Bila jenis = jenis utama (Restitusi/Klaim), nama dokumen dipilih dari
 *     daftar dokumen wajib yang BELUM ada; selain itu diisi bebas (teks).
 *
 * Bagian yang beda antar-modul diberikan lewat props (fetcher, submitUpload,
 * deleteFn, documentTypes, requiredDocuments, canManage).
 */
import { ref, computed } from "vue";
import DataTable from "@/components/ui/DataTable.vue";
import Card from "@/components/ui/Card.vue";
import BaseSelect from "@/components/ui/BaseSelect.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import { moment } from "@/lib/format";
import { safeUrl } from "@/lib/sanitize";
import { Download, Trash2 } from "lucide-vue-next";

const props = defineProps({
  listFetcher: { type: Function, required: true },
  documentTypes: { type: Array, default: () => [] },
  requiredDocuments: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: true },
  allowDelete: { type: Boolean, default: true },
  requireDocumentName: { type: Boolean, default: true },
  useRequiredNamesForPrimary: { type: Boolean, default: true },
  extraColumns: { type: Array, default: () => [] },
  // async ({ file, documentType, documentName, description }) => boolean
  submitUpload: { type: Function, required: true },
  // async (docId) => any
  deleteFn: { type: Function, required: true },
});

const tableRef = ref(null);
const documentType = ref(null);
const documentName = ref(null);
const description = ref("");
const fileInput = ref(null);
const uploading = ref(false);

// Jenis "utama" (indeks 0) memakai nama dokumen dari daftar dokumen wajib.
const isPrimaryType = computed(
  () =>
    props.useRequiredNamesForPrimary &&
    documentType.value &&
    documentType.value === props.documentTypes[0],
);

// Opsi nama dokumen (hanya untuk jenis utama): dokumen wajib yang belum ada.
const documentNameOptions = computed(() =>
  props.requiredDocuments
    .filter((d) => d.document_exist === false)
    .map((d) => d.document_required),
);

const columns = computed(() => [
  { key: "aksi", label: "Aksi", align: "center" },
  { key: "document_type", label: "Jenis Dokumen" },
  { key: "document_name", label: "Nama Dokumen" },
  { key: "description", label: "Keterangan" },
  {
    key: "document_date",
    label: "Tanggal Input",
    // Format sama seperti aslinya: sumber "HH:mm:ss DD-MM-YYYY", digeser +7 jam.
    formatter: (v) =>
      v
        ? moment(v, "HH:mm:ss DD-MM-YYYY")
            .add(7, "hours")
            .format("DD-MM-YYYY HH:mm:ss")
        : "-",
  },
  ...props.extraColumns,
]);

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: "2em" });
}

function unduh(row) {
  if (row?.document_url)
    window.open(safeUrl(row.document_url), "_blank", "noopener");
}

function konfirmasiHapus(row) {
  window.Swal.fire({
    title: "Hapus Dokumen?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Hapus",
    cancelButtonText: "Batal",
    padding: "2em",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await props.deleteFn(row.id);
        tableRef.value?.reload();
      } catch {
        alert("error", "Gagal menghapus dokumen");
      }
    }
  });
}

async function unggah() {
  const file = fileInput.value?.files?.[0];
  if (
    !documentType.value ||
    (props.requireDocumentName && !documentName.value) ||
    !file
  ) {
    return alert(
      "error",
      props.requireDocumentName
        ? "Jenis, nama dokumen, dan berkas wajib diisi"
        : "Jenis dokumen dan berkas wajib diisi",
    );
  }
  uploading.value = true;
  try {
    const ok = await props.submitUpload({
      file,
      documentType: documentType.value,
      documentName: documentName.value,
      description: description.value,
    });
    if (ok) {
      alert("success", "Dokumen berhasil diunggah");
      // Reset form + muat ulang tabel.
      documentType.value = null;
      documentName.value = null;
      description.value = "";
      if (fileInput.value) fileInput.value.value = "";
      tableRef.value?.reload();
    } else {
      alert("error", "Terjadi Kesalahan");
    }
  } catch {
    alert("error", "Terjadi Kesalahan");
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Form unggah (hanya bila boleh mengelola) -->
    <Card v-if="canManage" title="Unggah Dokumen">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseSelect
          v-model="documentType"
          :options="documentTypes"
          label="Jenis Dokumen"
          placeholder="Pilih Jenis"
          required
        />
        <!-- Nama dokumen: select untuk jenis utama, teks untuk lainnya -->
        <BaseSelect
          v-if="isPrimaryType"
          v-model="documentName"
          :options="documentNameOptions"
          label="Nama Dokumen"
          placeholder="Pilih Nama Dokumen"
          required
        />
        <div v-else>
          <label class="form-label"
            >Nama Dokumen
            <span v-if="requireDocumentName" class="text-danger">*</span></label
          >
          <input
            v-model="documentName"
            type="text"
            class="form-input"
            placeholder="Nama dokumen"
          />
        </div>

        <div class="sm:col-span-2">
          <label class="form-label">Keterangan</label>
          <input
            v-model="description"
            type="text"
            class="form-input"
            placeholder="Keterangan (opsional)"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="form-label"
            >Berkas <span class="text-danger">*</span></label
          >
          <input ref="fileInput" type="file" class="form-input" />
        </div>
      </div>
      <div class="mt-5 flex justify-end">
        <BaseButton variant="primary" :loading="uploading" @click="unggah"
          >Unggah</BaseButton
        >
      </div>
    </Card>

    <!-- Daftar dokumen -->
    <Card bare no-body class="p-0">
      <DataTable
        ref="tableRef"
        :columns="columns"
        server-side
        :fetcher="listFetcher"
        search-placeholder="Cari dokumen..."
        empty-message="Belum ada dokumen"
      >
        <template #cell-aksi="{ row }">
          <div class="flex items-center justify-center gap-1.5">
            <button
              class="btn-icon btn-ghost text-primary-500"
              title="Unduh"
              @click="unduh(row)"
            >
              <Download class="h-5 w-5" />
            </button>
            <button
              v-if="canManage && allowDelete"
              class="btn-icon btn-ghost text-danger"
              title="Hapus"
              @click="konfirmasiHapus(row)"
            >
              <Trash2 class="h-5 w-5" />
            </button>
          </div>
        </template>
      </DataTable>
    </Card>
  </div>
</template>

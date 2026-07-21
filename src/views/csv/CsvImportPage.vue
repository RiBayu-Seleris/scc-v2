<script setup>
/**
 * CSV/Excel import page reusable.
 * Pola lama: upload-file -> endpoint import -> tabel riwayat server-side.
 */
import { computed, ref } from 'vue'
import { uploadFile } from '@/lib/services/upload'
import { importHistoryFetcher, postImport, putImport } from '@/lib/services/csvImport'
import { safeUrl } from '@/lib/sanitize'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import DataTable from '@/components/ui/DataTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Download, Eye } from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, required: true },
  accept: { type: String, default: '.csv' },
  allowedExtensions: { type: Array, default: () => ['csv'] },
  listEndpoint: { type: String, required: true },
  uploadEndpoint: { type: String, required: true },
  uploadMethod: { type: String, default: 'post' },
  payloadKey: { type: String, default: 'upload_url' },
  extraPayload: { type: Object, default: () => ({}) },
  columnsType: { type: String, default: 'insurance' },
  templateUrl: { type: String, default: '' },
})

useMeta({ title: () => props.title })

const fileInput = ref(null)
const tableRef = ref(null)
const uploading = ref(false)
const fetcher = computed(() => importHistoryFetcher(props.listEndpoint))

const columns = computed(() => {
  if (props.columnsType === 'certificate' || props.columnsType === 'excel-certificate') {
    return [
      { key: 'code', label: 'Kode Unik' },
      { key: 'upload_path', label: props.columnsType === 'excel-certificate' ? 'Excel Terupload' : 'CSV Terupload' },
      { key: props.columnsType === 'excel-certificate' ? 'updated_excel_path' : 'updated_csv_path', label: props.columnsType === 'excel-certificate' ? 'Excel Download' : 'CSV Download' },
      { key: 'certificate_path', label: 'Download ZIP Sertifikat' },
      { key: 'username', label: 'Username' },
      { key: 'created_at', label: 'Created At' },
      { key: 'updated_at', label: 'Updated At' },
    ]
  }
  return [
    { key: 'unique_code', label: 'Kode Unik' },
    { key: 'upload_path', label: props.allowedExtensions.includes('xlsx') || props.allowedExtensions.includes('xls') ? 'Excel Terupload' : 'CSV Terupload' },
    { key: 'download_path', label: props.allowedExtensions.includes('xlsx') || props.allowedExtensions.includes('xls') ? 'Excel Download' : 'CSV Download' },
    { key: 'upload_counting', label: 'Data Terupload' },
    { key: 'download_counting', label: 'Data Download' },
    { key: 'username', label: 'Username' },
    { key: 'created_at', label: 'Created At' },
  ]
})

function openUrl(url) {
  if (url) window.open(safeUrl(url), '_blank', 'noopener')
}

function alert(icon, title, text = '') {
  window.Swal.fire({ icon, title, text, padding: '2em' })
}

async function upload() {
  const file = fileInput.value?.files?.[0]
  if (!file) return alert('error', 'File wajib diisi')
  const ext = file.name.split('.').pop().toLowerCase()
  if (!props.allowedExtensions.includes(ext)) {
    return alert('error', 'Ekstensi File Tidak Didukung', `Silakan unggah file dengan ekstensi ${props.allowedExtensions.join(', ')}`)
  }
  uploading.value = true
  try {
    const path = await uploadFile(file)
    const payload = { [props.payloadKey]: path, ...props.extraPayload }
    const res = props.uploadMethod === 'put'
      ? await putImport(props.uploadEndpoint, payload)
      : await postImport(props.uploadEndpoint, payload)
    if (res.data.status === 400) {
      alert('error', 'Gagal', res.data.message || 'Terjadi Kesalahan')
    } else {
      await window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
      if (fileInput.value) fileInput.value.value = ''
      tableRef.value?.reload()
    }
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader :title="title" subtitle="Upload file dan pantau riwayat proses import." />

    <Card title="Upload File" class="mb-5">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <div>
          <label class="form-label">File <span class="text-danger">*</span></label>
          <input ref="fileInput" type="file" :accept="accept" class="form-input" />
        </div>
        <BaseButton v-if="templateUrl" variant="secondary" @click="openUrl(templateUrl)">
          <Download class="h-4 w-4" /> Template
        </BaseButton>
        <BaseButton :loading="uploading" @click="upload">Upload</BaseButton>
      </div>
    </Card>

    <Card no-body class="p-4">
      <DataTable ref="tableRef" :columns="columns" server-side :fetcher="fetcher" empty-message="Belum ada riwayat upload">
        <template #cell-upload_path="{ value }">
          <button v-if="value" class="btn-icon btn-ghost text-primary-500" title="Buka file" @click="openUrl(value)">
            <Eye class="h-5 w-5" />
          </button>
        </template>
        <template #cell-download_path="{ value }">
          <button v-if="value" class="btn-icon btn-ghost text-primary-500" title="Buka file" @click="openUrl(value)">
            <Eye class="h-5 w-5" />
          </button>
        </template>
        <template #cell-updated_csv_path="{ value }">
          <button v-if="value" class="btn-icon btn-ghost text-primary-500" title="Buka file" @click="openUrl(value)">
            <Eye class="h-5 w-5" />
          </button>
        </template>
        <template #cell-updated_excel_path="{ value }">
          <button v-if="value" class="btn-icon btn-ghost text-primary-500" title="Buka file" @click="openUrl(value)">
            <Eye class="h-5 w-5" />
          </button>
        </template>
        <template #cell-certificate_path="{ value }">
          <button v-if="value" class="btn-icon btn-ghost text-primary-500" title="Buka file" @click="openUrl(value)">
            <Eye class="h-5 w-5" />
          </button>
        </template>
      </DataTable>
    </Card>
  </div>
</template>

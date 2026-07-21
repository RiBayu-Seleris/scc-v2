<script setup>
/**
 * DETAIL KLAIM - REVISI KLAIM.
 *
 * Endpoint/payload mengikuti ehd-backoffice:
 * - GET notification/document/claim/{id}
 * - GET claim/required-document/{id}
 * - GET claim/revision-data/{id}
 * - PUT claim/revision-data/{id}
 * - GET claim/revision-data/history/{id} (server-side DataTable)
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  claimRevisionHistoryFetcher,
  getClaimRequiredDocuments,
  getClaimRevisionData,
  sendClaimEmailNotification,
  updateClaimRevision,
} from '@/lib/services/claim'
import { uploadFile } from '@/lib/services/upload'
import { safeUrl } from '@/lib/sanitize'
import { moment } from '@/lib/format'
import { klaimDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import DataTable from '@/components/ui/DataTable.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { Check, Download, Mail, X } from 'lucide-vue-next'

useMeta({ title: 'Detail Klaim - Revisi Klaim' })

const route = useRoute()
const auth = useAuthStore()
const id = route.params.id
const session = getSession()

const loading = ref(true)
const saving = ref(false)
const sending = ref(false)
const requiredDocuments = ref([])
const existingData = ref({})
const tableRef = ref(null)
const fileInput = ref(null)
const profileReady = ref(false)

const category = ref(null)
const categoryOptions = ['Jumlah Diajukan', 'Tanggal Kejadian', 'Tempat Kejadian']
const revisionAmount = ref('')
const revisionDate = ref('')
const revisionPlace = ref('')
const description = ref('')

const canManage = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))
const historyFetcher = claimRevisionHistoryFetcher(id)

function digits(value) {
  const cleaned = String(value ?? '').replace(/\D/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

function dotted(value) {
  const n = String(value ?? '').replace(/\D/g, '')
  return n.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
}

function onAmountInput() {
  revisionAmount.value = dotted(revisionAmount.value)
}

const existingValue = computed(() => {
  if (category.value === 'Jumlah Diajukan') return dotted(existingData.value.claim_submitted)
  if (category.value === 'Tanggal Kejadian') {
    return existingData.value.date_incident
      ? moment(existingData.value.date_incident, 'DD/MM/YYYY').format('YYYY-MM-DD')
      : ''
  }
  if (category.value === 'Tempat Kejadian') return existingData.value.place_incident || ''
  return ''
})

function newValue() {
  if (category.value === 'Jumlah Diajukan') return String(digits(revisionAmount.value))
  if (category.value === 'Tanggal Kejadian') return revisionDate.value ? moment(revisionDate.value).format('DD/MM/YYYY') : ''
  if (category.value === 'Tempat Kejadian') return revisionPlace.value || ''
  return ''
}

function resetForm() {
  category.value = null
  revisionAmount.value = ''
  revisionDate.value = ''
  revisionPlace.value = ''
  description.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

async function sendEmail() {
  if (!canManage.value) return
  sending.value = true
  try {
    await sendClaimEmailNotification(id)
    alert('success', 'Email Notifikasi Terkirim')
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    sending.value = false
  }
}

async function submitRevision() {
  if (!canManage.value) return
  const value = newValue()
  if (!category.value || !value) {
    return alert('error', 'Kategori dan data baru wajib diisi')
  }

  saving.value = true
  try {
    const selectedFile = fileInput.value?.files?.[0]
    const documentUrl = selectedFile ? await uploadFile(selectedFile) : null
    const res = await updateClaimRevision(id, {
      field_name: category.value,
      new_value: value,
      description: description.value,
      document_url: documentUrl,
      user_id: parseInt(session.userId, 10),
    })

    if (res.data?.status === 200) {
      alert('success', 'Berhasil!')
      resetForm()
      tableRef.value?.reload()
      existingData.value = await getClaimRevisionData(id)
    } else {
      alert('error', 'Terjadi Kesalahan')
    }
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    saving.value = false
  }
}

function formatRevision(value, row) {
  if (row?.field_name === 'Jumlah Diajukan') return 'IDR ' + dotted(value)
  return value || '-'
}

function formatHistoryDate(value) {
  if (!value) return '-'
  return moment(value, 'HH:mm:ss DD-MM-YYYY').add(7, 'hours').format('DD/MM/YYYY HH:mm:ss')
}

function openDocument(url) {
  if (url) window.open(safeUrl(url), '_blank', 'noopener')
}

const columns = [
  { key: 'aksi', label: 'Aksi', align: 'center' },
  { key: 'field_name', label: 'Kategori' },
  { key: 'data_before', label: 'Data Lama', formatter: formatRevision },
  { key: 'data_after', label: 'Data Baru', formatter: formatRevision },
  { key: 'description', label: 'Keterangan' },
  { key: 'created_at', label: 'Tanggal Ubah', formatter: formatHistoryDate },
  { key: 'user_name', label: 'User Input' },
]

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // History revisi ditahan saat profil gagal agar scope role tidak terlepas.
    if (!user) return
    const [required, revision] = await Promise.all([
      getClaimRequiredDocuments(id),
      getClaimRevisionData(id),
    ])
    requiredDocuments.value = required
    existingData.value = revision
    profileReady.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DetailTabsLayout :tabs="klaimDetailTabs" :id="id" title="Detail Klaim" :back="{ name: 'list-klaim-register' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else-if="profileReady" class="space-y-5">
      <Card v-if="requiredDocuments.length" title="Dokumen Berikut Belum Diupload">
        <div class="mb-4 flex justify-end">
          <BaseButton v-if="canManage" variant="outline-primary" :loading="sending" @click="sendEmail">
            <Mail class="h-4 w-4" /> Kirim Email Notifikasi
          </BaseButton>
        </div>
        <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <li v-for="(d, i) in requiredDocuments" :key="i" class="flex items-center gap-2 text-sm">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full"
              :class="d.document_exist ? 'bg-success-light text-success-dark' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'"
            >
              <Check v-if="d.document_exist" class="h-4 w-4" />
              <X v-else class="h-4 w-4" />
            </span>
            <span>{{ d.document_required }}</span>
          </li>
        </ul>
      </Card>

      <Card v-if="canManage" title="Form Revisi Data Klaim">
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BaseSelect v-model="category" :options="categoryOptions" label="Kategori" placeholder="Pilih kategori" required />

          <div>
            <label class="form-label">Data Existing <span v-if="category === 'Tanggal Kejadian'">(dd/mm/yyyy)</span></label>
            <input
              :value="existingValue"
              :type="category === 'Tanggal Kejadian' ? 'date' : 'text'"
              class="form-input"
              readonly
            />
          </div>

          <div v-if="category === 'Jumlah Diajukan'">
            <label class="form-label">Data Baru <span class="text-danger">*</span></label>
            <input v-model="revisionAmount" type="text" class="form-input" placeholder="Masukan angka" @input="onAmountInput" />
          </div>
          <div v-else-if="category === 'Tanggal Kejadian'">
            <label class="form-label">Data Baru <span class="text-danger">*</span></label>
            <input v-model="revisionDate" type="date" class="form-input" />
          </div>
          <div v-else>
            <label class="form-label">Data Baru <span class="text-danger">*</span></label>
            <input v-model="revisionPlace" type="text" class="form-input" placeholder="Masukan teks" />
          </div>

          <div>
            <label class="form-label">Dokumen Pendukung</label>
            <input ref="fileInput" type="file" class="form-input" />
          </div>

          <div class="lg:col-span-2">
            <label class="form-label">Keterangan</label>
            <input v-model="description" type="text" class="form-input" placeholder="Masukan keterangan" />
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <BaseButton variant="primary" :loading="saving" @click="submitRevision">Simpan Revisi</BaseButton>
        </div>
      </Card>

      <Card no-body class="p-4">
        <DataTable
          ref="tableRef"
          :columns="columns"
          server-side
          :fetcher="historyFetcher"
          search-placeholder="Cari riwayat revisi..."
          empty-message="Belum ada riwayat revisi"
        >
          <template #cell-aksi="{ row }">
            <button
              v-if="row.document_url"
              class="btn-icon btn-ghost text-primary-500"
              title="Unduh dokumen"
              @click="openDocument(row.document_url)"
            >
              <Download class="h-5 w-5" />
            </button>
            <span v-else class="text-slate-300">-</span>
          </template>
        </DataTable>
      </Card>
    </div>
  </DetailTabsLayout>
</template>

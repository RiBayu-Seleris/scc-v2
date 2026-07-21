<script setup>
/**
 * DAFTAR KLAIM (reusable).
 * Satu komponen untuk list utama & semua tab status klaim (register, proses
 * broker/asuransi, ditolak, diterima, dibayar, settle, banding, dibatalkan).
 * Data per-halaman dari server (endpoint claim/list). Klik ikon mata -> detail debitur.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { claimListFetcher, confirmClaimDebetDate, getClaimNoticeDebet } from '@/lib/services/claim'
import { moment, rupiah } from '@/lib/format'
import { safeUrl } from '@/lib/sanitize'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import DataTable from '@/components/ui/DataTable.vue'
import Badge from '@/components/ui/Badge.vue'
import Modal from '@/components/ui/Modal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Check, Download, Eye } from 'lucide-vue-next'

const props = defineProps({
  status: { type: String, default: 'claim_registered' },
  title: { type: String, default: 'List Klaim' },
})

useMeta({ title: () => props.title })

const router = useRouter()
const auth = useAuthStore()
const session = getSession()
const tableRef = ref(null)
const showDebetModal = ref(false)
const selectedClaimId = ref(null)
const debetDate = ref('')
const description = ref('')
const savingDebet = ref(false)
const downloadingId = ref(null)
const canManagePaid = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

const tabs = [
  { label: 'Terdaftar', route: 'list-klaim-register' },
  { label: 'Proses Broker', route: 'list-klaim-diproses-broker' },
  { label: 'Proses Asuransi', route: 'list-klaim-diproses-asuransi' },
  { label: 'Ditolak', route: 'list-klaim-ditolak' },
  { label: 'Diterima', route: 'list-klaim-diterima' },
  { label: 'Dibayar', route: 'list-klaim-dibayar' },
  { label: 'Settle', route: 'list-klaim-settle' },
  { label: 'Banding', route: 'list-klaim-banding' },
  { label: 'Dibatalkan', route: 'list-klaim-dibatalkan' },
]

const columns = [
  { key: 'aksi', label: 'Aksi', align: 'center' },
  { key: 'contract_number', label: 'No. Akad' },
  { key: 'id_card_number', label: 'No. Identitas' },
  { key: 'partner_name', label: 'Perusahaan/Client' },
  { key: 'member_name', label: 'Nama Cabang' },
  { key: 'debitur_name', label: 'Nama Debitur' },
  { key: 'start_date', label: 'Mulai Asuransi' },
  { key: 'end_date', label: 'Akhir Asuransi' },
  { key: 'certificate_number', label: 'No. Sertifikat' },
  { key: 'sum_insured', label: 'Uang Pertanggungan', align: 'right', formatter: (v) => rupiah(v) },
  { key: 'date_incident', label: 'Tanggal Kejadian' },
  { key: 'claim_type', label: 'Jenis Klaim' },
  { key: 'claim_submitted', label: 'Total Diajukan', align: 'right', formatter: (v) => rupiah(v) },
  { key: 'date_submission_claim', label: 'Tanggal Klaim' },
  { key: 'claim_status_description', label: 'Status' },
  { key: 'user_name', label: 'User Input' },
  { key: 'bank_name', label: 'Nama Bank Umum' },
  { key: 'account_name', label: 'Nama Akun Penerima' },
  { key: 'account_number', label: 'No. Rekening Penerima' },
]

const fetcher = computed(() => claimListFetcher(props.status))

function openDetail(row) {
  if (row?.claim_id && row?.id_card_number) {
    router.push({
      name: 'detail-klaim-data-debitur',
      params: { id: row.claim_id },
      query: { nik: row.id_card_number },
    })
  }
}

function openDebetConfirmation(row) {
  if (!canManagePaid.value) return
  selectedClaimId.value = row.claim_id
  debetDate.value = ''
  description.value = ''
  showDebetModal.value = true
}

async function downloadNotice(row) {
  if (!canManagePaid.value || downloadingId.value) return
  downloadingId.value = row.claim_id
  try {
    const url = await getClaimNoticeDebet(row.claim_id)
    if (url) window.open(safeUrl(url), '_blank', 'noopener')
    else window.Swal.fire({ icon: 'error', title: 'Dokumen tidak tersedia', padding: '2em' })
    tableRef.value?.reload()
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    downloadingId.value = null
  }
}

async function confirmDebet() {
  if (!canManagePaid.value || !selectedClaimId.value) return
  savingDebet.value = true
  try {
    const { data } = await confirmClaimDebetDate(selectedClaimId.value, {
      debet_date: moment(debetDate.value).format('DD/MM/YYYY'),
      description: description.value,
      user_id: parseInt(session.userId, 10),
    })
    if (data?.status === 200) {
      await window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
      showDebetModal.value = false
      tableRef.value?.reload()
    }
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    savingDebet.value = false
  }
}

function statusVariant(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('tolak') || t.includes('unclaim') || t.includes('batal')) return 'danger'
  if (t.includes('bayar') || t.includes('paid') || t.includes('clear') || t.includes('terima') || t.includes('confirm')) return 'success'
  if (t.includes('proses') || t.includes('waiting') || t.includes('banding') || t.includes('appeal')) return 'warning'
  return 'primary'
}
</script>

<template>
  <div>
    <PageHeader :title="title" subtitle="Kelola dan pantau pengajuan klaim." />

    <div class="mb-4 flex flex-wrap gap-2">
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

    <Card no-body class="p-4">
      <DataTable
        ref="tableRef"
        :key="status"
        :columns="columns"
        server-side
        :fetcher="fetcher"
        search-placeholder="Cari nomor akad, debitur, sertifikat..."
        empty-message="Belum ada data klaim"
      >
        <template #cell-aksi="{ row }">
          <div class="flex flex-col items-center gap-1.5">
            <button class="btn-icon btn-ghost text-primary-500" title="Lihat detail" @click="openDetail(row)">
              <Eye class="h-5 w-5" />
            </button>
            <template v-if="status === 'claim_paid' && canManagePaid">
              <span v-if="Number(row.count_debet_note) > 0" class="text-xs text-slate-500">Sudah Didownload</span>
              <button
                v-else
                class="inline-flex items-center gap-1 text-xs font-medium text-primary-600"
                :disabled="downloadingId === row.claim_id"
                @click="downloadNotice(row)"
              >
                <Download class="h-3.5 w-3.5" /> Download Surat
              </button>
              <button class="inline-flex items-center gap-1 text-xs font-medium text-primary-600" @click="openDebetConfirmation(row)">
                <Check class="h-3.5 w-3.5" /> Konfirmasi Debet
              </button>
            </template>
          </div>
        </template>

        <template #cell-claim_status_description="{ value }">
          <Badge :variant="statusVariant(value)">{{ value }}</Badge>
        </template>
      </DataTable>
    </Card>

    <Modal v-model="showDebetModal" title="Konfirmasi Pendebetan">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="form-label">Tanggal Pendebetan <span class="text-danger">*</span></label>
          <input v-model="debetDate" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">Keterangan <span class="text-danger">*</span></label>
          <input v-model="description" type="text" class="form-input" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showDebetModal = false">Batal</BaseButton>
        <BaseButton :loading="savingDebet" @click="confirmDebet">Simpan</BaseButton>
      </template>
    </Modal>
  </div>
</template>

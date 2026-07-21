<script setup>
/**
 * DAFTAR RESTITUSI (reusable).
 *
 * Satu komponen dipakai untuk list utama DAN semua tab status (terdaftar,
 * proses broker/asuransi, ditolak, diterima, dibayar, settle) — cukup beda `status`.
 * Data diambil per-halaman dari server (endpoint restitute/list) lewat service.
 *
 * Kolom & aksi mengikuti aslinya. Klik ikon mata -> halaman detail debitur.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { confirmDebetDate, getRestituteNoticeDebet, restituteListFetcher } from '@/lib/services/restitute'
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
  status: { type: String, default: 'restitute_registered' },
  title: { type: String, default: 'List Restitusi' },
})

useMeta({ title: () => props.title })

const router = useRouter()
const auth = useAuthStore()
const session = getSession()
const tableRef = ref(null)
const showDebetModal = ref(false)
const selectedRestituteId = ref(null)
const debetDate = ref('')
const description = ref('')
const savingDebet = ref(false)
const downloadingId = ref(null)
const canManagePaid = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

// Tab status (navigasi antar tampilan). Aktif ditentukan oleh route saat ini.
const tabs = [
  { label: 'Terdaftar', route: 'list-restitusi' },
  { label: 'Proses Broker', route: 'list-restitusi-diproses-broker' },
  { label: 'Proses Asuransi', route: 'list-restitusi-diproses-asuransi' },
  { label: 'Ditolak', route: 'list-restitusi-ditolak' },
  { label: 'Diterima', route: 'list-restitusi-diterima' },
  { label: 'Dibayar', route: 'list-restitusi-dibayar' },
  { label: 'Settle', route: 'list-restitusi-settle' },
]

// Definisi kolom tabel (key = nama field dari API).
const columns = [
  { key: 'aksi', label: 'Aksi', align: 'center' },
  { key: 'contract_number', label: 'No. Akad' },
  { key: 'id_card_number', label: 'No. Identitas' },
  { key: 'product_code', label: 'Plan ID' },
  { key: 'partner_name', label: 'Perusahaan/Client' },
  { key: 'member_name', label: 'Nama Cabang' },
  { key: 'debitur_name', label: 'Nama Debitur' },
  { key: 'product_name', label: 'Nama Produk' },
  { key: 'polis_number', label: 'No. Polis' },
  { key: 'certificate_number', label: 'No. Sertifikat' },
  { key: 'restitute_premium', label: 'Premi Restitusi', align: 'right', formatter: (v) => rupiah(v) },
  { key: 'restitute_date', label: 'Tanggal Restitusi' },
  { key: 'restitute_status_description', label: 'Status' },
  { key: 'user_name', label: 'User Input' },
]

// Fetcher dibuat ulang bila status berubah (dipakai bersama :key agar remount).
const fetcher = computed(() => restituteListFetcher(props.status))

function openDetail(row) {
  if (!row?.restitute_id || !row?.id_card_number) return
  router.push({
    name: 'detail-restitusi-data-debitur',
    params: { id: row.restitute_id },
    query: { nik: row.id_card_number },
  })
}

function openDebetConfirmation(row) {
  if (!canManagePaid.value) return
  selectedRestituteId.value = row.restitute_id
  debetDate.value = ''
  description.value = ''
  showDebetModal.value = true
}

async function downloadNotice(row) {
  if (!canManagePaid.value || downloadingId.value) return
  downloadingId.value = row.restitute_id
  try {
    const url = await getRestituteNoticeDebet(row.restitute_id)
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
  if (!canManagePaid.value || !selectedRestituteId.value) return
  savingDebet.value = true
  try {
    const { data } = await confirmDebetDate(selectedRestituteId.value, {
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

// Tentukan warna badge status dari kata kuncinya.
function statusVariant(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('tolak') || t.includes('unrestitut')) return 'danger'
  if (t.includes('bayar') || t.includes('paid') || t.includes('clear') || t.includes('terima') || t.includes('confirm')) return 'success'
  if (t.includes('proses') || t.includes('waiting')) return 'warning'
  return 'primary'
}
</script>

<template>
  <div>
    <PageHeader :title="title" subtitle="Kelola dan pantau pengajuan restitusi." />

    <!-- Tab status -->
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
        search-placeholder="Cari nomor akad, debitur, polis..."
        empty-message="Belum ada data restitusi"
      >
        <!-- Kolom Aksi -->
        <template #cell-aksi="{ row }">
          <div class="flex flex-col items-center gap-1.5">
            <button class="btn-icon btn-ghost text-primary-500" title="Lihat detail" @click="openDetail(row)">
              <Eye class="h-5 w-5" />
            </button>
            <template v-if="status === 'restitute_paid' && canManagePaid">
              <span v-if="Number(row.count_debet_note) > 0" class="text-xs text-slate-500">Sudah Didownload</span>
              <button
                v-else
                class="inline-flex items-center gap-1 text-xs font-medium text-primary-600"
                :disabled="downloadingId === row.restitute_id"
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

        <!-- Kolom Status -->
        <template #cell-restitute_status_description="{ value }">
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

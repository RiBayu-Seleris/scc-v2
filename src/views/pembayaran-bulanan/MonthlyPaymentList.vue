<script setup>
/**
 * LIST PEMBAYARAN BULANAN (reusable).
 * Mewakili 3 halaman lama:
 * - paid              -> Sudah Dibayar
 * - unpaid_payment    -> Belum Dibayar
 * - remaining_payment -> Sisa Pembayaran
 *
 * Fitur lama yang dipertahankan:
 * - tab antar status
 * - lihat riwayat pembayaran
 * - buka PDF laporan pembayaran
 * - input pembayaran pada status belum/sisa
 */
import { computed, ref } from 'vue'
import { getSession } from '@/lib/auth'
import {
  dependentPaymentFetcher,
  getDependentPaymentHistory,
  payDependentPayment,
} from '@/lib/services/monthlyPayment'
import { formatNumber, moment } from '@/lib/format'
import { safeUrl } from '@/lib/sanitize'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import DataTable from '@/components/ui/DataTable.vue'
import Modal from '@/components/ui/Modal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Download, Eye, Wallet } from 'lucide-vue-next'

const props = defineProps({
  status: { type: String, default: 'paid' },
  title: { type: String, default: 'List Pembayaran Bulanan' },
})

useMeta({ title: () => props.title })

const session = getSession()
const tableRef = ref(null)
const showHistory = ref(false)
const histories = ref([])
const historyLoading = ref(false)
const showPayment = ref(false)
const paymentId = ref(null)
const paymentDate = ref('')
const paidPayment = ref('')
const savingPayment = ref(false)

const tabs = [
  { label: 'Sudah Dibayar', route: 'list-pembayaran-bulanan' },
  { label: 'Belum Dibayar', route: 'list-pembayaran-bulanan-belum-dibayar' },
  { label: 'Sisa Pembayaran', route: 'list-pembayaran-bulanan-sisa-pembayaran' },
]

const fetcher = computed(() => dependentPaymentFetcher(props.status))
const canPay = computed(() => props.status !== 'paid')

const columns = [
  { key: 'aksi', label: 'Aksi', align: 'center' },
  { key: 'account_bank', label: 'Nama Bank' },
  { key: 'account_branch_bank', label: 'Nama Cabang Bank' },
  { key: 'total_payment', label: 'Total Pembayaran', align: 'right', formatter: (v) => `IDR ${formatNumber(v)}` },
  { key: 'total_debitur', label: 'Total Debitur' },
  { key: 'remaining_dependents', label: 'Sisa', align: 'right', formatter: (v) => `IDR ${formatNumber(v)}` },
  { key: 'unpaid_payment', label: 'Belum Dibayarkan', align: 'right', formatter: (v) => `IDR ${formatNumber(v)}` },
  { key: 'payment_report', label: 'PDF Laporan Pembayaran', align: 'center' },
]

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

function openUrl(url) {
  if (url) window.open(safeUrl(url), '_blank', 'noopener')
}

function formatHistoryDate(value) {
  return value ? moment(value, 'HH:mm:ss DD/MM/YYYY').format('DD/MM/YYYY HH:mm:ss') : '-'
}

async function openHistory(row) {
  paymentId.value = row.id
  showHistory.value = true
  historyLoading.value = true
  try {
    histories.value = await getDependentPaymentHistory(row.id)
  } catch {
    histories.value = []
    alert('error', 'Terjadi Kesalahan')
  } finally {
    historyLoading.value = false
  }
}

function openPayment(row) {
  paymentId.value = row.id
  paymentDate.value = ''
  paidPayment.value = ''
  showPayment.value = true
}

function formatPaidInput() {
  let value = String(paidPayment.value || '')
  if (value.charAt(0) === '0') value = ''
  paidPayment.value = formatNumber(value.replace(/\D/g, ''))
}

async function simpanPembayaran() {
  if (!paymentDate.value || !paidPayment.value) return alert('error', 'Tanggal dan nominal pembayaran wajib diisi')
  savingPayment.value = true
  try {
    const res = await payDependentPayment({
      payment_date: moment(paymentDate.value).format('DD/MM/YYYY'),
      payment_id: parseInt(paymentId.value, 10),
      paid_payment: Number(String(paidPayment.value).replace(/\D/g, '')) || 0,
      user_id: parseInt(session.userId, 10),
    })
    if (res.data?.status === 200) {
      await window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
      showPayment.value = false
      tableRef.value?.reload()
    } else {
      alert('error', res.data?.message || 'Terjadi Kesalahan')
    }
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    savingPayment.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader :title="title" subtitle="Pantau pembayaran bulanan dan riwayatnya." />

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
        search-placeholder="Cari pembayaran..."
        empty-message="Belum ada pembayaran"
      >
        <template #cell-aksi="{ row }">
          <div class="flex items-center justify-center gap-1.5">
            <button class="btn-icon btn-ghost text-primary-500" title="Riwayat" @click="openHistory(row)">
              <Eye class="h-5 w-5" />
            </button>
            <button
              v-if="canPay"
              class="btn-icon btn-ghost text-success"
              title="Pembayaran"
              @click="openPayment(row)"
            >
              <Wallet class="h-5 w-5" />
            </button>
          </div>
        </template>
        <template #cell-payment_report="{ value }">
          <button v-if="value" class="btn-icon btn-ghost text-primary-500" title="Buka PDF" @click="openUrl(value)">
            <Download class="h-5 w-5" />
          </button>
          <span v-else>-</span>
        </template>
      </DataTable>
    </Card>

    <Modal v-model="showHistory" title="Riwayat Pembayaran" size="xl">
      <div v-if="historyLoading" class="py-10 text-center text-slate-400">Memuat...</div>
      <EmptyState v-else-if="!histories.length" message="Belum ada riwayat pembayaran" />
      <div v-else class="space-y-4">
        <div v-for="(history, i) in histories" :key="i" class="flex gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <img
            :src="history.photo_profile || '/assets/images/avatar.png'"
            alt=""
            class="h-10 w-10 rounded-full object-cover"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="font-semibold text-slate-800 dark:text-slate-100">{{ history.user_name || '-' }}</span>
              <span class="text-slate-400">at {{ formatHistoryDate(history.created_at) }}</span>
            </div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ history.description || '-' }}</p>
            <BaseButton
              v-if="history.invoice_url"
              variant="secondary"
              size="sm"
              class="mt-3"
              @click="openUrl(history.invoice_url)"
            >
              <Download class="h-4 w-4" /> Invoice
            </BaseButton>
          </div>
        </div>
      </div>
    </Modal>

    <Modal v-model="showPayment" title="Pembayaran" size="lg">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label class="form-label">Tanggal Pembayaran <span class="text-danger">*</span></label>
          <input v-model="paymentDate" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">Nominal Pembayaran <span class="text-danger">*</span></label>
          <input v-model="paidPayment" type="text" class="form-input" @input="formatPaidInput" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showPayment = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="savingPayment" @click="simpanPembayaran">Simpan</BaseButton>
      </template>
    </Modal>
  </div>
</template>

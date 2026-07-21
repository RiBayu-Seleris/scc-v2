<script setup>
/**
 * DETAIL PENUTUPAN — RIWAYAT.
 * Endpoint sumber:
 * - submission/history/id-card/{nik}
 * - submission/required-document/{id}
 * - notification/document/medis/{id}
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  getSubmissionDebitur,
  getSubmissionRequiredDocuments,
  sendSubmissionMedicalNotification,
  submissionIdCardHistoryFetcher,
} from '@/lib/services/submission'
import { rupiah } from '@/lib/format'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import DataTable from '@/components/ui/DataTable.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Spinner from '@/components/ui/Spinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Mail } from 'lucide-vue-next'

useMeta({ title: 'Detail Penutupan — Riwayat' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const loading = ref(true)
const debitur = ref({})
const requiredDocuments = ref([])
const sending = ref(false)
const canNotify = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

const fetcher = computed(() => debitur.value?.id_card_number ? submissionIdCardHistoryFetcher(debitur.value.id_card_number) : null)

const columns = [
  { key: 'contract_number', label: 'No. Akad' },
  { key: 'id_card_number', label: 'No. Identitas' },
  { key: 'member', label: 'Nama Cabang' },
  { key: 'debitur_name', label: 'Nama Debitur' },
  { key: 'product_id', label: 'Nama Produk' },
  { key: 'age', label: 'Usia', formatter: (v) => `${v || 0} Tahun` },
  { key: 'insurance_period', label: 'Masa Asuransi', formatter: (v) => `${v || 0} Bulan` },
  { key: 'start_date', label: 'Mulai Asuransi' },
  { key: 'end_date', label: 'Akhir Asuransi' },
  { key: 'sum_insured', label: 'Uang Pertanggungan', align: 'right', formatter: (v) => rupiah(v) },
  { key: 'basic_premium', label: 'Premi', align: 'right', formatter: (v) => rupiah(v) },
  { key: 'extra_premium', label: 'Premi EM/EP', align: 'right', formatter: (v) => rupiah(v) },
  { key: 'total_premium', label: 'Total Premi', align: 'right', formatter: (v) => rupiah(v) },
  { key: 'acceptance_status_description', label: 'Status' },
  { key: 'created_at', label: 'Tanggal Input' },
]

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Request detail ditahan bila profil gagal agar pembatasan role tidak hilang.
    if (!user) return
    const [d, docs] = await Promise.all([
      getSubmissionDebitur(id),
      getSubmissionRequiredDocuments(id),
    ])
    debitur.value = d
    requiredDocuments.value = docs
  } finally {
    loading.value = false
  }
})

function statusVariant(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('tolak') || t.includes('reject') || t.includes('batal')) return 'danger'
  if (t.includes('accept') || t.includes('terima') || t.includes('paid')) return 'success'
  return 'primary'
}

async function sendEmail() {
  if (!canNotify.value) return
  sending.value = true
  try {
    await sendSubmissionMedicalNotification(id)
    window.Swal.fire({ icon: 'success', title: 'Email Notifikasi Terkirim', padding: '2em' })
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <DetailTabsLayout :tabs="penutupanDetailTabs" :id="id" title="Detail Penutupan" :back="{ name: 'list-data-pengajuan-non-medis' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>
    <div v-else class="space-y-5">
      <Card v-if="requiredDocuments.length" title="Dokumen Medis/Tambahan Diperlukan">
        <template #actions>
          <BaseButton v-if="canNotify" variant="outline-primary" :loading="sending" @click="sendEmail">
            <Mail class="h-4 w-4" /> Kirim Email Notifikasi
          </BaseButton>
        </template>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label v-for="(doc, i) in requiredDocuments" :key="i" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" :checked="doc.document_exist" disabled class="h-4 w-4 rounded border-slate-300" />
            {{ doc.document_required }}
          </label>
        </div>
      </Card>

      <Card no-body class="p-4">
        <EmptyState v-if="!fetcher" message="NIK tidak tersedia untuk mengambil riwayat" />
        <DataTable
          v-else
          :key="debitur.id_card_number"
          :columns="columns"
          server-side
          :fetcher="fetcher"
          search-placeholder="Cari riwayat..."
          empty-message="Belum ada riwayat polis"
        >
          <template #cell-acceptance_status_description="{ value }">
            <Badge :variant="statusVariant(value)">{{ value }}</Badge>
          </template>
        </DataTable>
      </Card>
    </div>
  </DetailTabsLayout>
</template>

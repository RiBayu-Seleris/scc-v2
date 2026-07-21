<script setup>
/**
 * DAFTAR POLIS ELIGIBLE (reusable).
 *
 * Dipakai oleh "Input Restitusi" dan "Input Klaim" — keduanya identik: menampilkan
 * polis yang sudah diterima + dibayar + asuransinya aktif (submission/list), lalu:
 *   - ikon mata  -> detail debitur (detail-debitur)
 *   - ikon plus  -> mulai proses (route ditentukan lewat prop `startRoute`)
 *
 * Menghindari duplikasi dua halaman yang nyaris sama.
 */
import { useRouter } from 'vue-router'
import { submissionListFetcher } from '@/lib/services/submission'
import { rupiah } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import DataTable from '@/components/ui/DataTable.vue'
import Badge from '@/components/ui/Badge.vue'
import { Eye, Plus } from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: 'Pilih polis yang akan diproses.' },
  // Nama route tujuan tombol "+" (mis. 'detail-input-restitusi' / 'detail-input-klaim').
  startRoute: { type: String, required: true },
})

useMeta({ title: () => props.title })

const router = useRouter()

const fetcher = submissionListFetcher({
  acceptance: 'accepted',
  payment: 'paid',
  active_insurance: true,
})

const columns = [
  { key: 'aksi', label: 'Aksi', align: 'center' },
  { key: 'contract_number', label: 'No. Akad' },
  { key: 'id_card_number', label: 'No. Identitas' },
  { key: 'member', label: 'Nama Kantor' },
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

function lihatDebitur(row) {
  if (row?.id && row?.id_card_number) {
    router.push({ name: 'detail-debitur', params: { id: row.id }, query: { nik: row.id_card_number } })
  }
}
function mulaiProses(row) {
  if (row?.id && row?.id_card_number) {
    router.push({ name: props.startRoute, params: { id: row.id }, query: { nik: row.id_card_number } })
  }
}
</script>

<template>
  <div>
    <PageHeader :title="title" :subtitle="subtitle" />

    <Card no-body class="p-4">
      <DataTable
        :columns="columns"
        server-side
        :fetcher="fetcher"
        search-placeholder="Cari nomor akad, debitur..."
        empty-message="Tidak ada polis yang memenuhi syarat"
      >
        <template #cell-aksi="{ row }">
          <div class="flex items-center justify-center gap-1.5">
            <button class="btn-icon btn-ghost text-primary-500" title="Detail debitur" @click="lihatDebitur(row)">
              <Eye class="h-5 w-5" />
            </button>
            <button class="btn-icon btn-ghost text-accent-600" title="Mulai proses" @click="mulaiProses(row)">
              <Plus class="h-5 w-5" />
            </button>
          </div>
        </template>

        <template #cell-acceptance_status_description="{ value }">
          <Badge variant="primary">{{ value }}</Badge>
        </template>
      </DataTable>
    </Card>
  </div>
</template>

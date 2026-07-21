<script setup>
/**
 * DETAIL PENUTUPAN — DATA ASURANSI.
 * Data dipisah seperti SCC: detail pengajuan untuk dokumen/Chubb dan
 * detail-insurance untuk informasi pertanggungan.
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Download } from 'lucide-vue-next'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  getSubmissionDebitur,
  getSubmissionInsurance,
  getSubmissionRequiredDocuments,
} from '@/lib/services/submission'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { rupiah } from '@/lib/format'
import { safeUrl } from '@/lib/sanitize'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import SubmissionRequiredDocuments from '@/components/shared/SubmissionRequiredDocuments.vue'
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import Spinner from '@/components/ui/Spinner.vue'

useMeta({ title: 'Detail Penutupan — Data Asuransi' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const detail = ref({})
const data = ref({})
const requiredDocuments = ref([])
const loading = ref(true)

const role = computed(() => auth.user?.role || session.role)
const canNotify = computed(() => !['Reassurance', 'Retrosesi'].includes(role.value))
const partnerId = computed(() => Number(session.partnerId || auth.user?.partner_id || data.value.partner_id || 0))
const showBroker = computed(() => [26, 28, 29].includes(partnerId.value))
const showBpdBali = computed(() => partnerId.value === 16)
const showChubbDecision = computed(() => (
  detail.value.app === 'chubb' && ['Insurance', 'Admin'].includes(role.value)
))
const mainBenefits = computed(() => (
  Array.isArray(data.value.main_benefit) ? data.value.main_benefit : []
))

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil wajib didapat lebih dahulu karena role mengatur notifikasi dan data Chubb.
    if (!user) return
    const [submission, insurance, documents] = await Promise.all([
      getSubmissionDebitur(id),
      getSubmissionInsurance(id),
      getSubmissionRequiredDocuments(id),
    ])
    detail.value = submission
    data.value = insurance
    requiredDocuments.value = documents
  } finally {
    loading.value = false
  }
})

function downloadCreditContract() {
  if (detail.value.credit_contract) {
    window.open(safeUrl(detail.value.credit_contract), '_blank', 'noopener')
  }
}
</script>

<template>
  <DetailTabsLayout :tabs="penutupanDetailTabs" :id="id" title="Detail Penutupan" :back="{ name: 'list-data-pengajuan-non-medis' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-5">
      <SubmissionRequiredDocuments :submission-id="id" :documents="requiredDocuments" :can-notify="canNotify" />

      <Card title="Status Pengajuan">
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoField label="Status Debitur" :value="data.acceptance_status_description || data.acceptance_status" />
          <InfoField label="Tipe Pengajuan" :value="data.submission_status" />
          <InfoField v-if="data.submission_status === 'medis'" label="Medis" :value="data.cbc_rate" />
          <InfoField v-if="showChubbDecision" label="Waktu Update Keputusan" :value="detail.outbound_time" />
          <InfoField v-if="showChubbDecision" label="Direktori Inbound" :value="detail.inbound_dir" />
        </dl>
      </Card>

      <Card title="Asuransi">
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Perusahaan/Client" :value="data.partner_name" />
          <InfoField label="Cabang" :value="data.member_name" />
          <InfoField label="Uang Pertanggungan" :value="rupiah(data.sum_insured)" />
          <InfoField label="Asuransi" :value="data.insurance_name" />
          <InfoField v-if="showBroker" label="Nama Broker" :value="data.broker_name" />
          <InfoField v-if="partnerId === 26" label="Kode Unik Broker" :value="data.submission_unique_code" />
          <InfoField v-if="partnerId === 26" label="Kode AO" :value="data.submission_number" />
          <InfoField label="Nama Produk" :value="data.product_name" />
          <InfoField v-if="showBpdBali" label="Nomor Pengajuan Kredit" :value="data.submission_number" />
          <InfoField label="No. Akad" :value="data.contract_number" />
          <InfoField label="Nomor Sertifikat" :value="data.certificate_number" />
          <InfoField v-if="showBpdBali" label="Tanggal Pengajuan Asuransi" :value="data.submission_date" />
          <InfoField label="Mulai Asuransi" :value="data.start_date" />
          <InfoField label="Akhir Asuransi" :value="data.end_date" />
          <InfoField label="Masa Asuransi" :value="data.insurance_period ? `${data.insurance_period} Bulan` : ''" />
          <InfoField label="Nomor PPAJK" :value="data.ppajk_number" />
          <InfoField label="Kode Unik e-HD" :value="data.ehd_number" />
          <InfoField label="Keterangan" :value="data.description" />
          <InfoField label="Status Kehamilan" :value="data.pregnancy_status" />
        </dl>
      </Card>

      <Card title="PIC">
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Nama PIC" :value="data.pic_name" />
          <InfoField label="Email PIC" :value="data.pic_email" />
          <InfoField label="Nomor HP PIC" :value="data.pic_phone" />
        </dl>
      </Card>

      <Card title="Asuransi Jiwa">
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoField label="Rate" :value="data.rate ?? data.premium_rate" />
          <InfoField label="Premi" :value="rupiah(data.total_premium)" />
          <InfoField label="Premi EM/EP" :value="rupiah(data.extra_premium)" />
          <InfoField label="Baki Debet" :value="rupiah(data.debit_tray)" />
        </dl>
      </Card>

      <Card title="Agunan">
        <InfoField label="Agunan" :value="data.collateral" />
      </Card>

      <Card title="Manfaat">
        <div v-if="mainBenefits.length" class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label v-for="(benefit, i) in mainBenefits" :key="i" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked disabled class="h-4 w-4 rounded border-slate-300" />
            {{ benefit }}
          </label>
        </div>
      </Card>

      <Card v-if="detail.credit_contract" title="Unduh Foto Akad Kredit Bank">
        <button class="btn-icon btn-ghost text-primary-500" title="Unduh Foto Akad Kredit Bank" @click="downloadCreditContract">
          <Download class="h-5 w-5" />
        </button>
      </Card>
    </div>
  </DetailTabsLayout>
</template>

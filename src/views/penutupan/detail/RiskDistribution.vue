<script setup>
/**
 * DETAIL PENUTUPAN — PENYEBARAN / DIAGRAM RISIKO.
 * Endpoint sumber: submission/diversified-client-risk/{id}.
 *
 * Source lama memakai VueFlow untuk diagram. Di port ini data dan relasinya
 * tetap sama, tetapi diagram dirender dengan HTML/CSS agar tidak menambah
 * dependency sebelum seluruh parity data selesai.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  getDiversifiedClientRisk,
  getSubmissionDebitur,
  getSubmissionRequiredDocuments,
} from '@/lib/services/submission'
import { formatNumber, rupiah } from '@/lib/format'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import Spinner from '@/components/ui/Spinner.vue'
import SubmissionRequiredDocuments from '@/components/shared/SubmissionRequiredDocuments.vue'

const props = defineProps({
  mode: { type: String, default: 'table' }, // table | diagram
})

useMeta({ title: props.mode === 'diagram' ? 'Detail Penutupan — Diagram Risiko' : 'Detail Penutupan — Penyebaran Risiko' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const loading = ref(true)
const risk = ref({})
const debitur = ref({})
const requiredDocuments = ref([])
const canNotify = ref(false)

const assurance = computed(() => risk.value?.assurance || {})
const coassurances = computed(() => assurance.value?.coassurance || [])
const reassurances = computed(() => assurance.value?.reassurance || [])

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil wajib tersedia sebelum data risiko diminta karena scope role harus terjaga.
    if (!user) return
    canNotify.value = !['Reassurance', 'Retrosesi'].includes(user.role || session.role)
    const [riskData, debiturData, documents] = await Promise.all([
      getDiversifiedClientRisk(id),
      getSubmissionDebitur(id),
      getSubmissionRequiredDocuments(id),
    ])
    risk.value = riskData
    debitur.value = debiturData
    requiredDocuments.value = documents
  } finally {
    loading.value = false
  }
})

function extraPremium(premium) {
  return Number(premium || 0) * Number(risk.value?.extra_premium_rate || 0) / 100
}

function nodeLabel(item, type) {
  return item?.[`${type}_name`] || item?.assurance_name || '-'
}

function nodeAmount(item) {
  return item?.sum_insured ? rupiah(item.sum_insured) : '-'
}
</script>

<template>
  <DetailTabsLayout
    :tabs="penutupanDetailTabs"
    :id="id"
    title="Detail Penutupan"
    :back="{ name: 'list-data-pengajuan-non-medis' }"
  >
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-5">
      <SubmissionRequiredDocuments :submission-id="id" :documents="requiredDocuments" :can-notify="canNotify" />
      <Card title="Data Debitur">
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoField label="NIK" :value="debitur.id_card_number" />
          <InfoField label="Nama Debitur" :value="risk.debitur_name || debitur.debitur_name" />
          <InfoField label="Total Uang Pertanggungan" :value="rupiah(risk.total_sum_insured)" />
          <InfoField label="Ekstra Premi EM/EP" :value="`${risk.extra_premium_rate || 0} %`" />
          <InfoField label="Premi Standar" :value="rupiah(risk.premium)" />
          <InfoField label="Ekstra Premi" :value="rupiah(extraPremium(risk.premium))" />
          <InfoField label="Total Premi" :value="rupiah(risk.total_premium)" />
        </dl>
      </Card>

      <template v-if="mode === 'table'">
        <Card title="Perusahaan Asuransi">
          <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField label="Nama Asuransi" :value="assurance.assurance_name" />
            <InfoField label="Persentase UP Ditanggung" :value="`${assurance.sum_insured_percentage || 0} %`" />
            <InfoField label="Uang Pertanggungan" :value="rupiah(assurance.sum_insured)" />
            <InfoField label="Tarif Premi" :value="`${assurance.premium_rate || 0} %`" />
            <InfoField label="Premi Standar" :value="rupiah(assurance.premium)" />
            <InfoField label="Ekstra Premi" :value="rupiah(extraPremium(assurance.premium))" />
            <InfoField label="Total Premi" :value="rupiah(assurance.total_premium)" />
          </dl>
        </Card>

        <Card title="Koasuransi">
          <div v-if="!coassurances.length" class="text-sm text-slate-500">Tidak ada data koasuransi.</div>
          <div v-else class="space-y-4">
            <div v-for="(co, i) in coassurances" :key="i" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <h4 class="mb-3 font-semibold text-slate-800 dark:text-slate-100">{{ co.coassurance_name }}</h4>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Persentase UP" :value="`${co.sum_insured_percentage || 0} %`" />
                <InfoField label="Uang Pertanggungan" :value="rupiah(co.sum_insured)" />
                <InfoField label="Tarif Premi" :value="`${co.premium_rate || 0} %`" />
                <InfoField label="Premi Standar" :value="rupiah(co.premium)" />
                <InfoField label="Ekstra Premi" :value="rupiah(extraPremium(co.premium))" />
                <InfoField label="Total Premi" :value="rupiah(co.total_premium)" />
              </dl>
            </div>
          </div>
        </Card>

        <Card title="Reasuransi dan Retrosesi">
          <div v-if="!reassurances.length && coassurances.every((c) => !(c.reassurance || []).length)" class="text-sm text-slate-500">
            Tidak ada data reasuransi.
          </div>
          <div v-else class="space-y-4">
            <div v-for="(re, i) in reassurances" :key="`re-${i}`" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <h4 class="mb-3 font-semibold text-slate-800 dark:text-slate-100">{{ re.reassurance_name }}</h4>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Uang Pertanggungan" :value="rupiah(re.sum_insured)" />
                <InfoField label="Tarif Premi" :value="`${re.premium_rate || 0} %`" />
                <InfoField label="Premi Standar" :value="rupiah(re.premium)" />
                <InfoField label="Ekstra Premi" :value="rupiah(extraPremium(re.premium))" />
                <InfoField label="Total Premi" :value="rupiah(re.total_premium)" />
              </dl>
              <div v-if="(re.retrosesi || []).length" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div v-for="(rt, rti) in re.retrosesi" :key="rti" class="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                  <div class="font-medium">{{ rt.retrosesi_name }}</div>
                  <div class="text-sm text-slate-500">UP {{ rupiah(rt.sum_insured) }} · Premi {{ rupiah(rt.total_premium) }}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </template>

      <Card v-else title="Diagram Penyebaran Risiko">
        <div class="overflow-x-auto">
          <div class="min-w-[760px] space-y-6">
            <div class="flex justify-center">
              <div class="risk-node bg-primary-50 text-primary-900 dark:bg-primary-500/20 dark:text-primary-100">
                <div class="font-semibold">{{ risk.debitur_name || debitur.debitur_name || '-' }}</div>
                <div class="text-xs">{{ rupiah(risk.total_sum_insured) }}</div>
              </div>
            </div>
            <div class="mx-auto h-8 w-px bg-slate-300 dark:bg-slate-600" />
            <div class="flex justify-center">
              <div class="risk-node">
                <div class="font-semibold">{{ assurance.assurance_name || '-' }}</div>
                <div class="text-xs">{{ nodeAmount(assurance) }}</div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-6">
              <div>
                <h4 class="mb-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">Koasuransi</h4>
                <div class="space-y-3">
                  <div v-for="(co, i) in coassurances" :key="i" class="risk-node mx-auto">
                    <div class="font-semibold">{{ nodeLabel(co, 'coassurance') }}</div>
                    <div class="text-xs">{{ nodeAmount(co) }}</div>
                    <div v-for="(re, ri) in co.reassurance || []" :key="ri" class="mt-3 rounded-md border border-dashed border-slate-300 p-2 text-xs dark:border-slate-600">
                      {{ nodeLabel(re, 'reassurance') }} · {{ nodeAmount(re) }}
                      <div v-for="(rt, rti) in re.retrosesi || []" :key="rti" class="mt-1 text-slate-500">
                        {{ nodeLabel(rt, 'retrosesi') }} · {{ nodeAmount(rt) }}
                      </div>
                    </div>
                  </div>
                  <div v-if="!coassurances.length" class="text-center text-sm text-slate-400">Tidak ada</div>
                </div>
              </div>
              <div>
                <h4 class="mb-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">Reasuransi</h4>
                <div class="space-y-3">
                  <div v-for="(re, i) in reassurances" :key="i" class="risk-node mx-auto">
                    <div class="font-semibold">{{ nodeLabel(re, 'reassurance') }}</div>
                    <div class="text-xs">{{ nodeAmount(re) }}</div>
                    <div v-for="(rt, rti) in re.retrosesi || []" :key="rti" class="mt-2 rounded-md border border-dashed border-slate-300 p-2 text-xs dark:border-slate-600">
                      {{ nodeLabel(rt, 'retrosesi') }} · {{ nodeAmount(rt) }}
                    </div>
                  </div>
                  <div v-if="!reassurances.length" class="text-center text-sm text-slate-400">Tidak ada</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </DetailTabsLayout>
</template>

<style scoped>
.risk-node {
  width: 260px;
  border: 1px solid rgb(203 213 225);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  background: white;
  color: rgb(51 65 85);
  box-shadow: 0 8px 24px rgb(15 23 42 / 0.06);
}
:global(.dark) .risk-node {
  background: rgb(30 41 59);
  color: rgb(226 232 240);
  border-color: rgb(71 85 105);
}
</style>

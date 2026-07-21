<script setup>
/**
 * DETAIL RESTITUSI — PENYEBARAN / DIAGRAM RISIKO.
 * Endpoint sumber: restitute/diversify/{id}. Aksi konfirmasi status mengikuti
 * legacy: Broker -> waiting_insurance_confirmation, Insurance/Reassurance/
 * Retrosesi -> confirmed_by_insurance sesuai cakupan data masing-masing.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import {
  getRestituteDiversify,
  getRestituteRequiredDocuments,
  updateRestituteDataStatus,
} from '@/lib/services/restitute'
import { rupiah } from '@/lib/format'
import { restitusiDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Spinner from '@/components/ui/Spinner.vue'
import RestituteRequiredDocuments from '@/components/shared/RestituteRequiredDocuments.vue'

const props = defineProps({
  mode: { type: String, default: 'table' }, // table | diagram
})

useMeta({ title: props.mode === 'diagram' ? 'Detail Restitusi — Diagram Risiko' : 'Detail Restitusi — Penyebaran Risiko' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const loading = ref(true)
const risk = ref({})
const user = ref(null)
const documents = ref([])
const canNotify = computed(() => !['Reassurance', 'Retrosesi'].includes(user.value?.role || session.role))

const assurance = computed(() => risk.value?.assurance || {})
const coassurances = computed(() => assurance.value?.coassurance || [])
const reassurances = computed(() => assurance.value?.reassurance || [])

onMounted(async () => {
  try {
    const currentUser = auth.user || (await auth.fetchUser())
    // Data risiko tidak diminta bila profil gagal karena tombol konfirmasi berscope ID role.
    if (!currentUser) return
    const [riskData, required] = await Promise.all([
      getRestituteDiversify(id),
      getRestituteRequiredDocuments(id),
    ])
    risk.value = riskData
    user.value = currentUser
    documents.value = required
  } finally {
    loading.value = false
  }
})

function statusVariant(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('tolak')) return 'danger'
  if (t.includes('confirm') || t.includes('diterima')) return 'success'
  if (t.includes('waiting') || t.includes('proses')) return 'warning'
  return 'primary'
}

function nextStatus(item) {
  if (!item || !user.value) return null
  if (user.value.role === 'Broker' && item.restitute_status === 'waiting_broker_confirmation' && Number(item.broker_id) === Number(user.value.broker_id)) {
    return 'waiting_insurance_confirmation'
  }
  if (user.value.role === 'Insurance' && item.restitute_status === 'waiting_insurance_confirmation' && Number(item.insurance_company_id) === Number(user.value.insurance_company_id)) {
    return 'confirmed_by_insurance'
  }
  if (user.value.role === 'Reassurance' && item.restitute_status === 'waiting_insurance_confirmation' && Number(item.reassurance_id) === Number(user.value.reassurance_id)) {
    return 'confirmed_by_insurance'
  }
  if (user.value.role === 'Retrosesi' && item.restitute_status === 'waiting_insurance_confirmation' && Number(item.retrosesi_id) === Number(user.value.retrosesi_id)) {
    return 'confirmed_by_insurance'
  }
  return null
}

async function confirmItem(item) {
  const status = nextStatus(item)
  if (!status || !item?.data_restitute_id) return
  try {
    await updateRestituteDataStatus(item.data_restitute_id, {
      restitute_status: status,
      user_id: parseInt(session.userId, 10),
    })
    await window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
    risk.value = await getRestituteDiversify(id)
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  }
}

function nodeLabel(item, type) {
  return item?.[`${type}_name`] || item?.assurance_name || '-'
}
</script>

<template>
  <DetailTabsLayout :tabs="restitusiDetailTabs" :id="id" title="Detail Restitusi" :back="{ name: 'list-restitusi' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-5">
      <RestituteRequiredDocuments :restitute-id="id" :documents="documents" :can-notify="canNotify" />
      <Card title="Data Debitur">
        <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoField label="NIK" :value="risk.id_card_number" />
          <InfoField label="Nama Debitur" :value="risk.debitur_name" />
          <InfoField label="Total Uang Pertanggungan" :value="rupiah(risk.total_sum_insured)" />
          <InfoField label="Sisa Masa Asuransi" :value="risk.month_remainder ? `${risk.month_remainder} Bulan` : ''" />
          <InfoField label="Periode Asuransi" :value="risk.insurance_period ? `${risk.insurance_period} Bulan` : ''" />
          <InfoField label="Total Premi Restitusi" :value="rupiah(risk.total_restitute_premium)" />
        </dl>
      </Card>

      <template v-if="mode === 'table'">
        <Card title="Perusahaan Asuransi">
          <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField label="Nama Asuransi" :value="assurance.assurance_name" />
            <InfoField label="Uang Pertanggungan" :value="rupiah(assurance.sum_insured)" />
            <InfoField label="Premi Restitusi" :value="rupiah(assurance.restitute_premium)" />
            <InfoField label="Formula" :value="assurance.formula" />
          </dl>
          <Badge v-if="assurance.restitute_status_description" :variant="statusVariant(assurance.restitute_status)">
            {{ assurance.restitute_status_description }}
          </Badge>
        </Card>

        <Card title="Koasuransi">
          <div v-if="!coassurances.length" class="text-sm text-slate-500">Tidak ada data koasuransi.</div>
          <div v-else class="space-y-4">
            <div v-for="(co, i) in coassurances" :key="i" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 class="font-semibold text-slate-800 dark:text-slate-100">{{ co.coassurance_name }}</h4>
                <BaseButton v-if="nextStatus(co)" size="sm" @click="confirmItem(co)">Konfirmasi</BaseButton>
              </div>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Uang Pertanggungan" :value="rupiah(co.sum_insured)" />
                <InfoField label="Premi Restitusi" :value="rupiah(co.restitute_premium)" />
                <InfoField label="Formula" :value="co.formula" />
                <InfoField label="Status" :value="co.restitute_status_description" />
              </dl>
              <div v-if="(co.reassurance || []).length" class="mt-4 space-y-3">
                <div v-for="(re, ri) in co.reassurance" :key="ri" class="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="font-medium">{{ re.reassurance_name }}</div>
                    <BaseButton v-if="nextStatus(re)" size="sm" @click="confirmItem(re)">Konfirmasi</BaseButton>
                  </div>
                  <div class="mt-1 text-sm text-slate-500">Premi {{ rupiah(re.restitute_premium) }} · {{ re.restitute_status_description }}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Reasuransi dan Retrosesi">
          <div v-if="!reassurances.length" class="text-sm text-slate-500">Tidak ada data reasuransi.</div>
          <div v-else class="space-y-4">
            <div v-for="(re, i) in reassurances" :key="i" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 class="font-semibold text-slate-800 dark:text-slate-100">{{ re.reassurance_name }}</h4>
                <BaseButton v-if="nextStatus(re)" size="sm" @click="confirmItem(re)">Konfirmasi</BaseButton>
              </div>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Uang Pertanggungan" :value="rupiah(re.sum_insured)" />
                <InfoField label="Premi Restitusi" :value="rupiah(re.restitute_premium)" />
                <InfoField label="Formula" :value="re.formula" />
                <InfoField label="Status" :value="re.restitute_status_description" />
              </dl>
              <div v-if="(re.retrosesi || []).length" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div v-for="(rt, rti) in re.retrosesi" :key="rti" class="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="font-medium">{{ rt.retrosesi_name }}</div>
                    <BaseButton v-if="nextStatus(rt)" size="sm" @click="confirmItem(rt)">Konfirmasi</BaseButton>
                  </div>
                  <div class="mt-1 text-sm text-slate-500">Premi {{ rupiah(rt.restitute_premium) }} · {{ rt.restitute_status_description }}</div>
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
                <div class="font-semibold">{{ risk.debitur_name || '-' }}</div>
                <div class="text-xs">{{ rupiah(risk.total_restitute_premium) }}</div>
              </div>
            </div>
            <div class="mx-auto h-8 w-px bg-slate-300 dark:bg-slate-600" />
            <div class="flex justify-center">
              <div class="risk-node">
                <div class="font-semibold">{{ assurance.assurance_name || '-' }}</div>
                <div class="text-xs">{{ rupiah(assurance.restitute_premium) }}</div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-6">
              <div>
                <h4 class="mb-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">Koasuransi</h4>
                <div class="space-y-3">
                  <div v-for="(co, i) in coassurances" :key="i" class="risk-node mx-auto">
                    <div class="font-semibold">{{ nodeLabel(co, 'coassurance') }}</div>
                    <div class="text-xs">{{ rupiah(co.restitute_premium) }}</div>
                    <div v-for="(re, ri) in co.reassurance || []" :key="ri" class="mt-3 rounded-md border border-dashed border-slate-300 p-2 text-xs dark:border-slate-600">
                      {{ nodeLabel(re, 'reassurance') }} · {{ rupiah(re.restitute_premium) }}
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
                    <div class="text-xs">{{ rupiah(re.restitute_premium) }}</div>
                    <div v-for="(rt, rti) in re.retrosesi || []" :key="rti" class="mt-2 rounded-md border border-dashed border-slate-300 p-2 text-xs dark:border-slate-600">
                      {{ nodeLabel(rt, 'retrosesi') }} · {{ rupiah(rt.restitute_premium) }}
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

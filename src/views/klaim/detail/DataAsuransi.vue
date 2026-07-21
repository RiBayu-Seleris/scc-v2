<script setup>
/**
 * DETAIL KLAIM — TAB DATA ASURANSI.
 * Data dari claim/detail-insurance/{id}. Field inti via AsuransiInfo,
 * ditambah info kejadian klaim.
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { getClaimDebitur, getClaimInsurance, getClaimRequiredDocuments } from '@/lib/services/claim'
import { klaimDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import AsuransiInfo from '@/components/shared/AsuransiInfo.vue'
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import Spinner from '@/components/ui/Spinner.vue'
import ClaimRequiredDocuments from '@/components/shared/ClaimRequiredDocuments.vue'
import { rupiah } from '@/lib/format'

useMeta({ title: 'Detail Klaim — Data Asuransi' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const data = ref({})
const debitur = ref({})
const documents = ref([])
const loading = ref(true)
const canNotify = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil menentukan gating notifikasi dan wajib diperoleh sebelum detail klaim.
    if (!user) return
    const [insurance, profile, required] = await Promise.all([
      getClaimInsurance(id),
      getClaimDebitur(id),
      getClaimRequiredDocuments(id),
    ])
    data.value = insurance
    debitur.value = profile
    documents.value = required
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
    <div v-else class="space-y-5">
      <ClaimRequiredDocuments :claim-id="id" :documents="documents" :can-notify="canNotify" />
      <AsuransiInfo :data="data">
      <template #extra>
        <Card title="Status Klaim">
          <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Status" :value="data.claim_status_description" />
            <InfoField label="No. Registrasi" :value="data.register_number" />
            <InfoField label="Nama Debitur" :value="debitur.debitur_name" />
          </dl>
        </Card>
        <Card title="Info Kejadian">
          <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Jenis Klaim" :value="data.claim_type" />
            <InfoField label="Tanggal Kejadian" :value="data.date_incident" />
            <InfoField label="Tempat Kejadian" :value="data.place_incident" />
            <InfoField label="Alasan Klaim" :value="data.claim_reasoning" />
            <InfoField label="Jumlah Diajukan" :value="rupiah(data.claim_submitted)" />
            <InfoField label="Jumlah Dibayar" :value="rupiah(data.claim_paid)" />
          </dl>
        </Card>
        <Card title="Nilai Pertanggungan">
          <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Uang Pertanggungan" :value="rupiah(data.sum_insured)" />
            <InfoField label="Premi" :value="rupiah(data.premium)" />
            <InfoField label="Premi EM/EP" :value="rupiah(data.extra_premium)" />
          </dl>
        </Card>
      </template>
      </AsuransiInfo>
    </div>
  </DetailTabsLayout>
</template>

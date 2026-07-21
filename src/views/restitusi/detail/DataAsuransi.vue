<script setup>
/**
 * DETAIL RESTITUSI — TAB DATA ASURANSI.
 * Data dari restitute/detail-insurance/{id}. Field inti ditampilkan via AsuransiInfo,
 * ditambah info khusus restitusi (tanggal, status, sisa bulan).
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { getRestituteInsurance, getRestituteRequiredDocuments } from '@/lib/services/restitute'
import { restitusiDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import AsuransiInfo from '@/components/shared/AsuransiInfo.vue'
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import Spinner from '@/components/ui/Spinner.vue'
import RestituteRequiredDocuments from '@/components/shared/RestituteRequiredDocuments.vue'
import { rupiah } from '@/lib/format'

useMeta({ title: 'Detail Restitusi — Data Asuransi' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const data = ref({})
const documents = ref([])
const loading = ref(true)
const canNotify = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil menentukan gating notifikasi dan harus diperoleh sebelum detail.
    if (!user) return
    const [insurance, required] = await Promise.all([
      getRestituteInsurance(id),
      getRestituteRequiredDocuments(id),
    ])
    data.value = insurance
    documents.value = required
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DetailTabsLayout :tabs="restitusiDetailTabs" :id="id" title="Detail Restitusi" :back="{ name: 'list-restitusi' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>
    <div v-else class="space-y-5">
      <RestituteRequiredDocuments :restitute-id="id" :documents="documents" :can-notify="canNotify" />
      <AsuransiInfo :data="data">
      <template #extra>
        <Card title="Info Restitusi">
          <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Tanggal Restitusi" :value="data.restitute_date" />
            <InfoField label="Status Restitusi" :value="data.restitute_status" />
            <InfoField label="Sisa Bulan" :value="data.month_remainder" />
            <InfoField label="Premi Restitusi" :value="rupiah(data.restitute_premium)" />
            <InfoField label="No. Registrasi" :value="data.register_number" />
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

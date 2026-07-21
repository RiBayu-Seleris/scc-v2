<script setup>
/**
 * DETAIL KLAIM — TAB SLA.
 * Menampilkan tahapan SLA dari claim/sla/{id}.
 */
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { getClaimRequiredDocuments, getClaimSla } from '@/lib/services/claim'
import { klaimDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import SlaTable from '@/components/shared/SlaTable.vue'
import Spinner from '@/components/ui/Spinner.vue'
import ClaimRequiredDocuments from '@/components/shared/ClaimRequiredDocuments.vue'

useMeta({ title: 'Detail Klaim — SLA' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const stages = ref([])
const documents = ref([])
const loading = ref(true)
const canNotify = ref(false)

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // SLA tidak diminta bila profil role gagal diperoleh.
    if (!user) return
    canNotify.value = !['Reassurance', 'Retrosesi'].includes(user.role || session.role)
    const [slaData, required] = await Promise.all([
      getClaimSla(id),
      getClaimRequiredDocuments(id),
    ])
    stages.value = slaData
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
      <SlaTable :stages="stages" />
    </div>
  </DetailTabsLayout>
</template>

<script setup>
/**
 * DETAIL RESTITUSI — TAB SLA.
 * Menampilkan tahapan SLA dari restitute/sla/{id}.
 */
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { getRestituteRequiredDocuments, getRestituteSla } from '@/lib/services/restitute'
import { restitusiDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import SlaTable from '@/components/shared/SlaTable.vue'
import Spinner from '@/components/ui/Spinner.vue'
import RestituteRequiredDocuments from '@/components/shared/RestituteRequiredDocuments.vue'

useMeta({ title: 'Detail Restitusi — SLA' })

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
      getRestituteSla(id),
      getRestituteRequiredDocuments(id),
    ])
    stages.value = slaData
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
      <SlaTable :stages="stages" />
    </div>
  </DetailTabsLayout>
</template>

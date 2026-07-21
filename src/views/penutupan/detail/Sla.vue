<script setup>
/**
 * DETAIL PENUTUPAN — SLA.
 * Endpoint sumber: submission/sla/{id}.
 */
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { getSubmissionRequiredDocuments, getSubmissionSla } from '@/lib/services/submission'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import SlaTable from '@/components/shared/SlaTable.vue'
import Spinner from '@/components/ui/Spinner.vue'
import SubmissionRequiredDocuments from '@/components/shared/SubmissionRequiredDocuments.vue'

useMeta({ title: 'Detail Penutupan — SLA' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const stages = ref([])
const requiredDocuments = ref([])
const loading = ref(true)
const canNotify = ref(false)

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil wajib tersedia karena role menentukan akses email notifikasi.
    if (!user) return
    canNotify.value = !['Reassurance', 'Retrosesi'].includes(user.role || session.role)
    const [slaData, documents] = await Promise.all([
      getSubmissionSla(id),
      getSubmissionRequiredDocuments(id),
    ])
    stages.value = slaData
    requiredDocuments.value = documents
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DetailTabsLayout :tabs="penutupanDetailTabs" :id="id" title="Detail Penutupan" :back="{ name: 'list-data-pengajuan-non-medis' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>
    <div v-else class="space-y-5">
      <SubmissionRequiredDocuments :submission-id="id" :documents="requiredDocuments" :can-notify="canNotify" />
      <SlaTable :stages="stages" />
    </div>
  </DetailTabsLayout>
</template>

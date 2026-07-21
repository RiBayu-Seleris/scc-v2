<script setup>
/**
 * DETAIL PENUTUPAN — DOKUMEN MEDIS TAMBAHAN.
 * Endpoint sumber:
 * - submission/document/{id}
 * - submission/document/upload
 * - submission/document/medis/{documentId}
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  deleteSubmissionMedicalDocument,
  getSubmissionRequiredDocuments,
  submissionMedicalDocumentsFetcher,
  uploadSubmissionMedicalDocument,
} from '@/lib/services/submission'
import { uploadFile } from '@/lib/services/upload'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import DocumentTab from '@/components/shared/DocumentTab.vue'
import SubmissionRequiredDocuments from '@/components/shared/SubmissionRequiredDocuments.vue'

useMeta({ title: 'Detail Penutupan — Dokumen Medis Tambahan' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const requiredDocuments = ref([])
const profileReady = ref(false)
const listFetcher = submissionMedicalDocumentsFetcher(id)
const canManage = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

onMounted(async () => {
  const user = auth.user || (await auth.fetchUser())
  // Profil wajib tersedia karena role menentukan hak unggah dan hapus dokumen.
  if (!user) return
  requiredDocuments.value = await getSubmissionRequiredDocuments(id)
  profileReady.value = true
})

async function submitUpload({ file, documentType, documentName, description }) {
  const path = await uploadFile(file)
  return uploadSubmissionMedicalDocument({
    id,
    userId: session.userId,
    documentType,
    documentName,
    description,
    path,
  })
}
</script>

<template>
  <DetailTabsLayout :tabs="penutupanDetailTabs" :id="id" title="Detail Penutupan" :back="{ name: 'list-data-pengajuan-non-medis' }">
    <div v-if="profileReady" class="space-y-5">
      <SubmissionRequiredDocuments :submission-id="id" :documents="requiredDocuments" :can-notify="canManage" />
      <DocumentTab
        :list-fetcher="listFetcher"
        :document-types="['Medis', 'Pelengkap', 'Lainnya']"
        :required-documents="requiredDocuments"
        :submit-upload="submitUpload"
        :delete-fn="deleteSubmissionMedicalDocument"
        :can-manage="canManage"
      />
    </div>
  </DetailTabsLayout>
</template>

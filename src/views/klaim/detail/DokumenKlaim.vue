<script setup>
/**
 * DETAIL KLAIM — TAB DOKUMEN.
 * List + unggah + unduh + hapus dokumen klaim (via DocumentTab).
 * Role Reassurance/Retrosesi hanya boleh mengunduh.
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  claimDocumentsFetcher,
  getClaimRequiredDocuments,
  uploadClaimDocument,
  deleteClaimDocument,
} from '@/lib/services/claim'
import { uploadFile } from '@/lib/services/upload'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import ClaimRequiredDocuments from '@/components/shared/ClaimRequiredDocuments.vue'
import { klaimDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import DocumentTab from '@/components/shared/DocumentTab.vue'

useMeta({ title: 'Detail Klaim — Dokumen' })

const route = useRoute()
const auth = useAuthStore()
const id = route.params.id
const session = getSession()

const requiredDocuments = ref([])
const listFetcher = claimDocumentsFetcher(id)
const documentTypes = ['Klaim', 'Pelengkap', 'Lainnya']
const extraColumns = [{ key: 'ai_validation', label: 'Validasi' }]
const profileReady = ref(false)
const canManage = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

onMounted(async () => {
  const user = auth.user || (await auth.fetchUser())
  // Daftar dokumen tidak diminta bila profil role gagal.
  if (!user) return
  requiredDocuments.value = await getClaimRequiredDocuments(id)
  profileReady.value = true
})

async function submitUpload({ file, documentType, documentName, description }) {
  const path = await uploadFile(file)
  return uploadClaimDocument({ id, documentType, documentName, description, path })
}
</script>

<template>
  <DetailTabsLayout :tabs="klaimDetailTabs" :id="id" title="Detail Klaim" :back="{ name: 'list-klaim-register' }">
    <div v-if="profileReady" class="space-y-5">
      <ClaimRequiredDocuments :claim-id="id" :documents="requiredDocuments" :can-notify="canManage" />
      <DocumentTab
        :list-fetcher="listFetcher"
        :document-types="documentTypes"
        :required-documents="requiredDocuments"
        :can-manage="canManage"
        :submit-upload="submitUpload"
        :delete-fn="deleteClaimDocument"
        :require-document-name="false"
        :extra-columns="extraColumns"
      />
    </div>
  </DetailTabsLayout>
</template>

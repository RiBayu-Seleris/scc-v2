<script setup>
/**
 * DETAIL PENUTUPAN — EM/EP.
 * Fungsi utama:
 * - store data EM/EP ke submission/em-ep/store
 * - list/upload dokumen EM/EP ke submission/document/em-ep/*
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { formatNumber, parseNumber, rupiah } from '@/lib/format'
import {
  getSubmissionInsurance,
  getSubmissionRequiredDocuments,
  storeSubmissionEmEp,
  submissionEmEpDocumentsFetcher,
  uploadSubmissionEmEpDocument,
} from '@/lib/services/submission'
import { uploadFile } from '@/lib/services/upload'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import DocumentTab from '@/components/shared/DocumentTab.vue'
import SubmissionRequiredDocuments from '@/components/shared/SubmissionRequiredDocuments.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

useMeta({ title: 'Detail Penutupan — EM/EP' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id

const requiredDocuments = ref([])
const insurance = ref({})
const condition = ref(null)
const type = ref(null)
const addedPercentagePremium = ref('')
const status = ref(null)
const description = ref('')
const saving = ref(false)
const profileReady = ref(false)

const conditionOptions = ['Standar', 'Substandar', 'Decline']
const typeOptions = ['EM']
const statusOptions = ['Medical Status', 'Over Insurance']
const listFetcher = submissionEmEpDocumentsFetcher(id)
const canManage = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

// SCC menghitung EM/EP dari premi dasar, bukan dari plafond pertanggungan.
const premiumOld = computed(() => Number(insurance.value?.premium || 0))
const extraPremiumRate = computed(() => Number(insurance.value?.extra_premium_rate || 0))
const addedPremium = computed(() => {
  const added = Number(addedPercentagePremium.value || 0)
  return premiumOld.value * added / 100
})
const totalPremium = computed(() => {
  const totalRate = extraPremiumRate.value + Number(addedPercentagePremium.value || 0)
  return premiumOld.value + (premiumOld.value * totalRate / 100)
})

onMounted(async () => {
  const user = auth.user || (await auth.fetchUser())
  // Profil wajib tersedia karena role menentukan apakah form boleh diubah.
  if (!user) return
  const [docs, insuranceData] = await Promise.all([
    getSubmissionRequiredDocuments(id),
    getSubmissionInsurance(id),
  ])
  requiredDocuments.value = docs
  insurance.value = insuranceData
  profileReady.value = true
})

async function submitUpload({ file, documentType, documentName, description }) {
  const path = await uploadFile(file)
  return uploadSubmissionEmEpDocument({ id, documentType, documentName, description, path })
}

async function save() {
  if (!canManage.value) return
  if (!condition.value || !type.value || !status.value) {
    return window.Swal.fire({ icon: 'error', text: 'Kondisi, tipe, dan status wajib diisi', padding: '1em' })
  }
  saving.value = true
  try {
    const payload = {
      user_id: parseInt(session.userId, 10),
      submission_id: parseInt(id, 10),
      condition: condition.value,
      type: type.value,
      added_percentage_premium: Number(addedPercentagePremium.value || 0),
      status: status.value,
      premium: parseNumber(String(formatNumber(totalPremium.value))),
      description: description.value,
    }
    const { data } = await storeSubmissionEmEp(payload)
    if (data.status === 200) {
      window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
    } else {
      window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
    }
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DetailTabsLayout :tabs="penutupanDetailTabs" :id="id" title="Detail Penutupan" :back="{ name: 'list-data-pengajuan-non-medis' }">
    <div v-if="profileReady" class="space-y-5">
      <SubmissionRequiredDocuments :submission-id="id" :documents="requiredDocuments" :can-notify="canManage" />
      <Card title="EM/EP">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BaseSelect v-model="condition" :options="conditionOptions" label="Condition" placeholder="Pilih Condition" required :disabled="!canManage" />
          <BaseSelect v-model="type" :options="typeOptions" label="Type" placeholder="Pilih Type" required :disabled="!canManage" />
          <BaseSelect v-model="status" :options="statusOptions" label="Status" placeholder="Pilih Status" required :disabled="!canManage" />
          <div>
            <label class="form-label">Extra Premium Rate</label>
            <input :value="extraPremiumRate" class="form-input" disabled />
          </div>
          <div>
            <label class="form-label">Added Percentage Premium</label>
            <input v-model="addedPercentagePremium" class="form-input" inputmode="numeric" :disabled="!canManage || condition !== 'Substandar'" @input="addedPercentagePremium = String(addedPercentagePremium).replace(/\\D/g, '')" />
          </div>
          <div>
            <label class="form-label">Basic Premium</label>
            <input :value="rupiah(premiumOld)" class="form-input" disabled />
          </div>
          <div>
            <label class="form-label">Added Premium</label>
            <input :value="rupiah(addedPremium)" class="form-input" disabled />
          </div>
          <div>
            <label class="form-label">Premium</label>
            <input :value="rupiah(totalPremium)" class="form-input" disabled />
          </div>
          <div class="lg:col-span-3">
            <label class="form-label">Keterangan</label>
            <input v-model="description" class="form-input" :disabled="!canManage" @input="description = description?.toUpperCase()" />
          </div>
        </div>
        <div v-if="canManage" class="mt-5 flex justify-end">
          <BaseButton :loading="saving" @click="save">Simpan</BaseButton>
        </div>
      </Card>

      <DocumentTab
        :list-fetcher="listFetcher"
        :document-types="['EM', 'EP', 'SP3']"
        :required-documents="requiredDocuments"
        :submit-upload="submitUpload"
        :delete-fn="async () => null"
        :allow-delete="false"
        :can-manage="canManage"
      />
    </div>
  </DetailTabsLayout>
</template>

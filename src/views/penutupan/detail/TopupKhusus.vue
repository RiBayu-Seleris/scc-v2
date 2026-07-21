<script setup>
/**
 * DETAIL PENUTUPAN — TOPUP KHUSUS.
 * Endpoint sumber:
 * - submission/top-up/select-insurance
 * - submission/top-up
 * - upload-file
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { formatNumber, moment, parseNumber, today } from '@/lib/format'
import { getSubmissionRequiredDocuments, getTopupInsurances, storeSubmissionTopup } from '@/lib/services/submission'
import { uploadFile } from '@/lib/services/upload'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SubmissionRequiredDocuments from '@/components/shared/SubmissionRequiredDocuments.vue'

useMeta({ title: 'Detail Penutupan — Topup Khusus' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id

const insuranceOptions = ref([])
const insuranceCompanyId = ref(null)
const oldContractNumber = ref('')
const sumInsured = ref('')
const premium = ref('')
const startDate = ref(today('YYYY-MM-DD'))
const insurancePeriod = ref('')
const file = ref(null)
const saving = ref(false)
const requiredDocuments = ref([])
const profileReady = ref(false)
const canManage = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

onMounted(async () => {
  const user = auth.user || (await auth.fetchUser())
  // Profil wajib tersedia karena role menentukan apakah top up boleh disimpan.
  if (!user) return
  const [insurances, documents] = await Promise.all([
    getTopupInsurances(),
    getSubmissionRequiredDocuments(id),
  ])
  insuranceOptions.value = insurances
  requiredDocuments.value = documents
  profileReady.value = true
})

function normalizeSumInsured() {
  const n = parseNumber(sumInsured.value)
  sumInsured.value = n ? formatNumber(n) : ''
}

function normalizePremium() {
  const n = parseNumber(premium.value)
  premium.value = n ? formatNumber(n) : ''
}

async function save() {
  if (!canManage.value) return
  if (!insuranceCompanyId.value || !oldContractNumber.value || !sumInsured.value || !premium.value || !startDate.value || !insurancePeriod.value) {
    return window.Swal.fire({ icon: 'error', text: 'Semua field wajib diisi', padding: '1em' })
  }
  const selectedFile = file.value?.files?.[0]
  if (!selectedFile) return window.Swal.fire({ icon: 'error', text: 'Dokumen wajib diunggah', padding: '1em' })

  saving.value = true
  try {
    const path = await uploadFile(selectedFile)
    const { data } = await storeSubmissionTopup({
      insurance_company_id: parseInt(insuranceCompanyId.value, 10),
      submission_id: parseInt(id, 10),
      old_contract_number: oldContractNumber.value,
      sum_insured: parseNumber(sumInsured.value),
      premium: parseNumber(premium.value),
      start_date: moment(startDate.value).format('DD/MM/YYYY'),
      insurance_period: parseInt(insurancePeriod.value, 10),
      document_url: path,
    })
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
      <Card title="Topup Khusus">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BaseSelect
          v-model="insuranceCompanyId"
          :options="insuranceOptions"
          option-label="company_name"
          option-value="id"
          label="Perusahaan Asuransi"
          placeholder="Pilih Asuransi"
          required
          :disabled="!canManage"
        />
        <div>
          <label class="form-label">No. Akad Lama <span class="text-danger">*</span></label>
          <input v-model="oldContractNumber" class="form-input" :disabled="!canManage" @input="oldContractNumber = oldContractNumber?.toUpperCase()" />
        </div>
        <div>
          <label class="form-label">Uang Pertanggungan <span class="text-danger">*</span></label>
          <input v-model="sumInsured" class="form-input" :disabled="!canManage" @input="normalizeSumInsured" />
        </div>
        <div>
          <label class="form-label">Premi <span class="text-danger">*</span></label>
          <input v-model="premium" class="form-input" :disabled="!canManage" @input="normalizePremium" />
        </div>
        <div>
          <label class="form-label">Mulai Asuransi <span class="text-danger">*</span></label>
          <input v-model="startDate" type="date" class="form-input" :disabled="!canManage" />
        </div>
        <div>
          <label class="form-label">Masa Asuransi <span class="text-danger">*</span></label>
          <input v-model="insurancePeriod" type="number" class="form-input" placeholder="Bulan" :disabled="!canManage" />
        </div>
        <div class="lg:col-span-3">
          <label class="form-label">Dokumen <span class="text-danger">*</span></label>
          <input ref="file" type="file" class="form-input" :disabled="!canManage" />
        </div>
      </div>
      <div v-if="canManage" class="mt-6 flex justify-end">
        <BaseButton :loading="saving" @click="save">Simpan</BaseButton>
      </div>
      </Card>
    </div>
  </DetailTabsLayout>
</template>

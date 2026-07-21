<script setup>
/**
 * DETAIL KLAIM - HASIL ANALISA KLAIM.
 *
 * Endpoint dan payload mengikuti ehd-backoffice:
 * - GET notification/document/claim/{id}
 * - GET claim/required-document/{id}
 * - GET claim/check-analyze/{id}
 * - PUT claim/analyze/{id}
 * - PUT claim/claim-status/{id}
 *
 * TinyMCE di aplikasi lama diganti textarea agar build tetap ringan, tetapi field
 * `diagnosis_text` yang dikirim ke API tetap sama.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  analyzeClaim,
  getClaimAnalyzeCheck,
  getClaimRequiredDocuments,
  sendClaimEmailNotification,
  updateClaimStatus,
} from '@/lib/services/claim'
import { klaimDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { Check, Mail, X } from 'lucide-vue-next'

useMeta({ title: 'Detail Klaim - Hasil Analisa Klaim' })

const route = useRoute()
const auth = useAuthStore()
const id = route.params.id
const session = getSession()

const loading = ref(true)
const saving = ref(false)
const sending = ref(false)
const requiredDocuments = ref([])
const diagnosisOptions = ref([])
const claimRemainderBase = ref(0)

const content = ref('')
const diagnosisIndex = ref('')
const doctorDecision = ref(null)
const doctorDecisionOptions = ['Dibayar', 'Ditolak']
const analyzeReason = ref('')
const claimPaid = ref('')
const claimReminder = ref('')

const canManage = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

function digits(value) {
  const cleaned = String(value ?? '').replace(/\D/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

function dotted(value) {
  const n = String(value ?? '').replace(/\D/g, '')
  return n.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
}

function onClaimPaidInput() {
  claimPaid.value = dotted(claimPaid.value)
}

function selectedDiagnosis() {
  const index = diagnosisIndex.value === '' || diagnosisIndex.value === null ? -1 : Number(diagnosisIndex.value)
  return diagnosisOptions.value[index] || null
}

function onDiagnosisChange() {
  const diagnosis = selectedDiagnosis()
  if (!diagnosis) {
    claimReminder.value = dotted(claimRemainderBase.value)
    return
  }
  const percentage = Number(diagnosis.percentage || 0)
  claimReminder.value = dotted(Math.round((percentage * claimRemainderBase.value) / 100))
}

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

async function sendEmail() {
  if (!canManage.value) return
  sending.value = true
  try {
    await sendClaimEmailNotification(id)
    alert('success', 'Email Notifikasi Terkirim')
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    sending.value = false
  }
}

async function submit() {
  if (!canManage.value) return
  const diagnosis = selectedDiagnosis()
  if (!diagnosis || !doctorDecision.value || !claimPaid.value) {
    return alert('error', 'Diagnosa, keputusan dokter, dan jumlah klaim wajib diisi')
  }

  saving.value = true
  try {
    const res = await analyzeClaim(id, {
      diagnosis_text: content.value,
      diagnosis_select: diagnosis.name,
      doctor_decision: doctorDecision.value,
      analyze_reason: analyzeReason.value,
      claim_paid: digits(claimPaid.value),
    })

    if (res.data?.status === 200) {
      await updateClaimStatus(id, {
        claim_status: 'confirmed_by_insurance',
        user_id: parseInt(session.userId, 10),
      })
      window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' }).then(() => {
        window.location.reload()
      })
    } else {
      alert('error', 'Terjadi Kesalahan')
    }
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Analisa klaim tidak diminta bila profil role gagal diperoleh.
    if (!user) return
    const [required, analyze] = await Promise.all([
      getClaimRequiredDocuments(id),
      getClaimAnalyzeCheck(id),
    ])
    requiredDocuments.value = required
    diagnosisOptions.value = analyze.desc_benefit || []
    claimRemainderBase.value = Number(analyze.claim_remainder || 0)
    claimReminder.value = dotted(claimRemainderBase.value)
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
      <Card v-if="requiredDocuments.length" title="Dokumen Berikut Belum Diupload">
        <div class="mb-4 flex justify-end">
          <BaseButton v-if="canManage" variant="outline-primary" :loading="sending" @click="sendEmail">
            <Mail class="h-4 w-4" /> Kirim Email Notifikasi
          </BaseButton>
        </div>
        <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <li v-for="(d, i) in requiredDocuments" :key="i" class="flex items-center gap-2 text-sm">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full"
              :class="d.document_exist ? 'bg-success-light text-success-dark' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'"
            >
              <Check v-if="d.document_exist" class="h-4 w-4" />
              <X v-else class="h-4 w-4" />
            </span>
            <span>{{ d.document_required }}</span>
          </li>
        </ul>
      </Card>

      <Card title="Hasil Analisa Klaim">
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div class="lg:col-span-2">
            <label class="form-label">Diagnosis Text</label>
            <textarea
              v-model="content"
              class="form-input min-h-[180px]"
              :disabled="!canManage"
              placeholder="Masukkan hasil analisa klaim"
            />
          </div>

          <div>
            <label class="form-label">Diagnosa ICD10</label>
            <select v-model="diagnosisIndex" class="form-select" :disabled="!canManage" @change="onDiagnosisChange">
              <option value="">Pilih salah satu</option>
              <option v-for="(item, i) in diagnosisOptions" :key="`${item.name}-${i}`" :value="i">
                {{ item.name }} | {{ item.percentage }} %
              </option>
            </select>
          </div>

          <BaseSelect
            v-model="doctorDecision"
            :options="doctorDecisionOptions"
            label="Keputusan Dokter"
            placeholder="Pilih salah satu"
            :disabled="!canManage"
          />

          <div>
            <label class="form-label">Alasan</label>
            <input v-model="analyzeReason" type="text" class="form-input" :disabled="!canManage" placeholder="Masukan teks" />
          </div>

          <div>
            <label class="form-label">Jumlah klaim yang akan dibayarkan <span class="text-danger">*</span></label>
            <input v-model="claimPaid" type="text" class="form-input" :disabled="!canManage" placeholder="Masukan angka" @input="onClaimPaidInput" />
          </div>

          <div>
            <label class="form-label">Saran Sisa Klaim</label>
            <input v-model="claimReminder" type="text" class="form-input" disabled />
          </div>
        </div>

        <div v-if="canManage" class="mt-6 flex justify-end">
          <BaseButton variant="primary" :loading="saving" @click="submit">Simpan</BaseButton>
        </div>
      </Card>
    </div>
  </DetailTabsLayout>
</template>

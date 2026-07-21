<script setup>
/**
 * DETAIL KLAIM — TAB DATA DEBITUR.
 * Profil dari claim/detail-debitur/{id}; status (kode) dari claim/detail-insurance/{id}.
 * Aksi mengikuti PERSIS ehd-backoffice (tergantung role + status + broker_id):
 *   - Konfirmasi/Proses  PUT claim/claim-status  (waiting_broker->waiting_insurance / waiting_insurance->analyze_claim)
 *   - Konfirmasi Bayar   PUT claim/payment-status lalu status claim_paid
 *   - Ajukan Banding     PUT claim/claim-appeal lalu status claim_appeal
 *   - Konfirmasi Banding PUT claim/claim-status (analyze_claim)
 *   - Tolak Klaim        PUT claim/claim-status (claim_rejected)
 *   - Dokumen Ditolak    GET claim/rejected-document (buka berkas)
 *   - Batal Klaim        PUT claim/claim-status (unclaimed)
 * Role Reassurance/Retrosesi tidak melihat tombol aksi.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  getClaimDebitur,
  getClaimInsurance,
  getClaimRequiredDocuments,
  sendClaimEmailNotification,
  updateClaimStatus,
  updateClaimPaymentStatus,
  submitClaimAppeal,
  getClaimRejectedDocument,
} from '@/lib/services/claim'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { moment, today } from '@/lib/format'
import { safeUrl } from '@/lib/sanitize'
import { klaimDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import DebiturProfile from '@/components/shared/DebiturProfile.vue'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { CheckCircle2, XCircle, Wallet, Undo2, FileX, Ban } from 'lucide-vue-next'
import ClaimRequiredDocuments from '@/components/shared/ClaimRequiredDocuments.vue'

useMeta({ title: 'Detail Klaim — Data Debitur' })

const route = useRoute()
const auth = useAuthStore()
const id = route.params.id
const session = getSession()
let role = session.role
const userId = session.userId

const data = ref({})
const claimStatus = ref('') // kode status dari detail-insurance
const loading = ref(true)
const sending = ref(false)
const acting = ref(false)
const requiredDocuments = ref([])

const showPayModal = ref(false)
const paymentDate = ref(today('YYYY-MM-DD'))
const paymentDesc = ref('')
const showAppealModal = ref(false)
const appealReason = ref('')

const canAct = computed(() => role !== 'Reassurance' && role !== 'Retrosesi')
const brokerId = computed(() => Number(data.value.broker_id))

onMounted(load)

async function load() {
  loading.value = true
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil wajib tersedia sebelum detail klaim diminta karena semua aksi bergantung role.
    if (!user) return
    role = user.role
    const [debitur, insurance, documents] = await Promise.all([
      getClaimDebitur(id),
      getClaimInsurance(id),
      getClaimRequiredDocuments(id),
    ])
    data.value = debitur
    claimStatus.value = insurance.claim_status || ''
    requiredDocuments.value = documents
  } finally {
    loading.value = false
  }
}

// --- Kondisi & target tombol (mengikuti aslinya) ---
const confirm = computed(() => {
  if (claimStatus.value === 'waiting_broker_confirmation' && (role === 'Broker' || role === 'Admin')) {
    return { target: 'waiting_insurance_confirmation', label: 'Konfirmasi' }
  }
  if (claimStatus.value === 'waiting_insurance_confirmation' && (role === 'Insurance' || role === 'Admin')) {
    return { target: 'analyze_claim', label: 'Proses Klaim' }
  }
  return null
})
const isConfirmedByInsurance = computed(() => claimStatus.value === 'confirmed_by_insurance')
const showConfirmAppeal = computed(() => isConfirmedByInsurance.value && ['Bank', 'Branch Bank', 'Admin', 'Broker'].includes(role))
const showConfirmPayment = computed(() => {
  if (!isConfirmedByInsurance.value) return false
  if (brokerId.value !== 0 && role === 'Broker') return true
  if (brokerId.value === 0 && role === 'Bank') return true
  return false
})
const showConfirmClaimAppeal = computed(() => claimStatus.value === 'claim_appeal' && (role === 'Insurance' || role === 'Admin'))
const showRejectClaim = computed(() => isConfirmedByInsurance.value && (role === 'Insurance' || role === 'Admin'))
const showClaimAppeal = computed(() => claimStatus.value === 'claim_rejected' && ['Bank', 'Branch Bank', 'Admin'].includes(role))
const showRejectDocument = computed(() => claimStatus.value === 'claim_rejected')
const showCancel = computed(() => !(claimStatus.value === 'claim_rejected' && ['Bank', 'Branch Bank', 'Admin'].includes(role)))

const showPaymentBtn = computed(() => showConfirmAppeal.value || showConfirmPayment.value)
const showAppealBtn = computed(() => showConfirmAppeal.value || showClaimAppeal.value)
const hasAnyAction = computed(
  () => canAct.value && (confirm.value || showPaymentBtn.value || showAppealBtn.value || showConfirmClaimAppeal.value || showRejectClaim.value || showRejectDocument.value || showCancel.value),
)

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}
const uid = () => parseInt(userId, 10)

async function run(fn) {
  acting.value = true
  try {
    await fn()
    alert('success', 'Berhasil!')
    await load()
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    acting.value = false
  }
}

async function kirimEmail() {
  if (!canAct.value) return
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

const accept = () => confirm.value && run(() => updateClaimStatus(id, { claim_status: confirm.value.target, user_id: uid() }))
const tolakKlaim = () => run(() => updateClaimStatus(id, { claim_status: 'claim_rejected', user_id: uid() }))
const konfirmasiBanding = () => run(() => updateClaimStatus(id, { claim_status: 'analyze_claim', user_id: uid() }))
const batalKlaim = () => run(() => updateClaimStatus(id, { claim_status: 'unclaimed', user_id: uid() }))

async function bayar() {
  await run(async () => {
    await updateClaimPaymentStatus(id, {
      payment_date: moment(paymentDate.value).format('DD/MM/YYYY'),
      description: paymentDesc.value,
      user_id: uid(),
    })
    await updateClaimStatus(id, { claim_status: 'claim_paid', user_id: uid() })
    showPayModal.value = false
  })
}

async function ajukanBanding() {
  if (!appealReason.value) return alert('error', 'Alasan banding wajib diisi')
  await run(async () => {
    await submitClaimAppeal(id, { claim_appeal_reason: appealReason.value })
    await updateClaimStatus(id, { claim_status: 'claim_appeal', user_id: uid() })
    showAppealModal.value = false
  })
}

async function dokumenDitolak() {
  try {
    const url = await getClaimRejectedDocument(id)
    if (url) window.open(safeUrl(url), '_blank', 'noopener')
    else alert('error', 'Dokumen tidak tersedia')
  } catch {
    alert('error', 'Terjadi Kesalahan')
  }
}
</script>

<template>
  <DetailTabsLayout :tabs="klaimDetailTabs" :id="id" title="Detail Klaim" :back="{ name: 'list-klaim-register' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-5">
      <ClaimRequiredDocuments :claim-id="id" :documents="requiredDocuments" :can-notify="canAct" />
      <Card v-if="hasAnyAction">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="mr-1 text-sm font-medium text-slate-600 dark:text-slate-300">Tindakan:</span>
          <BaseButton v-if="confirm" variant="success" :loading="acting" @click="accept">
            <CheckCircle2 class="h-4 w-4" /> {{ confirm.label }}
          </BaseButton>
          <BaseButton v-if="showPaymentBtn" variant="primary" @click="showPayModal = true">
            <Wallet class="h-4 w-4" /> Konfirmasi Pembayaran
          </BaseButton>
          <BaseButton v-if="showAppealBtn" variant="warning" @click="showAppealModal = true">
            <Undo2 class="h-4 w-4" /> Ajukan Banding
          </BaseButton>
          <BaseButton v-if="showConfirmClaimAppeal" variant="success" :loading="acting" @click="konfirmasiBanding">
            <CheckCircle2 class="h-4 w-4" /> Konfirmasi Banding
          </BaseButton>
          <BaseButton v-if="showRejectClaim" variant="danger" :loading="acting" @click="tolakKlaim">
            <XCircle class="h-4 w-4" /> Tolak Klaim
          </BaseButton>
          <BaseButton v-if="showRejectDocument" variant="secondary" @click="dokumenDitolak">
            <FileX class="h-4 w-4" /> Dokumen Ditolak
          </BaseButton>
          <BaseButton v-if="showCancel" variant="ghost" :loading="acting" @click="batalKlaim">
            <Ban class="h-4 w-4" /> Batal Klaim
          </BaseButton>
        </div>
      </Card>

      <DebiturProfile :data="data" :status-value="data.claim_status_description || data.claim_status" :show-email="false" />
    </div>

    <!-- Modal pembayaran -->
    <Modal v-model="showPayModal" title="Konfirmasi Pembayaran">
      <div class="space-y-4">
        <div>
          <label class="form-label">Tanggal Pembayaran <span class="text-danger">*</span></label>
          <input v-model="paymentDate" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">Keterangan</label>
          <textarea v-model="paymentDesc" class="form-textarea" placeholder="Keterangan (opsional)"></textarea>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showPayModal = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="acting" @click="bayar">Simpan</BaseButton>
      </template>
    </Modal>

    <!-- Modal banding -->
    <Modal v-model="showAppealModal" title="Ajukan Banding">
      <div>
        <label class="form-label">Alasan Banding <span class="text-danger">*</span></label>
        <textarea v-model="appealReason" class="form-textarea" placeholder="Tulis alasan banding"></textarea>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showAppealModal = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="acting" @click="ajukanBanding">Kirim</BaseButton>
      </template>
    </Modal>
  </DetailTabsLayout>
</template>

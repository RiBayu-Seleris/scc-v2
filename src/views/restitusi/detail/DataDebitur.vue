<script setup>
/**
 * DETAIL RESTITUSI — TAB DATA DEBITUR.
 * Ambil profil dari restitute/detail-debitur/{id}, tampilkan via DebiturProfile.
 * Tombol email -> notification/document/restitute/{id}.
 *
 * AKSI (sama persis ehd-backoffice, tergantung role + status):
 *  - Konfirmasi/Tolak (POST restitute/restitute-status/{id})
 *      Broker/Admin  & "Menunggu Konfirmasi Broker"  -> waiting_insurance_confirmation
 *      Insurance/Admin & "Menunggu Konfirmasi Asuransi" -> confirmed_by_insurance
 *      Tolak -> restitute_rejected
 *  - Konfirmasi Bayar (PUT restitute/payment-status/{id} lalu status restitute_paid)
 *      status "Restitusi Diterima"; broker_id!=0 -> Broker/Admin; broker_id==0 -> Insurance/Admin
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  getRestituteDebitur,
  getRestituteRequiredDocuments,
  sendRestituteEmailNotification,
  updateRestituteStatus,
  updateRestitutePaymentStatus,
} from '@/lib/services/restitute'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import { moment, today } from '@/lib/format'
import { restitusiDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import DebiturProfile from '@/components/shared/DebiturProfile.vue'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { CheckCircle2, XCircle, Wallet } from 'lucide-vue-next'
import RestituteRequiredDocuments from '@/components/shared/RestituteRequiredDocuments.vue'

useMeta({ title: 'Detail Restitusi — Data Debitur' })

const route = useRoute()
const auth = useAuthStore()
const id = route.params.id
const session = getSession()

const data = ref({})
const loading = ref(true)
const sending = ref(false)
const acting = ref(false)
const requiredDocuments = ref([])

// modal pembayaran
const showPayModal = ref(false)
const paymentDate = ref(today('YYYY-MM-DD'))
const paymentDesc = ref('')

let role = session.role
const userId = session.userId

onMounted(load)

async function load() {
  loading.value = true
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil wajib tersedia karena role menentukan semua aksi restitusi.
    if (!user) return
    role = user.role
    const [detail, documents] = await Promise.all([
      getRestituteDebitur(id),
      getRestituteRequiredDocuments(id),
    ])
    data.value = detail
    requiredDocuments.value = documents
  } finally {
    loading.value = false
  }
}

// --- Visibilitas & target status tombol (mengikuti aslinya) ---
const confirmTarget = computed(() => {
  const s = data.value.restitute_status
  if ((role === 'Broker' || role === 'Admin') && s === 'Menunggu Konfirmasi Broker') return 'waiting_insurance_confirmation'
  if ((role === 'Insurance' || role === 'Admin') && s === 'Menunggu Konfirmasi Asuransi') return 'confirmed_by_insurance'
  return null
})
const showConfirmReject = computed(() => confirmTarget.value !== null)
const showPayment = computed(() => {
  const s = data.value.restitute_status
  if (s !== 'Restitusi Diterima') return false
  const brokerId = Number(data.value.broker_id)
  if (brokerId !== 0 && (role === 'Broker' || role === 'Admin')) return true
  if (brokerId === 0 && (role === 'Insurance' || role === 'Admin')) return true
  return false
})

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

async function kirimEmail() {
  if (['Reassurance', 'Retrosesi'].includes(role)) return
  sending.value = true
  try {
    await sendRestituteEmailNotification(id)
    alert('success', 'Email Notifikasi Terkirim')
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    sending.value = false
  }
}

async function konfirmasi() {
  if (!confirmTarget.value) return
  acting.value = true
  try {
    await updateRestituteStatus(id, { restitute_status: confirmTarget.value, user_id: parseInt(userId, 10) })
    alert('success', 'Berhasil!')
    await load()
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    acting.value = false
  }
}

async function tolak() {
  acting.value = true
  try {
    await updateRestituteStatus(id, { restitute_status: 'restitute_rejected', user_id: parseInt(userId, 10) })
    alert('success', 'Berhasil!')
    await load()
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    acting.value = false
  }
}

async function bayar() {
  acting.value = true
  try {
    await updateRestitutePaymentStatus(id, {
      payment_date: moment(paymentDate.value).format('DD/MM/YYYY'),
      description: paymentDesc.value,
      user_id: parseInt(userId, 10),
    })
    await updateRestituteStatus(id, { restitute_status: 'restitute_paid', user_id: parseInt(userId, 10) })
    showPayModal.value = false
    alert('success', 'Berhasil!')
    await load()
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <DetailTabsLayout :tabs="restitusiDetailTabs" :id="id" title="Detail Restitusi" :back="{ name: 'list-restitusi' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-5">
      <RestituteRequiredDocuments
        :restitute-id="id"
        :documents="requiredDocuments"
        :can-notify="!['Reassurance', 'Retrosesi'].includes(role)"
      />
      <!-- Aksi status (muncul sesuai role & status) -->
      <Card v-if="showConfirmReject || showPayment">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-sm font-medium text-slate-600 dark:text-slate-300">Tindakan:</span>
          <template v-if="showConfirmReject">
            <BaseButton variant="success" :loading="acting" @click="konfirmasi">
              <CheckCircle2 class="h-4 w-4" /> Konfirmasi
            </BaseButton>
            <BaseButton variant="danger" :loading="acting" @click="tolak">
              <XCircle class="h-4 w-4" /> Tolak
            </BaseButton>
          </template>
          <BaseButton v-if="showPayment" variant="primary" @click="showPayModal = true">
            <Wallet class="h-4 w-4" /> Konfirmasi Pembayaran
          </BaseButton>
        </div>
      </Card>

      <DebiturProfile :data="data" :status-value="data.restitute_status" :show-email="false" />
    </div>

    <!-- Modal konfirmasi pembayaran -->
    <Modal v-model="showPayModal" title="Konfirmasi Pembayaran">
      <div class="space-y-4">
        <div>
          <label class="form-label">Tanggal Pembayaran <span class="text-danger">*</span></label>
          <input v-model="paymentDate" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">Keterangan</label>
          <textarea v-model="paymentDesc" class="form-textarea" placeholder="Keterangan pembayaran (opsional)"></textarea>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showPayModal = false">Batal</BaseButton>
        <BaseButton variant="primary" :loading="acting" @click="bayar">Simpan</BaseButton>
      </template>
    </Modal>
  </DetailTabsLayout>
</template>

<script setup>
/**
 * LAPORAN "RECORD" (reusable) — untuk Laporan Klaim & Laporan Restitusi (Refund).
 *
 * Keduanya identik: filter tanggal + bank + cabang + broker + asuransi + status,
 * lalu kirim ke server yang membalas URL file untuk diunduh.
 *
 * Dropdown BERTINGKAT: memilih Bank akan memuat daftar Cabang & Asuransi milik
 * bank tersebut (dan mereset pilihan cabang/asuransi sebelumnya).
 *
 * Bagian yang berbeda antar-laporan dikirim lewat props:
 *   - endpoint      : path POST laporan (mis. 'report/claim/record')
 *   - extraFilters  : dropdown tambahan, mis. status/jenis. Bentuk:
 *                     [{ key:'claim_status', label:'Status Klaim', options:[...] }]
 */
import { reactive, ref, watch, onMounted, computed } from 'vue'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  getAllPartners,
  getAllBrokers,
  getMembersByPartner,
  getCompaniesByPartner,
  generateCheckedReportFile,
} from '@/lib/services/report'
import { moment, today } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FileDown } from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  endpoint: { type: String, required: true },
  buttonLabel: { type: String, default: 'Cetak' },
  extraFilters: { type: Array, default: () => [] },
  // Tab di atas form, mis. [{ label:'Klaim', route:'laporan-klaim' },
  //   { label:'Asuransi', route:'laporan-klaim-asuransi', nonBankOnly:true }].
  tabs: { type: Array, default: () => [] },
  availability: { type: Object, default: null },
})

useMeta({ title: () => props.title })

// Tab "Asuransi" di aslinya hanya tampil untuk non-bank (showMenuForBank).
const reportSession = getSession()
const auth = useAuthStore()
const isNonBank = computed(() => {
  const role = auth.user?.role || reportSession.role
  return role !== 'Bank' && role !== 'Branch Bank'
})
const visibleTabs = computed(() => props.tabs.filter((t) => !t.nonBankOnly || isNonBank.value))

// --- Filter dasar ---
const startDate = ref(moment().startOf('month').format('YYYY-MM-DD'))
const endDate = ref(today('YYYY-MM-DD'))
const partnerId = ref(null)
const memberId = ref(null)
const brokerId = ref(null)
const insuranceId = ref(null)

// --- Nilai filter tambahan (status/jenis) ---
const extraValues = reactive({})
props.extraFilters.forEach((f) => (extraValues[f.key] = null))

// --- Opsi dropdown ---
const bankOptions = ref([])
const memberOptions = ref([])
const brokerOptions = ref([])
const insuranceOptions = ref([])
const loading = ref(false)

onMounted(async () => {
  try {
    // Role harus berasal dari auth/data agar tab Asuransi tidak memakai sesi lama.
    if (!auth.user) await auth.fetchUser()
    bankOptions.value = await getAllPartners()
    brokerOptions.value = await getAllBrokers()
  } catch {
    // dibiarkan; user bisa mencoba lagi
  }
})

// Cascade: saat bank berubah, muat cabang & asuransi milik bank itu; reset pilihan lama.
watch(partnerId, async (id) => {
  memberId.value = null
  insuranceId.value = null
  memberOptions.value = []
  insuranceOptions.value = []
  if (!id) return
  try {
    memberOptions.value = await getMembersByPartner(id)
    insuranceOptions.value = await getCompaniesByPartner(id)
  } catch {
    /* diabaikan */
  }
})

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

async function cetak() {
  // Semua filter wajib diisi (mengikuti aturan aslinya).
  const extraFilled = props.extraFilters.every((f) => extraValues[f.key] !== null && extraValues[f.key] !== '')
  if (
    !startDate.value || !endDate.value || partnerId.value === null ||
    memberId.value === null || brokerId.value === null || insuranceId.value === null || !extraFilled
  ) {
    return alert('error', 'Semua filter wajib diisi')
  }

  const payload = {
    start_date: moment(startDate.value).format('YYYY-MM-DD'),
    end_date: moment(endDate.value).format('YYYY-MM-DD'),
    partner_id: parseInt(partnerId.value, 10),
    member_id: parseInt(memberId.value, 10),
    broker_id: parseInt(brokerId.value, 10),
    insurance_company_id: parseInt(insuranceId.value, 10),
  }
  props.extraFilters.forEach((f) => (payload[f.key] = extraValues[f.key]))

  loading.value = true
  const res = await generateCheckedReportFile(props.endpoint, payload, props.availability)
  loading.value = false
  if (!res.ok) alert('error', res.message)
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <PageHeader :title="title" :subtitle="subtitle" />

    <!-- Tab (mis. Klaim | Asuransi) — persis sidebar/nav laporan asli -->
    <div v-if="visibleTabs.length > 1" class="mb-4 flex flex-wrap gap-2">
      <router-link
        v-for="tab in visibleTabs"
        :key="tab.route"
        :to="{ name: tab.route }"
        class="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
        :class="
          $route.name === tab.route
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        "
      >
        {{ tab.label }}
      </router-link>
    </div>

    <Card>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label class="form-label">Dari Tanggal <span class="text-danger">*</span></label>
          <input v-model="startDate" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">Sampai Tanggal <span class="text-danger">*</span></label>
          <input v-model="endDate" type="date" class="form-input" />
        </div>

        <BaseSelect
          v-model="partnerId"
          :options="bankOptions"
          option-label="partner_name"
          option-value="partner_id"
          label="Bank"
          placeholder="Pilih Bank"
          required
        />
        <BaseSelect
          v-model="memberId"
          :options="memberOptions"
          option-label="member_name"
          option-value="member_id"
          label="Nama Cabang"
          :placeholder="partnerId ? 'Pilih Cabang' : 'Pilih Bank dulu'"
          :disabled="!partnerId"
          required
        />
        <BaseSelect
          v-model="brokerId"
          :options="brokerOptions"
          option-label="broker_name"
          option-value="broker_id"
          label="Broker"
          placeholder="Pilih Broker"
          required
        />
        <BaseSelect
          v-model="insuranceId"
          :options="insuranceOptions"
          option-label="company_name"
          option-value="company_id"
          label="Asuransi"
          :placeholder="partnerId ? 'Pilih Asuransi' : 'Pilih Bank dulu'"
          :disabled="!partnerId"
          required
        />

        <!-- Filter tambahan (status/jenis) -->
        <BaseSelect
          v-for="f in extraFilters"
          :key="f.key"
          v-model="extraValues[f.key]"
          :options="f.options"
          :label="f.label"
          :placeholder="`Pilih ${f.label}`"
          required
        />
      </div>

      <div class="mt-6 flex justify-end">
        <BaseButton variant="primary" :loading="loading" @click="cetak">
          <FileDown class="h-4 w-4" /> {{ buttonLabel }}
        </BaseButton>
      </div>
    </Card>
  </div>
</template>

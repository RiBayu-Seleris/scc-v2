<script setup>
/**
 * LAPORAN PRODUKSI — TAB AKSEPTASI.
 * Port 1:1 dari seleris-credit-cover `reports/production_report_akseptasi.vue`.
 *
 * Perilaku yang direplikasi persis:
 *  - Bank: user Chubb (InsuredCompanyId '12') / Admin memilih dari dashboard/select-bank
 *    (dengan opsi "Semua Bank", partner_id 0); user lain memakai bank aktif dari sesi.
 *  - Cascade Bank -> Cabang/Asuransi/Produk/Broker (+ opsi "Semua ..." bila > 1 pilihan).
 *  - Cabang -> Kantor (member-office-by-branch); "Semua Cabang" -> "Semua Kantor".
 *  - "Semua Bank" (partner 0): broker -1, cabang 0, asuransi Chubb (12), produk 0.
 *  - Preset broker untuk Chubb/Admin: partner 16 & 25 -> "Tanpa Broker Menggunakan Broker"
 *    (broker_id 0); partner 27 -> PT Brocade Insurance Broker (broker_id 6).
 *  - Nama broker "Semua Broker & Tanpa Menggunakan Broker" ditulis ulang jadi
 *    "Tanpa Menggunakan Broker".
 *  - Opsi Status Pengajuan: partner 26 -> Extra Premi; lainnya -> Lien Clause.
 *  - Filter Waktu: Broker GRM -> teks terkunci "Waktu Settlement"; Chubb/Admin -> opsi
 *    Chubb (Register Date, dst.); lainnya -> Waktu Penginputan/Waktu Akad.
 *  - Submit biasa    -> POST report/production/each-branch.
 *  - Submit Broker GRM -> POST report/production/broker/each-branch (cek total_debitur).
 *  - Validasi memakai toast singkat di atas (persis showMessage aslinya).
 *
 * Dua penyimpangan yang DISENGAJA dari aslinya (aslinya rusak, lihat docs/BEDA-DARI-SCC.md):
 *  1. Field "Nama Kantor" di aslinya memakai v-show="partnerIdSelected === 'PT Bank BJB'",
 *     padahal partnerIdSelected berupa angka -> selalu false -> field tidak pernah tampil,
 *     padahal submit() mewajibkannya. Di sini field ditampilkan untuk semua bank.
 *  2. Variabel selected* (selectedBranchBankId dkk) di aslinya dipakai tapi tidak pernah
 *     dideklarasikan -> ReferenceError saat validasi. Di sini nilai fallback-nya jelas.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { moment } from '@/lib/format'
import { safeUrl } from '@/lib/sanitize'
import { filterProductionTabs } from '@/config/productionTabs'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FileDown } from 'lucide-vue-next'

useMeta({ title: 'Laporan Produksi - Akseptasi' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()

const partnerIdSelected = parseInt(session.partnerId, 10) || 0
const partnerNameSelected = localStorage.getItem('partnerNameSelected') || ''
const insuredCompanyId = session.insuredCompanyId || localStorage.getItem('InsuredCompanyId')

// ---- Identitas user (diisi dari auth/data, sama seperti aslinya) ----
const roleName = ref('')
const brokerUserId = ref(null)

// ---- Nilai form ----
const startDate = ref('')
const endDate = ref('')
const bankId = ref(null)
const memberId = ref(null)
const officeId = ref(null)
const brokerSel = ref(null)
const insuranceSel = ref(null)
const productSel = ref(null)
const timeFilter = ref(null)
const timeFilterGrm = ref('Waktu Settlement') // GRM: terkunci, persis aslinya
const submissionStatus = ref(null)
const isLoading = ref(false)

// ---- Opsi dropdown ----
const bankOptions = ref([])
const memberOptions = ref([])
const officeOptions = ref([])
const brokerOptions = ref([])
const insuranceOptions = ref([])
const productOptions = ref([])
const submissionStatusOptions = ref([])

const timeFilterOptions = ['Waktu Penginputan', 'Waktu Akad']
const timeFilterOptionsChubb = ['Register Date', 'Waktu Akad', 'Submission', 'Inforce', 'Paid Date']

// Daftar status per jenis partner (persis aslinya).
const STATUS_BJB = [
  'Semua Status Pengajuan', 'Diterima', 'Diterima Standar', 'Diterima dengan Extra Premi',
  'Menunggu Keputusan Underwriting', 'Menunggu Hasil Pemeriksaan Kesehatan', 'Dibatalkan', 'Ditolak',
]
const STATUS_DEFAULT = [
  'Semua Status Pengajuan', 'Diterima', 'Diterima Standar', 'Diterima dengan Lien Clause',
  'Menunggu Keputusan Underwriting', 'Menunggu Hasil Pemeriksaan Kesehatan', 'Dibatalkan', 'Ditolak',
]
const STATUS_ALL_BANK = [
  'Semua Status Pengajuan', 'Diterima', 'Diterima Standar', 'Diterima dengan Lien Clause',
  'Diterima dengan Extra Premi', 'Menunggu Keputusan Underwriting',
  'Menunggu Hasil Pemeriksaan Kesehatan', 'Dibatalkan', 'Ditolak',
]

const safeParseInt = (v, fallback = 0) => {
  const n = Number.parseInt(v)
  return Number.isNaN(n) ? fallback : n
}

// ---- Computed identitas & aturan tampil (persis aslinya) ----
const isChubbOrAdmin = computed(() => insuredCompanyId === '12' || roleName.value === 'Admin')
const isGrm = computed(() => roleName.value === 'Broker' && Number(brokerUserId.value) === 1)


// Semua dropdown dikunci bila pilihannya cuma satu (persis aslinya).
const isBrokerDisabled = computed(() => brokerOptions.value.length <= 1)

const visibleTabs = computed(() => filterProductionTabs(roleName.value || session.role, brokerUserId.value))

// ---- Toast singkat untuk validasi (persis showMessage aslinya) ----
function showMessage(msg) {
  window.Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 3000 })
    .fire({ icon: 'error', title: msg, padding: '10px 20px' })
}


/* =========================================================
   INISIALISASI (persis onMounted aslinya)
   ========================================================= */
onMounted(async () => {
  const user = auth.user || (await auth.fetchUser())
  roleName.value = user?.role || session.role || ''
  brokerUserId.value = user?.broker_id ?? null
  const role = roleName.value
  const pid = safeParseInt(partnerIdSelected, 0)

  // Bank: hanya Chubb/Admin yang memilih (dari dashboard/select-bank + "Semua Bank").
  if (isChubbOrAdmin.value) {
    try {
      const { data } = await api.get('dashboard/select-bank')
      bankOptions.value = [{ partner_id: 0, partner_name: 'Semua Bank' }, ...(data?.data || [])]
      if (bankOptions.value.length === 1) {
        bankId.value = bankOptions.value[0].partner_id
        bankSelected()
      }
    } catch { /* dibiarkan, sama seperti aslinya (hanya console.error) */ }
  }

  // Cabang.
  if (role === 'Branch Bank') {
    memberOptions.value = [{ member_id: user.member_id, member_name: user.username }]
    memberId.value = user.member_id
    await memberSelected()
  } else if (!isChubbOrAdmin.value) {
    try {
      const { data } = await api.get(`submission/member-by-partner/${pid}?is_parent_active=true`)
      const arr = data?.data || []
      if (arr.length === 1) {
        memberOptions.value = arr
        memberId.value = arr[0].member_id
        await memberSelected()
      } else {
        memberOptions.value = [{ member_id: 0, member_name: 'Semua Cabang' }, ...arr]
      }
    } catch { /* dibiarkan */ }
  }

  // Broker.
  if (role === 'Broker') {
    brokerOptions.value = [{ broker_id: user.broker_id, broker_name: user.company_name }]
    brokerSel.value = user.broker_id
  } else if (!isChubbOrAdmin.value) {
    try {
      const { data } = await api.get(`submission/broker/partner/${pid}`)
      const brokers = data?.data || []
      // Satu broker -> langsung terpilih; lebih dari satu -> tambah opsi "Semua Broker".
      brokerOptions.value = brokers.length > 1 ? [{ broker_id: 0, broker_name: 'Semua Broker' }, ...brokers] : brokers
      if (brokerOptions.value.length === 1) brokerSel.value = brokerOptions.value[0].broker_id
    } catch { /* dibiarkan */ }
  } else {
    // Chubb/Admin: preset broker per partner aktif (persis aslinya).
    if ([16, 25].includes(partnerIdSelected)) {
      brokerOptions.value = [{ broker_id: 0, broker_name: 'Tanpa Broker Menggunakan Broker' }]
    } else if (partnerIdSelected === 27) {
      brokerOptions.value = [{ broker_id: 6, broker_name: 'PT Brocade Insurance Broker' }]
    }
    if (brokerOptions.value.length) brokerSel.value = brokerOptions.value[0].broker_id
  }

  // Asuransi & Produk (untuk non-Chubb/Admin, dari partner aktif).
  if (!isChubbOrAdmin.value) {
    try {
      const { data } = await api.get(`submission/company-by-partner/${pid}`)
      const arr = data?.data || []
      insuranceOptions.value = arr.length === 1 ? arr : [{ company_id: 0, company_name: 'Semua Asuransi' }, ...arr]
      insuranceSel.value = insuranceOptions.value[0]?.company_id ?? null
    } catch { /* dibiarkan */ }
    try {
      const { data } = await api.get(`submission/select-product/${pid}`)
      const arr = data?.data || []
      productOptions.value = arr.length === 1 ? arr : [{ id: 0, product_name: 'Semua Produk' }, ...arr]
      productSel.value = productOptions.value[0]?.id ?? null
    } catch { /* dibiarkan */ }
  }

  // Status pengajuan awal per partner aktif.
  submissionStatusOptions.value = partnerIdSelected === 26 ? STATUS_BJB : STATUS_DEFAULT
})

/* =========================================================
   CASCADE bankSelected() — persis aslinya
   ========================================================= */
async function bankSelected() {
  memberId.value = null
  officeId.value = null
  insuranceSel.value = null
  productSel.value = null
  brokerSel.value = null
  submissionStatus.value = null
  memberOptions.value = []
  officeOptions.value = []
  insuranceOptions.value = []
  productOptions.value = []
  brokerOptions.value = []
  submissionStatusOptions.value = []

  if (bankId.value === null || bankId.value === undefined || bankId.value === '') return
  const pid = safeParseInt(bankId.value, 0)

  // "Semua Bank" (partner 0): set opsi tetap, persis aslinya.
  if (pid === 0) {
    brokerOptions.value = [{ broker_id: -1, broker_name: 'Semua Broker dan Tanpa Menggunakan Broker' }]
    brokerSel.value = -1
    memberOptions.value = [{ member_id: 0, member_name: 'Semua Cabang' }]
    memberId.value = 0
    // Cabang "Semua" harus langsung menghasilkan kantor "Semua"; kalau tidak,
    // perbaikan field kantor di BEDA-DARI-SCC tetap akan terblokir saat submit.
    officeOptions.value = [{ member_id: 0, member_name: 'Semua Kantor' }]
    officeId.value = 0
    insuranceOptions.value = [{ company_id: 12, company_name: 'PT Chubb Life Insurance Indonesia' }]
    insuranceSel.value = 12
    productOptions.value = [{ id: 0, product_name: 'Semua Produk' }]
    productSel.value = 0
    submissionStatusOptions.value = STATUS_ALL_BANK
    return
  }

  // Cabang.
  try {
    const { data } = await api.get(`submission/member-by-partner/${pid}`)
    const members = data?.data || []
    if (members.length === 1) memberId.value = members[0].member_id
    memberOptions.value = members.length > 1 ? [{ member_id: 0, member_name: 'Semua Cabang' }, ...members] : members
    memberSelected()
  } catch { /* dibiarkan */ }

  // Asuransi.
  try {
    const { data } = await api.get(`submission/company-by-partner/${pid}`)
    const arr = data?.data || []
    if (arr.length === 1) insuranceSel.value = arr[0].company_id
    insuranceOptions.value = arr.length > 1 ? [{ company_id: 0, company_name: 'Semua Asuransi' }, ...arr] : arr
  } catch { /* dibiarkan */ }

  // Produk.
  try {
    const { data } = await api.get(`submission/select-product/${pid}`)
    const arr = data?.data || []
    if (arr.length === 1) productSel.value = arr[0].id
    productOptions.value = arr.length > 1 ? [{ id: 0, product_name: 'Semua Produk' }, ...arr] : arr
  } catch { /* dibiarkan */ }

  // Broker. Nama "Semua Broker & Tanpa Menggunakan Broker" ditulis ulang jadi
  // "Tanpa Menggunakan Broker" (persis aslinya).
  try {
    const { data } = await api.get(`submission/broker/partner/${pid}`)
    const brokers = (data?.data || []).map((b) => ({
      ...b,
      broker_name:
        b.broker_name === 'Semua Broker & Tanpa Menggunakan Broker' ? 'Tanpa Menggunakan Broker' : b.broker_name,
    }))
    brokerOptions.value = brokers
    if (brokerOptions.value.length === 1) brokerSel.value = brokerOptions.value[0].broker_id
  } catch { /* dibiarkan */ }

  // Status pengajuan per partner.
  submissionStatusOptions.value = pid === 26 ? STATUS_BJB : STATUS_DEFAULT
}

/* =========================================================
   CASCADE memberSelected() — persis aslinya
   ========================================================= */
async function memberSelected() {
  officeId.value = null
  officeOptions.value = []
  if (memberId.value === null || memberId.value === undefined || memberId.value === '') return

  const mid = safeParseInt(memberId.value, 0)
  if (mid === 0) {
    officeOptions.value = [{ member_id: 0, member_name: 'Semua Kantor' }]
    officeId.value = 0
    return
  }
  try {
    const { data } = await api.get(`submission/member-office-by-branch/${mid}`)
    const offices = (data?.data || []).map((o) => ({ member_id: o.member_office_id, member_name: o.member_office_name }))
    officeOptions.value = offices.length > 1 ? [{ member_id: 0, member_name: 'Semua Kantor' }, ...offices] : offices
    if (offices.length === 1) officeId.value = offices[0].member_id
  } catch { /* dibiarkan */ }
}

/* =========================================================
   Watcher Produk -> auto-set Broker (persis aslinya)
   ========================================================= */
/* =========================================================
   SUBMIT biasa — POST report/production/each-branch
   ========================================================= */
async function submit() {
  if (!startDate.value) return showMessage('Dari Tanggal wajib diisi')
  if (!endDate.value) return showMessage('Sampai Tanggal wajib diisi')

  let pid
  if (isChubbOrAdmin.value) {
    if (bankId.value === null || bankId.value === '') return showMessage('Bank wajib diisi')
    pid = safeParseInt(bankId.value, 0)
  } else {
    if (!partnerIdSelected) return showMessage('Bank wajib diisi')
    pid = safeParseInt(partnerIdSelected, 0)
  }

  if (memberId.value === null || memberId.value === '') return showMessage('Nama Cabang wajib diisi')
  // Nama Kantor wajib untuk SEMUA bank (bukan hanya bank 26).
  if (officeId.value === null || officeId.value === '') return showMessage('Nama Kantor wajib diisi')
  if (brokerSel.value === null || brokerSel.value === '') return showMessage('Broker wajib diisi')
  if (insuranceSel.value === null || insuranceSel.value === '') return showMessage('Asuransi wajib diisi')
  if (productSel.value === null || productSel.value === '') return showMessage('Produk wajib diisi')
  if (!timeFilter.value) return showMessage('Filter Waktu wajib diisi')
  if (!submissionStatus.value) return showMessage('Status Pengajuan wajib diisi')

  isLoading.value = true
  try {
    const { data } = await api.post('report/production/each-branch', {
      start_date: moment(startDate.value).format('YYYY-MM-DD'),
      end_date: moment(endDate.value).format('YYYY-MM-DD'),
      partner_id: pid,
      member_id: safeParseInt(memberId.value, 0),
      // Kantor yang dipilih selalu dikirim apa adanya (berlaku untuk semua bank).
      office_id: safeParseInt(officeId.value, 0),
      broker_id: safeParseInt(brokerSel.value, 0),
      insurance_company_id: safeParseInt(insuranceSel.value, 0),
      product_id: safeParseInt(productSel.value, 0),
      time_filter: timeFilter.value,
      submission_status: submissionStatus.value === 'Semua Status Pengajuan' ? '' : submissionStatus.value,
    })
    if (data?.status === 200) {
      if (data.file?.url) window.open(safeUrl(data.file.url), '_blank', 'noopener')
      else window.Swal.fire({ icon: 'error', title: 'File tidak tersedia', padding: '1em' })
    } else {
      window.Swal.fire({ icon: 'warning', title: data?.message, padding: '2em' })
    }
  } catch (error) {
    if (error?.request && !error?.response) {
      window.Swal.fire({ icon: 'error', title: 'Tidak dapat terhubung ke server', text: 'Periksa koneksi internet Anda', padding: '2em' })
    } else if (error?.response?.data?.message) {
      window.Swal.fire({ icon: 'error', title: error.response.data.message, padding: '2em' })
    } else {
      window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
    }
  } finally {
    isLoading.value = false
  }
}

/* =========================================================
   SUBMIT Broker GRM — POST report/production/broker/each-branch
   ========================================================= */
async function submitReportGrm() {
  if (!startDate.value) return showMessage('Dari Tanggal wajib diisi')
  if (!endDate.value) return showMessage('Sampai Tanggal wajib diisi')
  if (!partnerIdSelected) return showMessage('Bank wajib diisi')
  if (memberId.value === null || memberId.value === '') return showMessage('Nama Cabang wajib diisi')
  if (officeId.value === null || officeId.value === '') return showMessage('Nama Kantor wajib diisi')
  if (brokerSel.value === null || brokerSel.value === '') return showMessage('Broker wajib diisi')
  if (insuranceSel.value === null || insuranceSel.value === '') return showMessage('Asuransi wajib diisi')
  if (productSel.value === null || productSel.value === '') return showMessage('Produk wajib diisi')
  if (!timeFilterGrm.value) return showMessage('Filter Waktu wajib diisi')
  if (!submissionStatus.value) return showMessage('Status Pengajuan wajib diisi')

  try {
    const { data } = await api.post('report/production/broker/each-branch', {
      start_date: moment(startDate.value).format('YYYY-MM-DD'),
      end_date: moment(endDate.value).format('YYYY-MM-DD'),
      partner_id: safeParseInt(partnerIdSelected, 0),
      member_id: safeParseInt(memberId.value, 0),
      office_id: safeParseInt(officeId.value, 0),
      broker_id: safeParseInt(brokerSel.value, 0),
      insurance_company_id: safeParseInt(insuranceSel.value, 0),
      product_id: safeParseInt(productSel.value, 0),
      time_filter: timeFilterGrm.value,
      submission_status: submissionStatus.value,
    })
    if (data?.status === 200) {
      // Persis aslinya: buka file hanya bila total_debitur di seluruh cabang > 0.
      const total = (data.branch || []).reduce((sum, b) => sum + (b.total_debitur || 0), 0)
      if (total > 0) window.open(safeUrl(data.file.url), '_blank', 'noopener')
      else window.Swal.fire({ icon: 'error', title: 'Data Laporan Tidak Tersedia', padding: '1em' })
    }
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  }
}
</script>

<template>
  <div>
    <PageHeader title="Laporan Produksi" subtitle="Akseptasi" />

    <div class="mb-4 flex flex-wrap gap-2">
      <router-link
        v-for="tab in visibleTabs"
        :key="tab.route"
        :to="{ name: tab.route }"
        class="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
        :class="
          route.name === tab.route
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        "
      >
        {{ tab.label }}
      </router-link>
    </div>

    <Card>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label class="form-label">Dari Tanggal <span class="text-danger">*</span></label>
          <input v-model="startDate" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">Sampai Tanggal <span class="text-danger">*</span></label>
          <input v-model="endDate" type="date" class="form-input" />
        </div>

        <!-- Bank: Chubb/Admin memilih; user lain terkunci ke bank aktif (persis aslinya) -->
        <div v-if="!isChubbOrAdmin">
          <label class="form-label">Bank <span class="text-danger">*</span></label>
          <input :value="partnerNameSelected" type="text" class="form-input" disabled />
        </div>
        <BaseSelect
          v-else
          v-model="bankId"
          :options="bankOptions"
          option-label="partner_name"
          option-value="partner_id"
          label="Bank"
          placeholder="Pilih Bank"
          :disabled="bankOptions.length <= 1"
          required
          @update:model-value="bankSelected"
        />

        <BaseSelect
          v-model="memberId"
          :options="memberOptions"
          option-label="member_name"
          option-value="member_id"
          label="Nama Cabang"
          placeholder="Pilih Cabang"
          :disabled="memberOptions.length <= 1"
          required
          @update:model-value="memberSelected"
        />

        <!--
          Nama Kantor tampil untuk semua bank.
          Catatan: di aslinya field ini memakai v-show="partnerIdSelected === 'PT Bank BJB'",
          padahal partnerIdSelected sudah berupa angka (hasil migrasi nama->id di sisi mereka),
          sehingga kondisinya selalu false dan field tidak pernah muncul — padahal submit()
          mewajibkannya. Di sini kondisi rusak itu dibuang agar field bisa diisi, sedangkan
          validasi & payload tetap mengikuti aslinya (kantor selalu wajib & selalu dikirim).
        -->
        <BaseSelect
          v-model="officeId"
          :options="officeOptions"
          option-label="member_name"
          option-value="member_id"
          label="Nama Kantor"
          placeholder="Pilih Kantor"
          :disabled="officeOptions.length <= 1"
          required
        />

        <BaseSelect
          v-model="brokerSel"
          :options="brokerOptions"
          option-label="broker_name"
          option-value="broker_id"
          label="Broker"
          placeholder="Pilih Broker"
          :disabled="isBrokerDisabled"
          required
        />

        <BaseSelect
          v-model="insuranceSel"
          :options="insuranceOptions"
          option-label="company_name"
          option-value="company_id"
          label="Asuransi"
          placeholder="Pilih Asuransi"
          :disabled="insuranceOptions.length <= 1"
          required
        />

        <BaseSelect
          v-model="productSel"
          :options="productOptions"
          option-label="product_name"
          option-value="id"
          label="Produk"
          placeholder="Pilih Produk Asuransi"
          :disabled="productOptions.length <= 1"
          required
        />

        <!-- Filter Waktu: GRM terkunci; Chubb/Admin opsi Chubb; lainnya opsi standar -->
        <div v-if="isGrm">
          <label class="form-label">Filter Waktu <span class="text-danger">*</span></label>
          <input :value="timeFilterGrm" type="text" class="form-input" disabled />
        </div>
        <BaseSelect
          v-else-if="isChubbOrAdmin"
          v-model="timeFilter"
          :options="timeFilterOptionsChubb"
          label="Filter Waktu"
          placeholder="Pilih Filter Waktu"
          required
        />
        <BaseSelect
          v-else
          v-model="timeFilter"
          :options="timeFilterOptions"
          label="Filter Waktu"
          placeholder="Pilih Filter Waktu"
          required
        />

        <BaseSelect
          v-model="submissionStatus"
          :options="submissionStatusOptions"
          label="Status Pengajuan"
          placeholder="Pilih Status Pengajuan"
          :disabled="submissionStatusOptions.length <= 1"
          required
        />
      </div>

      <div class="mt-6 flex justify-end">
        <BaseButton v-if="isGrm" variant="primary" @click="submitReportGrm">
          <FileDown class="h-4 w-4" /> Cetak Excel
        </BaseButton>
        <BaseButton v-else variant="primary" :loading="isLoading" @click="submit">
          <FileDown class="h-4 w-4" />
          {{ isLoading ? 'Memproses...' : 'Cetak Excel' }}
        </BaseButton>
      </div>
    </Card>
  </div>
</template>

<script setup>
/**
 * LAPORAN CETAK INVOICE.
 * Menampilkan nama perusahaan (dari partner yang sedang dipilih) lalu memilih
 * Bulan & Tahun untuk mencetak invoice.
 * Endpoint sama dengan aslinya:
 *   GET  submission/company-by-partner/{partnerId}   (ambil nama perusahaan)
 *   POST report/invoice-payment                       (buat invoice)
 */
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { getSession } from '@/lib/auth'
import { generateReportFile } from '@/lib/services/report'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FileDown } from 'lucide-vue-next'

useMeta({ title: 'Laporan Cetak Invoice' })

const session = getSession()
const companyName = ref('')
const selectedMonth = ref(null)
const selectedYear = ref(null)
const loading = ref(false)

// Opsi bulan (nilai 1..12) & tahun (30 tahun ke belakang) — sama seperti aslinya.
const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const monthOptions = monthNames.map((name, i) => ({ label: name, value: i + 1 }))
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 30 }, (_, i) => currentYear - i)

onMounted(async () => {
  try {
    const { data } = await api.get('submission/company-by-partner/' + session.partnerId)
    companyName.value = data?.data?.[0]?.company_name || '-'
  } catch {
    companyName.value = '-'
  }
})

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

async function cetak() {
  if (!selectedMonth.value || !selectedYear.value) {
    return alert('error', 'Bulan dan Tahun wajib diisi')
  }
  loading.value = true
  const res = await generateReportFile('report/invoice-payment', {
    insurance_company_id: parseInt(session.partnerId, 10),
    Year: selectedYear.value,
    Month: selectedMonth.value,
  })
  loading.value = false
  if (!res.ok) alert('error', res.message)
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader title="Laporan Cetak Invoice" subtitle="Cetak invoice per bulan untuk perusahaan Anda." />

    <Card>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="form-label">Perusahaan</label>
          <input :value="companyName" type="text" class="form-input" disabled />
        </div>
        <BaseSelect
          v-model="selectedMonth"
          :options="monthOptions"
          option-label="label"
          option-value="value"
          label="Bulan"
          placeholder="Pilih Bulan"
          required
        />
        <BaseSelect
          v-model="selectedYear"
          :options="years"
          label="Tahun"
          placeholder="Pilih Tahun"
          required
        />
      </div>

      <div class="mt-6 flex justify-end">
        <BaseButton variant="primary" :loading="loading" @click="cetak">
          <FileDown class="h-4 w-4" /> Cetak Invoice
        </BaseButton>
      </div>
    </Card>
  </div>
</template>

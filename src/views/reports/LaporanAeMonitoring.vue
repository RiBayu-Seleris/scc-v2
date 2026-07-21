<script setup>
/**
 * LAPORAN AE MONITORING.
 * Filter: rentang tanggal + bank. Tombol -> server menghasilkan PDF -> dibuka di tab baru.
 * Endpoint sama dengan aslinya:
 *   GET  submission/all-partner                     (opsi bank)
 *   POST report/production/actual-experience        (buat laporan)
 */
import { ref, onMounted } from 'vue'
import { getAllPartners, generateReportFile } from '@/lib/services/report'
import { today, moment } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FileDown } from 'lucide-vue-next'

useMeta({ title: 'Laporan AE Monitoring' })

const startDate = ref(moment().startOf('month').format('YYYY-MM-DD'))
const endDate = ref(today('YYYY-MM-DD'))
const partnerId = ref(null)
const bankOptions = ref([])
const loading = ref(false)

onMounted(async () => {
  try {
    bankOptions.value = await getAllPartners()
  } catch {
    bankOptions.value = []
  }
})

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

async function cetak() {
  if (!startDate.value || !endDate.value || !partnerId.value) {
    return alert('error', 'Tanggal dan Bank wajib diisi')
  }
  loading.value = true
  const res = await generateReportFile('report/production/actual-experience', {
    start_date: moment(startDate.value).format('YYYY-MM-DD'),
    end_date: moment(endDate.value).format('YYYY-MM-DD'),
    partner_id: parseInt(partnerId.value, 10),
  })
  loading.value = false
  if (!res.ok) alert('error', res.message)
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <PageHeader title="Laporan AE Monitoring" subtitle="Unduh laporan Actual vs Expected per bank." />

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
        <div class="sm:col-span-2">
          <BaseSelect
            v-model="partnerId"
            :options="bankOptions"
            option-label="partner_name"
            option-value="partner_id"
            label="Bank"
            placeholder="Pilih Bank"
            required
          />
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <BaseButton variant="primary" :loading="loading" @click="cetak">
          <FileDown class="h-4 w-4" /> Cetak PDF
        </BaseButton>
      </div>
    </Card>
  </div>
</template>

<script setup>
/**
 * TAMPILAN DATA ASURANSI (presentational, reusable).
 * Menampilkan field polis/asuransi/PIC/rekening yang sama antara detail
 * Restitusi & Klaim (respons detail-insurance mirip). Field khusus tiap modul
 * (mis. info kejadian klaim / info restitusi) diisi lewat slot #extra.
 */
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'

defineProps({
  data: { type: Object, default: () => ({}) },
})
</script>

<template>
  <div class="space-y-5">
    <!-- Bagian khusus modul (opsional) muncul paling atas -->
    <slot name="extra" />

    <Card title="Data Polis">
      <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="No. Akad" :value="data.contract_number" />
        <InfoField label="No. Sertifikat" :value="data.certificate_number" />
        <InfoField label="No. Registrasi" :value="data.register_number" />
        <InfoField label="Produk" :value="data.product_name" />
        <InfoField label="Mulai Asuransi" :value="data.start_date_insurance" />
        <InfoField label="Akhir Asuransi" :value="data.end_date_insurance" />
        <InfoField label="Masa Asuransi" :value="data.insurance_period ? `${data.insurance_period} Bulan` : ''" />
      </dl>
    </Card>

    <Card title="Asuransi & Cabang">
      <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Perusahaan Asuransi" :value="data.insurance_company_name" />
        <InfoField label="Partner / Client" :value="data.partner_name" />
        <InfoField label="Cabang" :value="data.member_name" />
      </dl>
    </Card>

    <Card title="Rekening Penerima">
      <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Bank" :value="data.account_bank" />
        <InfoField label="Nama Rekening" :value="data.account_name" />
        <InfoField label="No. Rekening" :value="data.account_number" />
      </dl>
    </Card>

    <Card title="PIC">
      <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Nama PIC" :value="data.pic_name" />
        <InfoField label="Email PIC" :value="data.pic_email" />
        <InfoField label="No. HP PIC" :value="data.pic_phone_number" />
        <InfoField label="CC Email" :value="data.cc_pic_email" />
      </dl>
    </Card>

    <Card v-if="data.description" title="Keterangan">
      <p class="whitespace-pre-line text-slate-700 dark:text-slate-200">{{ data.description }}</p>
    </Card>
  </div>
</template>

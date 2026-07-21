<script setup>
/**
 * TAMPILAN PROFIL DEBITUR (presentational, reusable).
 *
 * Dipakai di tab "Data Debitur" milik detail Restitusi & Klaim — keduanya
 * menampilkan field profil yang sama (respons detail-debitur identik). Komponen
 * ini HANYA menampilkan; pengambilan data & tombol dikelola halaman pemanggil.
 *
 * Prop:
 *   - data        : objek profil (dari restitute/claim detail-debitur)
 *   - statusValue : teks status (restitute_status / claim_status)
 *   - sending     : status loading tombol email
 * Emit:
 *   - send-email  : saat tombol "Kirim Email Notifikasi" diklik
 */
import Card from '@/components/ui/Card.vue'
import InfoField from '@/components/ui/InfoField.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Mail } from 'lucide-vue-next'

defineProps({
  data: { type: Object, default: () => ({}) },
  statusValue: { type: String, default: '' },
  sending: { type: Boolean, default: false },
  showEmail: { type: Boolean, default: true },
})
defineEmits(['send-email'])
</script>

<template>
  <div class="space-y-5">
    <!-- Header profil -->
    <Card>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <img
            v-if="data.photo_profile"
            :src="data.photo_profile"
            alt="Foto Debitur"
            class="h-16 w-16 rounded-2xl object-cover"
          />
          <div
            v-else
            class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 text-2xl font-bold text-white"
          >
            {{ (data.debitur_name || 'D').charAt(0).toUpperCase() }}
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ data.debitur_name || '-' }}</h2>
            <p class="text-sm text-slate-500">No. Registrasi: {{ data.register_number || '-' }}</p>
            <Badge v-if="statusValue" variant="primary" class="mt-1">{{ statusValue }}</Badge>
          </div>
        </div>
        <BaseButton v-if="showEmail" variant="outline-primary" :loading="sending" @click="$emit('send-email')">
          <Mail class="h-4 w-4" /> Kirim Email Notifikasi
        </BaseButton>
      </div>
    </Card>

    <!-- Profil / Identitas -->
    <Card title="Profil">
      <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Jenis Identitas" :value="data.id_card_type" />
        <InfoField label="No. Identitas" :value="data.id_card_number" />
        <InfoField label="Tempat Lahir" :value="data.pob" />
        <InfoField label="Tanggal Lahir" :value="data.dob" />
        <InfoField label="Jenis Kelamin" :value="data.gender" />
        <InfoField label="Usia" :value="data.age ? `${data.age} Tahun` : ''" />
        <InfoField label="No. Rekening" :value="data.account_number" />
        <InfoField label="Status" :value="statusValue" />
      </dl>
    </Card>

    <!-- Kontak -->
    <Card title="Kontak">
      <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Alamat" :value="data.customer_contact_address" />
        <InfoField label="Kota" :value="data.customer_contact_city" />
        <InfoField label="Telepon" :value="data.customer_contact_telephone" />
        <InfoField label="No. Handphone" :value="data.customer_contact_phone_number" />
        <InfoField label="Email" :value="data.customer_contact_email" />
      </dl>
    </Card>

    <!-- Pekerjaan -->
    <Card title="Detail Pekerjaan">
      <dl class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Pekerjaan" :value="data.occupation" />
        <InfoField label="Detail Pekerjaan" :value="data.detail_occupation" />
        <InfoField label="Jabatan" :value="data.company_position" />
        <InfoField label="Jenis Bidang Usaha" :value="data.company_field" />
        <InfoField label="Nama Instansi / Perusahaan" :value="data.company_name" />
        <InfoField label="Alamat Perusahaan" :value="data.company_address" />
      </dl>
    </Card>
  </div>
</template>

<script setup>
/**
 * Daftar dokumen medis/tambahan yang diwajibkan pada detail penutupan.
 * Dibuat bersama karena SCC menampilkan blok dan aksi email yang sama pada
 * hampir semua tab; satu implementasi mencegah endpoint atau gating berbeda.
 */
import { ref } from 'vue'
import { Mail } from 'lucide-vue-next'
import { sendSubmissionMedicalNotification } from '@/lib/services/submission'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  submissionId: { type: [String, Number], required: true },
  documents: { type: Array, default: () => [] },
  canNotify: { type: Boolean, default: true },
})

const sending = ref(false)

async function sendEmail() {
  if (!props.canNotify) return
  sending.value = true
  try {
    await sendSubmissionMedicalNotification(props.submissionId)
    window.Swal.fire({ icon: 'success', title: 'Email Notifikasi Terkirim', padding: '2em' })
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Card v-if="documents.length" title="Dokumen Medis/Tambahan Diperlukan">
    <template #actions>
      <BaseButton v-if="canNotify" variant="outline-primary" :loading="sending" @click="sendEmail">
        <Mail class="h-4 w-4" /> Kirim Email Notifikasi
      </BaseButton>
    </template>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <label v-for="(doc, i) in documents" :key="i" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" :checked="doc.document_exist" disabled class="h-4 w-4 rounded border-slate-300" />
        {{ doc.document_required }}
      </label>
    </div>
  </Card>
</template>

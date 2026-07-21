<script setup>
/**
 * Daftar dokumen wajib restitusi dipusatkan karena SCC mengulang blok dan
 * endpoint email yang sama pada seluruh tab detail.
 */
import { ref } from 'vue'
import { Mail } from 'lucide-vue-next'
import { sendRestituteEmailNotification } from '@/lib/services/restitute'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  restituteId: { type: [String, Number], required: true },
  documents: { type: Array, default: () => [] },
  canNotify: { type: Boolean, default: true },
})

const sending = ref(false)

async function sendEmail() {
  if (!props.canNotify) return
  sending.value = true
  try {
    await sendRestituteEmailNotification(props.restituteId)
    window.Swal.fire({ icon: 'success', title: 'Email Notifikasi Terkirim', padding: '2em' })
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Card v-if="documents.length" title="Dokumen Berikut Belum Diupload">
    <template #actions>
      <BaseButton v-if="canNotify" variant="outline-primary" :loading="sending" @click="sendEmail">
        <Mail class="h-4 w-4" /> Kirim Email Notifikasi
      </BaseButton>
    </template>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <label v-for="(document, index) in documents" :key="index" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" :checked="document.document_exist" disabled class="h-4 w-4 rounded border-slate-300" />
        {{ document.document_required }}
      </label>
    </div>
  </Card>
</template>

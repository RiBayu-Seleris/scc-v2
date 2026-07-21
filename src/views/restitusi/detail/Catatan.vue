<script setup>
/**
 * DETAIL RESTITUSI — TAB CATATAN.
 * Menampilkan riwayat aktivitas (restitute/history/{id}) + dokumen wajib
 * (restitute/required-document/{id}).
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  getRestituteHistory,
  getRestituteRequiredDocuments,
  sendRestituteEmailNotification,
  storeRestituteHistory,
} from '@/lib/services/restitute'
import { restitusiDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import HistoryTimeline from '@/components/shared/HistoryTimeline.vue'
import Spinner from '@/components/ui/Spinner.vue'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Mail, Send } from 'lucide-vue-next'

useMeta({ title: 'Detail Restitusi — Catatan' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const histories = ref([])
const documents = ref([])
const loading = ref(true)
const description = ref('')
const saving = ref(false)
const sending = ref(false)
const canManage = computed(() => !['Reassurance', 'Retrosesi'].includes(auth.user?.role || session.role))

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil wajib tersedia karena role menentukan tambah catatan dan notifikasi.
    if (!user) return
    const [h, d] = await Promise.all([
      getRestituteHistory(id),
      getRestituteRequiredDocuments(id),
    ])
    histories.value = h
    documents.value = d
  } finally {
    loading.value = false
  }
})

async function submit() {
  if (!canManage.value || !description.value) return
  saving.value = true
  try {
    await storeRestituteHistory({
      restitute_id: parseInt(id, 10),
      user_id: parseInt(session.userId, 10),
      description: description.value,
    })
    histories.value = await getRestituteHistory(id)
    description.value = ''
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    saving.value = false
  }
}

async function sendEmail() {
  if (!canManage.value) return
  sending.value = true
  try {
    await sendRestituteEmailNotification(id)
    window.Swal.fire({ icon: 'success', title: 'Email Notifikasi Terkirim', padding: '2em' })
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <DetailTabsLayout :tabs="restitusiDetailTabs" :id="id" title="Detail Restitusi" :back="{ name: 'list-restitusi' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>
    <div v-else class="space-y-5">
      <Card v-if="canManage" title="Tambah Catatan">
        <template #actions>
          <BaseButton v-if="documents.length" variant="outline-primary" :loading="sending" @click="sendEmail">
            <Mail class="h-4 w-4" /> Kirim Email Notifikasi
          </BaseButton>
        </template>
        <div class="flex gap-2">
          <input v-model="description" class="form-input" placeholder="Masukan Catatan" @keyup.enter="submit" />
          <BaseButton :loading="saving" :disabled="!description" title="Kirim catatan" @click="submit"><Send class="h-4 w-4" /></BaseButton>
        </div>
      </Card>
      <HistoryTimeline :histories="histories" :documents="documents" />
    </div>
  </DetailTabsLayout>
</template>

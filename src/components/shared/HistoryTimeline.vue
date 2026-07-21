<script setup>
/**
 * RIWAYAT / CATATAN (reusable) — timeline aktivitas + daftar dokumen wajib.
 * Dipakai tab "Catatan" pada detail restitusi & klaim.
 *
 * Prop:
 *   - histories : array { username, description, created_at, photo_profile }
 *   - documents : array { document_required, document_exist }
 */
import Card from '@/components/ui/Card.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { formatDate } from '@/lib/format'
import { Check, X } from 'lucide-vue-next'

defineProps({
  histories: { type: Array, default: () => [] },
  documents: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
    <!-- Timeline riwayat -->
    <Card title="Riwayat Aktivitas" class="lg:col-span-2">
      <EmptyState v-if="!histories.length" message="Belum ada riwayat" class="py-8" />
      <ol v-else class="relative space-y-6 border-l border-slate-200 pl-6 dark:border-slate-700">
        <li v-for="(h, i) in histories" :key="i" class="relative">
          <!-- Titik timeline -->
          <span class="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-500/20">
            <img
              v-if="h.photo_profile"
              :src="h.photo_profile"
              alt=""
              class="h-6 w-6 rounded-full object-cover"
            />
            <span v-else class="h-2.5 w-2.5 rounded-full bg-primary-500" />
          </span>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ h.username || '-' }}</span>
              <span class="text-xs text-slate-400">{{ formatDate(h.created_at, 'DD/MM/YYYY HH:mm') }}</span>
            </div>
            <p class="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{{ h.description || '-' }}</p>
          </div>
        </li>
      </ol>
    </Card>

    <!-- Dokumen wajib -->
    <Card title="Dokumen Wajib">
      <EmptyState v-if="!documents.length" message="Tidak ada daftar dokumen" class="py-8" />
      <ul v-else class="space-y-2.5">
        <li v-for="(d, i) in documents" :key="i" class="flex items-center gap-3 text-sm">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            :class="d.document_exist ? 'bg-success-light text-success-dark' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'"
          >
            <Check v-if="d.document_exist" class="h-4 w-4" />
            <X v-else class="h-4 w-4" />
          </span>
          <span class="text-slate-700 dark:text-slate-300">{{ d.document_required }}</span>
        </li>
      </ul>
    </Card>
  </div>
</template>

<script setup>
/** Tampilan saat data kosong. */
import { Inbox } from 'lucide-vue-next'
defineProps({
  message: { type: String, default: 'Tidak ada data' },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
      <Inbox class="h-7 w-7" />
    </div>
    <p class="text-sm text-slate-500 dark:text-slate-400">{{ message }}</p>
    <slot />
  </div>
</template>

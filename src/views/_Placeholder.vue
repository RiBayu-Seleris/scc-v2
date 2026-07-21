<script setup>
import { useRoute } from 'vue-router'
import { AlertTriangle } from 'lucide-vue-next'
import { useMeta } from '@/composables/useMeta'

const route = useRoute()
useMeta({ title: 'Under Construction' })
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <div class="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-warning-light text-warning-dark dark:bg-warning/10 dark:text-warning">
      <AlertTriangle class="h-10 w-10" />
    </div>
    <h1 class="page-title mb-1">Under Construction</h1>
    <p class="max-w-md text-slate-500 dark:text-slate-400">{{ route.name }}</p>
  </div>
</template>

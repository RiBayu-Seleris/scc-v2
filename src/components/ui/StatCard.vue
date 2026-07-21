<script setup>
/**
 * Kartu statistik (angka ringkas) untuk dashboard & laporan.
 * Contoh: <StatCard label="Total Polis" :value="1200" icon="FileText" variant="primary" />
 */
import Icon from './Icon.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '0' },
  icon: { type: String, default: 'Circle' },
  variant: { type: String, default: 'primary' }, // primary/accent/success/warning/danger/info
})

// Warna latar & teks ikon per variant.
const tone = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300',
  accent: 'bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-300',
  success: 'bg-success-light text-success-dark dark:bg-success/10 dark:text-success-light',
  warning: 'bg-warning-light text-warning-dark dark:bg-warning/10 dark:text-warning-light',
  danger: 'bg-danger-light text-danger-dark dark:bg-danger/10 dark:text-danger-light',
  info: 'bg-info-light text-info-dark dark:bg-info/10 dark:text-info-light',
}
</script>

<template>
  <div class="card card-body flex items-center gap-3">
    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="tone[variant] || tone.primary">
      <Icon :name="icon" class="h-[18px] w-[18px]" />
    </div>
    <div class="min-w-0">
      <p class="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{{ label }}</p>
      <p class="mt-0.5 truncate text-lg font-semibold text-slate-800 dark:text-slate-100">{{ value }}</p>
    </div>
  </div>
</template>

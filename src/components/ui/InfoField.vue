<script setup>
/**
 * Menampilkan sepasang label + nilai (untuk halaman detail/profil).
 * Contoh: <InfoField label="Nama Debitur" :value="debitur.name" />
 * Nilai kosong otomatis ditampilkan sebagai "-".
 */
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number, null], default: '' },
})
</script>

<template>
  <div>
    <dt class="text-xs uppercase tracking-wide text-slate-400">{{ label }}</dt>
    <dd class="mt-0.5 break-words font-medium text-slate-700 dark:text-slate-200">
      {{ value === null || value === undefined || value === '' ? '-' : value }}
    </dd>
  </div>
</template>

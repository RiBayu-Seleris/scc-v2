<script setup>
/**
 * Header halaman: judul + subjudul + area aksi (tombol) di kanan.
 * Contoh:
 *   <PageHeader title="List Restitusi" subtitle="Kelola pengajuan restitusi">
 *     <BaseButton>Tambah</BaseButton>
 *   </PageHeader>
 */
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>

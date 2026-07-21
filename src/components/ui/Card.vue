<script setup>
/**
 * Kartu (card) reusable.
 * - Pakai prop `title` untuk header sederhana, atau slot #header untuk header custom.
 * - Slot #actions muncul di kanan header (mis. tombol).
 *
 * Contoh:
 *   <Card title="Data Nasabah">
 *     <template #actions><BaseButton>Tambah</BaseButton></template>
 *     ...isi...
 *   </Card>
 */
defineProps({
  title: { type: String, default: "" },
  // noBody: matikan padding bawaan (mis. saat isi berupa tabel penuh)
  noBody: { type: Boolean, default: false },
  bgFrom: {
    type: String,
    default: "",
  },
  bgTo: {
    type: String,
    default: "",
  },
  bgCardFrom: {
    type: String,
    default: "",
  },
  bgCardTo: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <div class="relative rounded-lg isolate">
    <!-- layer border, tidak memengaruhi ukuran -->
    <div
      class="absolute inset-0 -z-10 rounded-lg p-[1px]"
      :style="{
        backgroundImage: `linear-gradient(to right, ${bgFrom} 8%, ${bgTo})`,
      }"
    />
    <!-- konten menentukan ukuran -->
    <div
      class="m-[1px] rounded-md"
      :style="{
        backgroundImage: `linear-gradient(to bottom right, ${bgCardFrom} 60%, ${bgCardTo} 200%)`,
      }"
    >
      <div v-if="title || $slots.header || $slots.actions" class="card-header">
        <slot name="header">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ title }}
          </h3>
        </slot>
        <div v-if="$slots.actions" class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
      <div
        class="w-full h-auto flex flex-col justify-center"
        :class="noBody ? '' : 'card-body'"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

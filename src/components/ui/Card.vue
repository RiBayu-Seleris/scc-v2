<script setup>
/**
 * Kartu (card) reusable.
 * - Pakai prop `title` untuk header sederhana, atau slot #header untuk header custom.
 * - Slot #actions muncul di kanan header (mis. tombol).
 *
 * Dua tampilan:
 *  1. DEFAULT (tanpa prop bg*) -> kartu normal: border + background + shadow + padding.
 *     Dipakai halaman detail/list/shared supaya tiap bagian terpisah rapi.
 *  2. GRADIENT (bila bg* diisi) -> border/isi gradient. Dipakai dashboard.
 *
 * Contoh:
 *   <Card title="Data Nasabah">
 *     <template #actions><BaseButton>Tambah</BaseButton></template>
 *     ...isi...
 *   </Card>
 */
import { computed } from "vue";

const props = defineProps({
  title: { type: String, default: "" },
  // noBody: matikan padding bawaan (mis. saat isi berupa tabel penuh)
  noBody: { type: Boolean, default: false },
  bgFrom: { type: String, default: "" },
  bgTo: { type: String, default: "" },
  bgCardFrom: { type: String, default: "" },
  bgCardTo: { type: String, default: "" },
  // Paksa tampilan "raw/transparan" (relative isolate) TANPA border/bg/shadow bawaan,
  // supaya kartu bisa dikustomisasi sendiri lewat `class`. Contoh:
  //   <Card bare class="rounded-2xl border ...">   (mis. tabel di halaman pengajuan)
  bare: { type: Boolean, default: false },
});

// Tampilan "raw" (isolate/transparan) dipakai bila diminta eksplisit lewat `bare`,
// ATAU bila warna gradient diisi (dashboard). Selain itu: kartu normal berbingkai.
const isRaw = computed(
  () =>
    props.bare ||
    !!(props.bgFrom || props.bgTo || props.bgCardFrom || props.bgCardTo),
);
</script>

<template>
  <div
    :class="
      isRaw
        ? 'relative isolate rounded-lg'
        : 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
    "
  >
    <!-- Layer border gradient (hanya varian gradient) -->
    <div
      v-if="isRaw"
      class="absolute inset-0 -z-10 rounded-lg p-[1px]"
      :style="{
        backgroundImage: `linear-gradient(to right, ${bgFrom} 8%, ${bgTo})`,
      }"
    />
    <!-- Konten menentukan ukuran -->
    <div
      :class="isRaw ? 'm-[1px] rounded-lg' : ''"
      :style="
        isRaw
          ? {
              backgroundImage: `linear-gradient(to bottom right, ${bgCardFrom} 60%, ${bgCardTo} 200%)`,
            }
          : {}
      "
    >
      <div
        v-if="title || $slots.header || $slots.actions"
        :class="
          isRaw
            ? 'card-header'
            : 'flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800'
        "
      >
        <slot name="header">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ title }}
          </h3>
        </slot>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
      <div
        class="flex h-auto w-full flex-col justify-center"
        :class="noBody ? '' : isRaw ? 'card-body' : 'p-5'"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

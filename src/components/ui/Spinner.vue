<script setup>
/** Indikator loading (spinner) sederhana. Ukuran diatur lewat prop `size`. */
defineProps({
  size: { type: String, default: 'md' }, // sm | md | lg
})
const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-9 w-9' }
</script>

<template>
  <svg
    class="animate-spin text-current"
    :class="sizes[size] || sizes.md"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
  </svg>
</template>

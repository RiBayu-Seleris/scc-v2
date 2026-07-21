<script setup>
/**
 * Tombol reusable.
 * Contoh: <BaseButton variant="primary" :loading="isSaving" @click="save">Simpan</BaseButton>
 *
 * Prop:
 *  - variant : gaya warna (primary/secondary/danger/dst) -> memakai kelas .btn-* di main.css
 *  - size    : sm | md | lg
 *  - loading : true -> tampil spinner & tombol dinonaktifkan
 *  - type    : type html tombol (button/submit)
 */
import Spinner from './Spinner.vue'

const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})

// Petakan variant -> kelas CSS yang sudah ada di main.css.
const variantClass = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-danger',
  warning: 'btn-warning',
  info: 'btn-info',
  ghost: 'btn-ghost',
  'outline-primary': 'btn-outline-primary',
}
const sizeClass = { sm: 'btn-sm', md: '', lg: 'btn-lg' }
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[variantClass[variant] || 'btn-primary', sizeClass[size]]"
  >
    <Spinner v-if="loading" size="sm" />
    <slot />
  </button>
</template>

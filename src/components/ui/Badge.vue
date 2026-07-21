<script setup>
/**
 * Label status kecil (badge). Contoh: <Badge variant="success">Aktif</Badge>
 */
defineProps({
  variant: { type: String, default: 'muted' }, // primary/success/danger/warning/info/muted
})
const map = {
  primary: 'badge-primary',
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  info: 'badge-info',
  muted: 'badge-muted',
}
</script>

<template>
  <span :class="map[variant] || 'badge-muted'">
    <slot />
  </span>
</template>

<script setup>
/**
 * HALAMAN BERANDA (Home) — pemilih varian dashboard.
 * Meniru dispatcher di seleris-credit-cover `views/dashboard.vue`:
 *
 *   role Management                    -> DashboardStandard variant="management"
 *   role Bank / Branch Bank / Broker   -> DashboardStandard variant="bank"
 *   InsuredCompanyId '12' (Chubb)      -> DashboardChubb
 *   selain itu                         -> Dashboard utama
 */
import { computed } from 'vue'
import { getSession } from '@/lib/auth'
import DashboardMain from '@/views/Dashboard.vue'
import DashboardStandard from '@/views/dashboard/DashboardStandard.vue'
import DashboardChubb from '@/views/dashboard/DashboardChubb.vue'

const session = getSession()

const variant = computed(() => {
  if (session.role === 'Management') return 'management'
  if (['Bank', 'Branch Bank', 'Broker'].includes(session.role)) return 'bank'
  if (String(session.insuredCompanyId) === '12') return 'chubb'
  return 'main'
})
</script>

<template>
  <DashboardStandard v-if="variant === 'management'" variant="management" />
  <DashboardStandard v-else-if="variant === 'bank'" variant="bank" />
  <DashboardChubb v-else-if="variant === 'chubb'" />
  <DashboardMain v-else />
</template>

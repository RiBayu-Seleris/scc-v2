<script setup>
/**
 * HALAMAN PROFIL.
 * Menampilkan data user yang sedang login dari endpoint auth/data (via store).
 * (Di aplikasi lama halaman ini statis; di sini dibuat menampilkan data asli.)
 */
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { Mail, Building2, ShieldCheck, Hash } from 'lucide-vue-next'

useMeta({ title: 'Profil' })

const auth = useAuthStore()
const session = getSession()
const loading = ref(false)

onMounted(async () => {
  if (!auth.user) {
    loading.value = true
    await auth.fetchUser()
    loading.value = false
  }
})

const user = computed(() => auth.user || {})

// Ambil nilai pertama yang ada dari beberapa kemungkinan nama field (respons bisa beragam).
function pick(...keys) {
  for (const k of keys) {
    if (user.value[k]) return user.value[k]
  }
  return '-'
}

const fullName = computed(() => pick('name', 'full_name', 'username', 'user_code'))
const details = computed(() => [
  { icon: Mail, label: 'Email / Username', value: pick('email', 'username', 'user_code') },
  { icon: ShieldCheck, label: 'Role', value: session.role || pick('role') },
  { icon: Building2, label: 'Perusahaan', value: pick('company_name') },
  { icon: Hash, label: 'Kode Pengguna', value: session.userCode || pick('user_code') },
])
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader title="Profil" subtitle="Informasi akun Anda." />

    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <Card v-else>
      <div class="flex flex-col items-center gap-4 border-b border-slate-200 pb-6 dark:border-slate-700/60 sm:flex-row sm:items-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-500 text-3xl font-bold text-white">
          {{ (fullName || 'U').charAt(0).toUpperCase() }}
        </div>
        <div class="text-center sm:text-left">
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ fullName }}</h2>
          <p class="text-sm text-slate-500">{{ session.role || '-' }}</p>
        </div>
      </div>

      <dl class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div v-for="d in details" :key="d.label" class="flex items-start gap-3">
          <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
            <component :is="d.icon" class="h-5 w-5" />
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-400">{{ d.label }}</dt>
            <dd class="mt-0.5 font-medium text-slate-700 dark:text-slate-200">{{ d.value }}</dd>
          </div>
        </div>
      </dl>
    </Card>
  </div>
</template>

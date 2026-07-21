<script setup>
/**
 * HALAMAN LUPA KATA SANDI.
 * Mengirim email reset via auth/send-email-forgot-password (sama dengan aslinya).
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, ArrowLeft } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useMeta } from '@/composables/useMeta'
import BaseButton from '@/components/ui/BaseButton.vue'

useMeta({ title: 'Lupa Kata Sandi' })

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const loading = ref(false)

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

async function onSubmit() {
  if (!username.value) return alert('error', 'Email Pengguna Wajib Diisi')
  loading.value = true
  try {
    const ok = await auth.forgotPassword(username.value)
    ok ? alert('success', 'Silakan Periksa Email Anda') : alert('error', 'Email Pengguna tidak ditemukan')
  } catch {
    alert('error', 'Gagal mengirim email. Coba lagi.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <button
      type="button"
      class="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-500"
      @click="router.push({ name: 'sign-in' })"
    >
      <ArrowLeft class="h-4 w-4" /> Kembali ke halaman masuk
    </button>

    <h1 class="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">Lupa Kata Sandi?</h1>
    <p class="mb-8 text-sm text-slate-500 dark:text-slate-400">
      Masukkan email pengguna Anda. Kami akan mengirim tautan untuk mengatur ulang kata sandi.
    </p>

    <form class="space-y-5" @submit.prevent="onSubmit">
      <div>
        <label class="form-label">Email Pengguna</label>
        <div class="relative">
          <Mail class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input v-model="username" type="text" class="form-input pl-10" placeholder="Email Pengguna" />
        </div>
      </div>

      <BaseButton type="submit" variant="primary" size="lg" :loading="loading" class="w-full">
        Kirim Tautan Reset
      </BaseButton>
    </form>
  </div>
</template>

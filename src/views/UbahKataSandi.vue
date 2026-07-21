<script setup>
/**
 * HALAMAN UBAH KATA SANDI.
 * Endpoint sama dengan aslinya: POST auth/change-password
 *   body: { old_password, new_password, confirm_password }
 * Respons status 200 = berhasil.
 */
import { ref } from 'vue'
import api from '@/lib/api'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Eye, EyeOff } from 'lucide-vue-next'

useMeta({ title: 'Ubah Kata Sandi' })

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

async function onSubmit() {
  // Validasi klien
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    return alert('error', 'Semua kolom wajib diisi')
  }
  if (newPassword.value !== confirmPassword.value) {
    return alert('error', 'Kata Sandi Baru dan Konfirmasi harus sama')
  }

  loading.value = true
  try {
    const { data } = await api.post('auth/change-password', {
      old_password: oldPassword.value,
      new_password: newPassword.value,
      confirm_password: confirmPassword.value,
    })

    if (data.status === 200) {
      alert('success', 'Berhasil!')
      oldPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    } else if (data.message === 'Password does not match, please insert your proper old password.') {
      alert('error', 'Kata Sandi Lama Salah')
    } else {
      alert('error', 'Gagal mengubah kata sandi')
    }
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <PageHeader title="Ubah Kata Sandi" subtitle="Perbarui kata sandi akun Anda secara berkala demi keamanan." />

    <Card>
      <form class="space-y-5" @submit.prevent="onSubmit">
        <div>
          <label class="form-label">Kata Sandi Lama</label>
          <input v-model="oldPassword" :type="showPassword ? 'text' : 'password'" class="form-input" placeholder="Masukkan kata sandi lama" autocomplete="current-password" />
        </div>
        <div>
          <label class="form-label">Kata Sandi Baru</label>
          <input v-model="newPassword" :type="showPassword ? 'text' : 'password'" class="form-input" placeholder="Masukkan kata sandi baru" autocomplete="new-password" />
        </div>
        <div>
          <label class="form-label">Konfirmasi Kata Sandi Baru</label>
          <input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" class="form-input" placeholder="Ulangi kata sandi baru" autocomplete="new-password" />
        </div>

        <label class="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" v-model="showPassword" class="form-checkbox" />
          <component :is="showPassword ? EyeOff : Eye" class="h-4 w-4" />
          Tampilkan kata sandi
        </label>

        <div class="flex justify-end">
          <BaseButton type="submit" variant="primary" :loading="loading">Simpan</BaseButton>
        </div>
      </form>
    </Card>
  </div>
</template>

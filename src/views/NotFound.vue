<script setup>
/** Halaman 404 — muncul saat URL tidak dikenal. */
import { useRouter } from 'vue-router'
import { useMeta } from '@/composables/useMeta'
import BaseButton from '@/components/ui/BaseButton.vue'

useMeta({ title: 'Halaman Tidak Ditemukan' })
const router = useRouter()
</script>

<template>
  <div class="flex min-h-[70vh] flex-col items-center justify-center text-center">
    <p class="text-7xl font-extrabold text-primary-500">404</p>
    <h1 class="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">Halaman tidak ditemukan</h1>
    <p class="mt-2 max-w-md text-slate-500 dark:text-slate-400">
      Maaf, halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
    </p>
    <BaseButton class="mt-6" variant="primary" @click="router.push({ name: 'Home' })">
      Kembali ke Dashboard
    </BaseButton>
  </div>
</template>

<script setup>
/**
 * PENGATURAN AKUN — preferensi tampilan (tema & bahasa) + pintasan keamanan.
 * (Halaman ini statis di aplikasi lama; dibuat ringkas namun fungsional di sini.)
 */
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Sun, Moon, Monitor, KeyRound } from 'lucide-vue-next'

useMeta({ title: 'Pengaturan Akun' })

const router = useRouter()
const ui = useUiStore()
const { darkMode, locale } = storeToRefs(ui)

const themes = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Ikuti Sistem', icon: Monitor },
]
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <PageHeader title="Pengaturan Akun" subtitle="Atur preferensi tampilan dan keamanan akun." />

    <Card title="Tampilan">
      <div class="space-y-5">
        <div>
          <p class="form-label">Tema</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="t in themes"
              :key="t.value"
              type="button"
              @click="ui.applyDarkMode(t.value)"
              class="flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-colors"
              :class="
                darkMode === t.value
                  ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
              "
            >
              <component :is="t.icon" class="h-5 w-5" />
              {{ t.label }}
            </button>
          </div>
        </div>

        <div>
          <p class="form-label">Bahasa</p>
          <div class="flex gap-2">
            <button
              v-for="c in ui.countryList"
              :key="c.code"
              type="button"
              @click="ui.setLocale(c.code)"
              class="rounded-lg border px-4 py-2 text-sm transition-colors"
              :class="
                locale === c.code
                  ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300'
                  : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              "
            >
              {{ c.name }}
            </button>
          </div>
          <p class="form-hint">Bahasa Inggris menyusul.</p>
        </div>
      </div>
    </Card>

    <Card title="Keamanan">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-slate-700 dark:text-slate-200">Kata Sandi</p>
          <p class="text-sm text-slate-500">Ubah kata sandi Anda secara berkala.</p>
        </div>
        <BaseButton variant="secondary" @click="router.push({ name: 'ubah-kata-sandi' })">
          <KeyRound class="h-4 w-4" /> Ubah
        </BaseButton>
      </div>
    </Card>
  </div>
</template>

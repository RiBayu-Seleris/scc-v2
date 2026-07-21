<script setup>
/**
 * RIGHT PANEL (drawer pengaturan di kanan).
 * Berisi pilihan tema (Terang/Gelap/Ikuti Sistem) dan bahasa.
 * Dibuka dari tombol gerigi di Navbar.
 */
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { X, Sun, Moon, Monitor } from 'lucide-vue-next'

const ui = useUiStore()
const { isShowRightPanel, darkMode, locale } = storeToRefs(ui)

const themes = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Ikuti Sistem', icon: Monitor },
]
</script>

<template>
  <!-- Satu elemen root (aturan lint proyek); anak-anaknya fixed jadi div ini tak memengaruhi layout -->
  <div>
  <!-- Latar gelap saat panel terbuka -->
  <transition name="fade">
    <div
      v-if="isShowRightPanel"
      class="fixed inset-0 z-40 bg-slate-900/40"
      @click="ui.toggleRightPanel(false)"
    />
  </transition>

  <!-- Panel -->
  <aside
    class="fixed inset-y-0 right-0 z-50 w-80 max-w-full transform border-l border-slate-200 bg-white shadow-floating transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900"
    :class="isShowRightPanel ? 'translate-x-0' : 'translate-x-full'"
  >
    <div class="flex h-14 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
      <h2 class="text-base font-semibold">Pengaturan</h2>
      <button class="btn-icon btn-ghost" aria-label="Tutup" @click="ui.toggleRightPanel(false)">
        <X class="h-5 w-5" />
      </button>
    </div>

    <div class="space-y-6 p-5">
      <!-- Tema -->
      <section>
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Tema</h3>
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
      </section>

      <!-- Bahasa -->
      <section>
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Bahasa</h3>
        <div class="space-y-2">
          <button
            v-for="c in ui.countryList"
            :key="c.code"
            type="button"
            @click="ui.setLocale(c.code)"
            class="flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-colors"
            :class="
              locale === c.code
                ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
            "
          >
            {{ c.name }}
            <span v-if="locale === c.code" class="h-2 w-2 rounded-full bg-primary-500" />
          </button>
        </div>
        <p class="form-hint mt-2">Saat ini aktif: Bahasa Indonesia. Bahasa Inggris menyusul.</p>
      </section>
    </div>
  </aside>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

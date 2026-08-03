/**
 * Titik masuk aplikasi (entry point).
 * Di sinilah Vue, Pinia (state), Router (navigasi), dan i18n (bahasa) dirakit.
 */
import { createApp, defineAsyncComponent } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

// Style global (Tailwind + kelas komponen reusable)
import './assets/css/main.css'

import Swal from 'sweetalert2'

// SweetAlert2 dijadikan global karena kode lama memanggilnya via `window.Swal`.
window.Swal = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: 'app-swal-popup',
    title: 'app-swal-title',
    htmlContainer: 'app-swal-html',
    icon: 'app-swal-icon',
    actions: 'app-swal-actions',
    confirmButton: 'app-swal-confirm',
    cancelButton: 'app-swal-cancel',
    denyButton: 'app-swal-deny',
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// ApexCharts berat (~500KB) & hanya dipakai di halaman dashboard. Didaftarkan
// sebagai komponen ASYNC agar TIDAK ikut bundle awal — baru diunduh saat chart
// pertama dirender. Pemakaian di template tetap sama: <apexchart ... />.
app.component(
  'apexchart',
  defineAsyncComponent(() => import('vue3-apexcharts')),
)

// Terapkan tema (light/dark) yang tersimpan SEBELUM mount, supaya tidak "berkedip".
import { useUiStore } from './stores/ui'
useUiStore(pinia).initTheme()

app.mount('#app')

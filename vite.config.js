import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    // Vue DevTools HANYA di mode dev (serve). Jangan ikut bundle produksi
    // (menambah beban & bukan praktik baik untuk rilis).
    ...(command === 'serve' ? [vueDevTools({ launchEditor: 'code' })] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5178,
    host: true,
  },
  build: {
    // Pisahkan pustaka vendor supaya bundle utama lebih kecil & cache lebih awet
    // (ApexCharts sudah async -> chunk sendiri otomatis).
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia', 'vue-i18n', 'axios', '@vueuse/core'],
          sweetalert: ['sweetalert2'],
          moment: ['moment'],
        },
      },
    },
  },
}))

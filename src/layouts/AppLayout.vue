<script setup>
/**
 * LAYOUT UTAMA aplikasi (setelah login).
 * Merangkai: Sidebar (kiri) + Navbar (atas) + RightPanel (pengaturan) + konten + Footer.
 *
 * Saat dimuat, kita ambil flag hak akses menu (loadMenuFlags) supaya sidebar
 * menampilkan menu sesuai role user.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/layout/Sidebar.vue'
import Navbar from '@/components/layout/Navbar.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import Footer from '@/components/layout/Footer.vue'

const ui = useUiStore()
const auth = useAuthStore()
const { isCollapsed, isShowSidebar } = storeToRefs(ui)

function closeSidebarOnSmallScreen() {
  if (window.innerWidth <= 768) ui.toggleSidebar(false)
}

onMounted(() => {
  auth.loadMenuFlags()
  closeSidebarOnSmallScreen()
  window.addEventListener('resize', closeSidebarOnSmallScreen)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', closeSidebarOnSmallScreen)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0b1118]">
    <Sidebar />

    <!-- Latar gelap saat drawer sidebar terbuka di layar kecil -->
    <transition name="fade">
      <div
        v-if="isShowSidebar"
        class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        @click="ui.toggleSidebar(false)"
      />
    </transition>

    <!-- Area konten: geser ke kanan mengikuti lebar sidebar (hanya di desktop) -->
    <div class="flex min-h-screen flex-col transition-all duration-300" :class="isCollapsed ? 'lg:ml-[74px]' : 'lg:ml-64'">
      <Navbar />

      <main class="flex-1 p-4 sm:p-6">
        <slot />
      </main>

      <Footer />
    </div>

    <RightPanel />
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

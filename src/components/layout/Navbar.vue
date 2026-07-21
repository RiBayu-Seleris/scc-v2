<script setup>
/**
 * NAVBAR (topbar).
 * Berisi: tombol buka/tutup sidebar, judul, toggle tema (dark/light),
 * tombol pengaturan (RightPanel), dan menu user (profil, ubah sandi, keluar).
 */
import { computed, onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { onClickOutside } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { useUiStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import {
  Menu,
  Sun,
  Moon,
  Settings,
  User,
  KeyRound,
  LogOut,
  ChevronDown,
  Search,
} from "lucide-vue-next";

const ui = useUiStore();
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { isDark } = storeToRefs(ui);

const session = computed(() => auth.session);
const user = computed(() => auth.user || {});
const partnerName = computed(() => auth.session.partnerName || "");
const truncatedPartnerName = computed(() =>
  partnerName.value.length > 10
    ? partnerName.value.substring(0, 10) + "..."
    : partnerName.value,
);
const partnerOptions = computed(() =>
  auth.partners.filter(
    (p) => parseInt(p.partner_id, 10) !== parseInt(auth.session.partnerId, 10),
  ),
);

const roleLabel = computed(() => {
  const map = {
    Insurance: "Asuransi",
    Broker: "Broker",
    Bank: "Bank",
    "Branch Bank": "Cabang Bank",
    Reassurance: "Reasuransi",
    Retrosesi: "Retrosesi",
    Admin: "Administrator",
    Director: "Director",
    Management: "Management",
  };
  return map[auth.session.role] || auth.session.role || "Pengguna";
});

// Dropdown user (buka/tutup + tutup saat klik di luar).
const userMenuOpen = ref(false);
const userMenuRef = ref(null);
onClickOutside(userMenuRef, () => (userMenuOpen.value = false));

// Dropdown pilih bank/partner (sama seperti ehd-backoffice header).
const partnerMenuOpen = ref(false);
const partnerMenuRef = ref(null);
const partnerSearch = ref("");
onClickOutside(partnerMenuRef, () => (partnerMenuOpen.value = false));

onMounted(async () => {
  if (!auth.user) await auth.fetchUser();
  if (!auth.partners.length) await auth.loadPartners();
});

/** Tombol menu: di layar kecil buka drawer, di desktop kecilkan/lebarkan sidebar. */
function onToggleSidebar() {
  if (window.innerWidth < 1024) {
    ui.toggleSidebar();
  } else {
    ui.collapseSidebar();
  }
}

function goTo(name) {
  userMenuOpen.value = false;
  router.push({ name });
}

function onLogout() {
  userMenuOpen.value = false;
  auth.logout();
}

async function searchPartner() {
  await auth.loadPartners(partnerSearch.value);
}

function choosePartner(partner) {
  partnerMenuOpen.value = false;
  auth.selectPartner(partner);
}
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
  >
    <!-- Toggle sidebar -->
    <button
      type="button"
      class="btn-icon btn-ghost"
      aria-label="Menu"
      @click="onToggleSidebar"
    >
      <Menu class="h-5 w-5" />
    </button>

    <div class="flex-1"></div>

    <!-- Pilih Bank/Partner. Sama seperti header asli: disembunyikan di halaman Home
         (dashboard punya filter partner sendiri). Menggerakkan partnerIdSelected global. -->
    <div
      v-if="route.name !== 'Home'"
      ref="partnerMenuRef"
      class="relative min-w-0"
    >
      <button
        type="button"
        class="flex min-w-[128px] max-w-[48vw] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:min-w-[180px] sm:max-w-[280px]"
        @click="partnerMenuOpen = !partnerMenuOpen"
      >
        <span class="min-w-0">
          <span class="block truncate sm:hidden">{{
            truncatedPartnerName || "Pilih Bank"
          }}</span>
          <span class="hidden truncate sm:block">{{
            partnerName || "Pilih Bank"
          }}</span>
        </span>
        <ChevronDown
          class="h-4 w-4 shrink-0 text-slate-400 transition-transform"
          :class="{ 'rotate-180': partnerMenuOpen }"
        />
      </button>

      <transition name="dropdown-pop">
        <div
          v-if="partnerMenuOpen"
          class="absolute right-0 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-floating dark:border-slate-700 dark:bg-slate-800"
        >
          <div class="border-b border-slate-100 p-3 dark:border-slate-700">
            <div
              class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <Search class="h-4 w-4 text-slate-400" />
              <input
                v-model="partnerSearch"
                type="text"
                class="w-full bg-transparent text-sm outline-none"
                placeholder="Search"
                @keyup="searchPartner"
              />
            </div>
          </div>
          <div class="max-h-[420px] overflow-y-auto py-1">
            <button
              v-for="partner in partnerOptions"
              :key="partner.partner_id"
              type="button"
              class="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
              @click="choosePartner(partner)"
            >
              <span class="truncate">{{ partner.partner_name }}</span>
            </button>
            <div
              v-if="!partnerOptions.length"
              class="px-4 py-8 text-center text-sm text-slate-400"
            >
              Tidak ada bank lain
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- Toggle tema -->
    <button
      type="button"
      class="btn-icon btn-ghost"
      aria-label="Ganti tema"
      @click="ui.toggleDark()"
    >
      <Sun v-if="isDark" class="h-5 w-5" />
      <Moon v-else class="h-5 w-5" />
    </button>

    <!-- Pengaturan (RightPanel) -->
    <button
      type="button"
      class="btn-icon btn-ghost"
      aria-label="Pengaturan"
      @click="ui.toggleRightPanel(true)"
    >
      <Settings class="h-5 w-5" />
    </button>

    <!-- Menu user -->
    <div ref="userMenuRef" class="relative">
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        @click="userMenuOpen = !userMenuOpen"
      >
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
        >
          {{ (session.role || "U").charAt(0).toUpperCase() }}
        </span>
        <span class="hidden text-left sm:block">
          <span
            class="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >{{ user.username || "User" }}</span
          >
          <span class="block text-xs text-slate-400">{{ roleLabel }}</span>
        </span>
        <ChevronDown class="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>

      <!-- Dropdown -->
      <transition name="fade">
        <div
          v-if="userMenuOpen"
          class="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-floating dark:border-slate-700 dark:bg-slate-800"
        >
          <button class="dropdown-item" @click="goTo('profile')">
            <User class="h-4 w-4" /> Profil
          </button>
          <button class="dropdown-item" @click="goTo('ubah-kata-sandi')">
            <KeyRound class="h-4 w-4" /> Ubah Kata Sandi
          </button>
          <div
            class="my-1 border-t border-slate-100 dark:border-slate-700"
          ></div>
          <button class="dropdown-item text-danger" @click="onLogout">
            <LogOut class="h-4 w-4" /> Keluar
          </button>
        </div>
      </transition>
    </div>
  </header>
</template>

<style scoped>
.dropdown-item {
  @apply flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.dropdown-pop-enter-active,
.dropdown-pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.dropdown-pop-enter-from,
.dropdown-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>

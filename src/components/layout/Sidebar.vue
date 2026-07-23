<script setup>
/**
 * SIDEBAR (menu kiri).
 *
 * - Menu diambil dari konfigurasi data (src/config/menu.js) lalu difilter sesuai
 *   hak akses/role user (store.menuFlags). Jadi TIDAK ada HTML menu yang ditulis
 *   manual di sini — cukup ubah datanya bila mau menambah menu.
 * - Grup bersifat ACCORDION: membuka satu grup otomatis menutup grup lain
 *   (sama seperti perilaku collapse `data-bs-parent="#sidebar"` di ehd-backoffice).
 * - Mode "mini" (isCollapsed): hanya ikon. Klik grup saat mini akan melebarkan sidebar.
 * - Di layar kecil, sidebar jadi drawer melayang (isShowSidebar).
 *
 * Animasi buka/tutup submenu memakai JS hook (hitung tinggi asli elemen) supaya
 * gerakannya halus dan akurat — bukan trik max-height yang terasa kaku.
 */
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { buildMenu } from "@/config/menu";
import Icon from "@/components/ui/Icon.vue";
import { ChevronRight } from "lucide-vue-next";
import Logo from "/assets/images/cc-logo.png";

const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();
const { isCollapsed } = storeToRefs(ui);

// Menu final yang sudah difilter role.
const menu = computed(() => buildMenu(auth.menuFlags));

// ACCORDION: hanya SATU grup yang boleh terbuka. Simpan id-nya (null = semua tertutup).
const openGroup = ref(null);

function isGroupOpen(id) {
  return openGroup.value === id;
}

function toggleGroup(id) {
  // Saat mode mini, klik grup justru melebarkan sidebar dulu supaya menu terbaca.
  if (isCollapsed.value) {
    ui.collapseSidebar(false);
    openGroup.value = id;
    return;
  }
  // Klik grup yang sama -> tutup; grup lain -> buka & tutup yang sebelumnya.
  openGroup.value = openGroup.value === id ? null : id;
}

// Apakah sebuah route sedang aktif?
function isActive(routeName) {
  return route.name === routeName;
}

// Grup dianggap aktif bila salah satu anaknya aktif.
function isGroupActive(group) {
  return group.children?.some((child) => isActive(child.route));
}

// Buka otomatis grup yang memuat halaman aktif (mis. setelah refresh / navigasi).
watch(
  () => route.name,
  () => {
    for (const group of menu.value) {
      if (group.children && isGroupActive(group)) {
        openGroup.value = group.id;
        return;
      }
    }
  },
  { immediate: true },
);

// Tutup drawer saat klik menu di layar kecil.
function onNavigate() {
  if (window.innerWidth < 1024) ui.toggleSidebar(false);
}

/* ---------- Animasi tinggi submenu (WAAPI, very smooth) ---------- */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)"; // easeOutExpo-like; lebih lembut di akhir.

function resetTransition(el) {
  if (el._sidebarTimer) clearTimeout(el._sidebarTimer);
  if (el._sidebarEnd) el.removeEventListener("transitionend", el._sidebarEnd);
  if (el._sidebarAnimation) {
    el._sidebarAnimation.onfinish = null;
    el._sidebarAnimation.oncancel = null;
    el._sidebarAnimation.cancel();
  }
  el._sidebarTimer = null;
  el._sidebarEnd = null;
  el._sidebarAnimation = null;
}

function onBeforeEnter(el) {
  resetTransition(el);
  el.style.overflow = "hidden";
  el.style.height = "0";
  el.style.opacity = "0";
  el.style.transform = "translate3d(0, -10px, 0) scaleY(0.985)";
  el.style.transformOrigin = "top";
  el.style.willChange = "height, opacity, transform";
}

function onEnter(el, done) {
  const targetHeight = el.scrollHeight;
  el._sidebarAnimation = el.animate(
    [
      {
        height: "0px",
        opacity: 0,
        transform: "translate3d(0, -10px, 0) scaleY(0.985)",
      },
      {
        height: targetHeight + "px",
        opacity: 1,
        transform: "translate3d(0, 0, 0) scaleY(1)",
      },
    ],
    { duration: 460, easing: EASE, fill: "forwards" },
  );
  el._sidebarAnimation.onfinish = () => done();
  el._sidebarAnimation.oncancel = () => done();
}

function onAfterEnter(el) {
  resetTransition(el);
  // Bersihkan style inline supaya tinggi kembali otomatis saat konten/viewport berubah.
  el.style.height = "";
  el.style.opacity = "";
  el.style.transform = "";
  el.style.transition = "";
  el.style.overflow = "";
  el.style.transformOrigin = "";
  el.style.willChange = "";
}

function onBeforeLeave(el) {
  resetTransition(el);
  el.style.overflow = "hidden";
  el.style.height = el.scrollHeight + "px";
  el.style.opacity = "1";
  el.style.transform = "translate3d(0, 0, 0) scaleY(1)";
  el.style.transformOrigin = "top";
  el.style.willChange = "height, opacity, transform";
}

function onLeave(el, done) {
  const startHeight = el.scrollHeight;
  el._sidebarAnimation = el.animate(
    [
      {
        height: startHeight + "px",
        opacity: 1,
        transform: "translate3d(0, 0, 0) scaleY(1)",
      },
      {
        height: "0px",
        opacity: 0,
        transform: "translate3d(0, -10px, 0) scaleY(0.985)",
      },
    ],
    { duration: 380, easing: EASE, fill: "forwards" },
  );
  el._sidebarAnimation.onfinish = () => done();
  el._sidebarAnimation.oncancel = () => done();
}

function onAfterLeave(el) {
  resetTransition(el);
  el.style.height = "";
  el.style.opacity = "";
  el.style.transform = "";
  el.style.transition = "";
  el.style.overflow = "";
  el.style.transformOrigin = "";
  el.style.willChange = "";
}
</script>

<template>
  <aside
    class="sidebar-shell fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900"
    :class="[
      isCollapsed ? 'w-[74px]' : 'w-64',
      ui.isShowSidebar ? 'translate-x-0' : '-translate-x-full',
      'lg:translate-x-0',
    ]"
  >
    <!-- Brand / Logo -->
    <div
      class="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-4 dark:border-slate-800"
    >
      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D60742] text-xs font-bold text-white mx-auto"
        :class="{ 'sidebar-text-collapsed hidden': !isCollapsed }"
      >
        SCC
      </div>
      <!-- Logo Seleris Credit Cover (sama seperti aslinya: satu berkas, tanpa varian gelap) -->
      <img
        :src="Logo"
        alt="Seleris Credit Cover"
        class="h-full w-auto py-1 object-contain"
        :class="{ hidden: isCollapsed }"
      />
      <!-- <span
        class="sidebar-text truncate text-base font-bold text-slate-800 dark:text-slate-100"
        :class="{ 'sidebar-text-collapsed': isCollapsed }"
      >
        Seleris <span class="text-primary-500">CC</span>
      </span> -->
    </div>

    <!-- Daftar menu -->
    <nav class="flex-1 space-y-1 overflow-y-auto px-4 py-4">
      <template v-for="group in menu">
        <!-- Menu tunggal nonaktif (mis. Excel Sertifikat saat tidak berlaku) -->
        <button
          v-if="!group.children && group.disabled"
          :key="`disabled-${group.id}`"
          type="button"
          disabled
          class="group flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-400 opacity-60"
          :title="isCollapsed ? group.label : ''"
        >
          <Icon :name="group.icon" class="h-[18px] w-[18px] shrink-0" />
          <span
            class="sidebar-text truncate"
            :class="{ 'sidebar-text-collapsed': isCollapsed }"
            >{{ group.label }}</span
          >
        </button>

        <!-- Menu tunggal -->
        <router-link
          v-else-if="!group.children"
          :key="`single-${group.id}`"
          :to="{ name: group.route }"
          @click="onNavigate"
          class="menu-item group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium"
          :class="
            isActive(group.route)
              ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-200'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          :title="isCollapsed ? group.label : ''"
        >
          <Icon :name="group.icon" class="h-[18px] w-[18px] shrink-0" />
          <span
            class="sidebar-text truncate"
            :class="{ 'sidebar-text-collapsed': isCollapsed }"
            >{{ group.label }}</span
          >
        </router-link>

        <!-- Grup dengan anak menu (accordion) -->
        <div v-else :key="`group-${group.id}`">
          <button
            type="button"
            @click="toggleGroup(group.id)"
            class="menu-item group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium"
            :class="
              isGroupActive(group)
                ? 'text-primary-700 dark:text-primary-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            "
            :title="isCollapsed ? group.label : ''"
          >
            <Icon :name="group.icon" class="h-[18px] w-[18px] shrink-0" />
            <span
              class="sidebar-text flex-1 truncate text-left"
              :class="{ 'sidebar-text-collapsed': isCollapsed }"
            >
              {{ group.label }}
            </span>
            <ChevronRight
              class="chevron h-4 w-4 shrink-0"
              :class="{
                'rotate-90': isGroupOpen(group.id),
                'chevron-collapsed': isCollapsed,
              }"
            />
          </button>

          <!-- Anak menu: animasi tinggi via JS hook -->
          <transition
            :css="false"
            @before-enter="onBeforeEnter"
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @before-leave="onBeforeLeave"
            @leave="onLeave"
            @after-leave="onAfterLeave"
          >
            <ul
              v-if="!isCollapsed && isGroupOpen(group.id)"
              class="mt-1 space-y-1 overflow-hidden pl-4"
            >
              <li
                v-for="(child, index) in group.children"
                :key="child.id"
                class="submenu-child"
                :style="{ '--i': index }"
              >
                <router-link
                  :to="{ name: child.route }"
                  @click="onNavigate"
                  class="menu-item flex items-center gap-2.5 rounded-lg py-1.5 pl-4 pr-3 text-[13px]"
                  :class="
                    isActive(child.route)
                      ? 'font-medium text-primary-700 dark:text-primary-200'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                  "
                >
                  <span
                    class="dot h-1 w-1 shrink-0 rounded-full"
                    :class="
                      isActive(child.route)
                        ? 'bg-primary-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    "
                  />
                  <span class="truncate">{{ child.label }}</span>
                </router-link>
              </li>
            </ul>
          </transition>
        </div>
      </template>
    </nav>
  </aside>
</template>

<style scoped>
/* Lebar & geser sidebar — pakai kurva lembut yang sama dengan submenu. */
.sidebar-shell {
  will-change: width, transform;
  transition:
    width 420ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 280ms ease;
}

/* Semua item menu: transisi warna/latar/geser yang halus. */
.menu-item {
  will-change: background-color, color, transform;
  transition:
    background-color 240ms ease,
    color 240ms ease,
    transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 240ms ease;
}

/* Panah grup berputar dengan lembut. */
.chevron {
  transition:
    opacity 260ms ease,
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
    width 360ms cubic-bezier(0.16, 1, 0.3, 1);
}

.chevron-collapsed {
  width: 0;
  opacity: 0;
  transform: translateX(-8px) scale(0.8);
}

/* Titik penanda anak menu ikut membesar halus saat aktif. */
.dot {
  transition:
    background-color 240ms ease,
    transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.submenu-child {
  animation: submenu-child-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i) * 28ms);
}

.sidebar-text {
  min-width: 0;
  max-width: 180px;
  opacity: 1;
  transform: translate3d(0, 0, 0);
  white-space: nowrap;
  will-change: max-width, opacity, transform;
  transition:
    max-width 420ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 240ms ease,
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}

.sidebar-text-collapsed {
  max-width: 0;
  opacity: 0;
  transform: translate3d(-12px, 0, 0);
  pointer-events: none;
}

@keyframes submenu-child-in {
  from {
    opacity: 0;
    transform: translate3d(-10px, -2px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>

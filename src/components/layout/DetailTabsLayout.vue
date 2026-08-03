<script setup>
/**
 * KERANGKA HALAMAN DETAIL (dengan tab).
 *
 * Halaman detail sebuah record (mis. detail restitusi/klaim) terdiri dari beberapa
 * tab: Data Debitur, Data Asuransi, Dokumen, SLA, dst. Tiap tab adalah route
 * terpisah yang berbagi `id` yang sama. Komponen ini menyediakan:
 *   - tombol kembali
 *   - baris tab (router-link ke tiap tab, membawa param id yang sama)
 *   - area konten (lewat <slot />)
 *
 * Pemakaian:
 *   <DetailTabsLayout :tabs="tabs" :id="id" title="Detail Restitusi" :back="{ name: 'list-restitusi' }">
 *     ...isi tab aktif...
 *   </DetailTabsLayout>
 */
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { getSession } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";
import { getSubmissionDebitur } from "@/lib/services/submission";
import { getClaimInsurance } from "@/lib/services/claim";

const props = defineProps({
  // [{ label: 'Data Debitur', route: 'detail-restitusi-data-debitur' }, ...]
  tabs: { type: Array, required: true },
  // id record yang sedang dibuka (diteruskan ke tiap tab).
  id: { type: [String, Number], required: true },
  title: { type: String, default: "Detail" },
  // tujuan tombol kembali, mis. { name: 'list-restitusi' }
  back: { type: Object, default: null },
  tabContext: { type: Object, default: () => ({}) },
});

const router = useRouter();
const auth = useAuthStore();
const tabScroller = ref(null);
const fetchedTabContext = ref({});

const needsSubmissionContext = computed(() =>
  props.tabs.some(
    (tab) =>
      tab.visible === "showDokumenSpajkPage" ||
      tab.visible === "showMenuForBank" ||
      tab.visible === "showMenuForAdmin",
  ),
);
const needsClaimContext = computed(() =>
  props.tabs.some(
    (tab) =>
      tab.visible === "showClaimAnalysis" ||
      tab.visible === "showClaimRevision" ||
      tab.visible === "showClaimSla",
  ),
);

const fallbackTabContext = computed(() => {
  const role = getSession().role;
  return {
    showDokumenSpajkPage: false,
    showMenuForBank: !["Bank", "Branch Bank"].includes(role),
    showMenuForAdmin: role === "Admin",
    showClaimAnalysis: false,
    showClaimRevision: false,
    showClaimSla: false,
  };
});
const resolvedTabContext = computed(() => ({
  ...fallbackTabContext.value,
  ...fetchedTabContext.value,
  ...props.tabContext,
}));

async function loadSubmissionContext() {
  if (!needsSubmissionContext.value) return;
  try {
    const user = auth.user || (await auth.fetchUser());
    if (!user) {
      // Tanpa profil, tab khusus role tidak boleh ditebak karena dapat membuka
      // fungsi yang seharusnya tidak tersedia untuk pengguna tersebut.
      fetchedTabContext.value = {};
      return;
    }
    const detail = await getSubmissionDebitur(props.id);
    fetchedTabContext.value = {
      showDokumenSpajkPage: !detail.insert_spajk,
      showMenuForBank: !["Bank", "Branch Bank"].includes(user.role),
      showMenuForAdmin: user.role === "Admin",
    };
  } catch {
    // Konteks yang gagal dimuat harus tetap restriktif supaya tab bersyarat
    // tidak terbuka hanya karena salah satu request gagal.
    fetchedTabContext.value = {};
  }
}

async function loadClaimContext() {
  if (!needsClaimContext.value) return;
  try {
    const user = auth.user || (await auth.fetchUser());
    if (!user) return;
    const insurance = await getClaimInsurance(props.id);
    fetchedTabContext.value = {
      ...fetchedTabContext.value,
      showClaimAnalysis: insurance.claim_status === "analyze_claim",
      showClaimRevision: ["Bank", "Branch Bank", "Admin"].includes(user.role),
      showClaimSla: !["Bank", "Branch Bank"].includes(user.role),
    };
  } catch {
    fetchedTabContext.value = {};
  }
}

const visibleTabs = computed(() =>
  props.tabs.filter((tab) => {
    if (tab.visible === false) return false;
    if (typeof tab.visible === "string") {
      return !!resolvedTabContext.value[tab.visible];
    }
    if (typeof tab.visible === "function")
      return tab.visible(resolvedTabContext.value);
    return true;
  }),
);

// Behaviour ala perfect-scrollbar (tanpa library):
// - Trackpad (sudah menghasilkan gerak horizontal) DIBIARKAN native -> paling mulus.
// - Mouse wheel (vertikal) diterjemahkan jadi geser tab horizontal, lalu dilepas ke
//   scroll halaman saat tab sudah mentok kiri/kanan.
function onTabWheel(event) {
  const el = tabScroller.value;
  if (!el) return;
  if (Math.abs(event.deltaX) > 0) return; // biarkan native menangani gerak horizontal
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 0) return;
  const atStart = el.scrollLeft <= 0 && event.deltaY < 0;
  const atEnd = el.scrollLeft >= max - 1 && event.deltaY > 0;
  if (atStart || atEnd) return;
  event.preventDefault();
  el.scrollLeft += event.deltaY;
}

// Tombol panah kiri/kanan: geser tab dengan animasi halus (khusus klik).
function scrollTabs(direction) {
  tabScroller.value?.scrollBy({ left: direction * 240, behavior: "smooth" });
}

function loadTabContext() {
  loadSubmissionContext();
  loadClaimContext();
}

onMounted(loadTabContext);
watch(() => props.id, loadTabContext);
</script>

<template>
  <div>
    <!-- Header: kembali + judul -->
    <div class="mb-4 flex items-center gap-3">
      <button
        v-if="back"
        class="btn-icon btn-secondary"
        title="Kembali"
        @click="router.push(back)"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <h1 class="page-title">{{ title }}</h1>
    </div>

    <!-- Tab: horizontal scroll mulus (behaviour ala perfect-scrollbar) + tombol panah -->
    <div class="mb-3 flex items-start gap-2">
      <button
        type="button"
        class="detail-tab-arrow"
        aria-label="Geser tab ke kiri"
        @click="scrollTabs(-1)"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <div ref="tabScroller" class="detail-tab-scroll" @wheel="onTabWheel">
        <router-link
          v-for="tab in visibleTabs"
          :key="tab.route"
          :to="{ name: tab.route, params: { id }, query: $route.query }"
          class="detail-tab-link"
          :class="
            $route.name === tab.route
              ? 'bg-primary-600 text-white shadow-sm dark:bg-primary-500'
              : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          "
        >
          {{ tab.label }}
        </router-link>
      </div>
      <button
        type="button"
        class="detail-tab-arrow"
        aria-label="Geser tab ke kanan"
        @click="scrollTabs(1)"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>

    <!-- Konten tab aktif -->
    <slot />
  </div>
</template>

<style scoped>
.detail-tab-scroll {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  gap: 0.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 16px;
  /* Scrollbar tipis ala perfect-scrollbar (Firefox). */
  scrollbar-width: thin;
  scrollbar-color: rgb(203 213 225) transparent;
}

/* Scrollbar tipis ala perfect-scrollbar (WebKit/Chrome/Safari). */
.detail-tab-scroll::-webkit-scrollbar {
  height: 4px;
}
.detail-tab-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.detail-tab-scroll::-webkit-scrollbar-thumb {
  background: rgb(203 213 225);
  border-radius: 9999px;
}
.detail-tab-scroll::-webkit-scrollbar-thumb:hover {
  background: rgb(148 163 184);
}
:global(.dark) .detail-tab-scroll {
  scrollbar-color: rgb(51 65 85) transparent;
}
:global(.dark) .detail-tab-scroll::-webkit-scrollbar-thumb {
  background: rgb(51 65 85);
}

.detail-tab-link {
  display: inline-flex;
  min-height: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.25rem;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

/* Tombol panah geser tab (kiri/kanan). */
.detail-tab-arrow {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  margin-top: 0.125rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: #ffffff;
  color: rgb(100 116 139);
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}
.detail-tab-arrow:hover {
  border-color: rgb(203 213 225);
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}
:global(.dark) .detail-tab-arrow {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(148 163 184);
}
:global(.dark) .detail-tab-arrow:hover {
  background: rgb(30 41 59);
  color: rgb(241 245 249);
}
</style>

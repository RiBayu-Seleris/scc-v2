<script setup>
/**
 * DATATABLE reusable (pencarian + urut + halaman, semua di sisi klien).
 *
 * Dipakai berulang di halaman "List ..." menggantikan bermacam library tabel
 * (vue3-datatable, v-tables-3, dll) di aplikasi lama.
 *
 * Pemakaian dasar:
 *   <DataTable :columns="columns" :rows="rows" :loading="loading">
 *     <!-- render sel khusus: nama slot = 'cell-<key kolom>' -->
 *     <template #cell-status="{ row }">
 *       <Badge :variant="row.status === 'Aktif' ? 'success' : 'muted'">{{ row.status }}</Badge>
 *     </template>
 *     <template #cell-aksi="{ row }">
 *       <BaseButton size="sm" @click="lihat(row)">Detail</BaseButton>
 *     </template>
 *   </DataTable>
 *
 * Definisi kolom:
 *   columns = [
 *     { key: 'nama',   label: 'Nama',   sortable: true },
 *     { key: 'premi',  label: 'Premi',  align: 'right', formatter: (v) => rupiah(v) },
 *     { key: 'aksi',   label: 'Aksi',   align: 'center' }, // pakai slot #cell-aksi
 *   ]
 *
 * Catatan keamanan: nilai sel dirender sebagai TEKS biasa (bukan v-html),
 * jadi aman dari XSS. Untuk tampilan kaya, gunakan slot.
 */
import { computed, ref, watch, onMounted } from "vue";
import {
  Search,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import EmptyState from "./EmptyState.vue";

const props = defineProps({
  columns: { type: Array, required: true },
  // MODE 1 (client): berikan seluruh data lewat `rows` -> filter/urut/halaman di browser.
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: "Cari..." },
  pageSize: { type: Number, default: 10 },
  emptyMessage: { type: String, default: "Tidak ada data" },

  // MODE 2 (server): data diambil per-halaman dari server (untuk data besar).
  // Aktifkan `serverSide` lalu berikan `fetcher(params)` yang mengembalikan
  // { rows, total }. params = { start, length, search, page, perPage, sortKey, sortDir }.
  serverSide: { type: Boolean, default: false },
  fetcher: { type: Function, default: null },
});

const search = ref("");
const sortKey = ref("");
const sortDir = ref("asc"); // asc | desc
const perPage = ref(props.pageSize);
const page = ref(1);

const perPageOptions = [10, 25, 50, 100];

// ---- State khusus mode server ----
const serverRows = ref([]);
const serverTotal = ref(0);
const serverLoading = ref(false);
let searchTimer = null;

async function fetchServer() {
  if (!props.serverSide || !props.fetcher) return;
  serverLoading.value = true;
  try {
    const res = await props.fetcher({
      start: (page.value - 1) * perPage.value,
      length: perPage.value,
      search: search.value.trim(),
      page: page.value,
      perPage: perPage.value,
      sortKey: sortKey.value,
      sortDir: sortDir.value,
    });
    serverRows.value = res?.rows || [];
    serverTotal.value = Number(res?.total ?? 0);
  } catch {
    serverRows.value = [];
    serverTotal.value = 0;
  } finally {
    serverLoading.value = false;
  }
}

// Muat ulang dari server saat halaman/jumlah-per-halaman berubah.
// Pengurutan TIDAK memicu fetch ulang: dilakukan di klien atas data halaman ini.
watch([page, perPage], () => {
  if (props.serverSide) fetchServer();
});
// Pencarian di mode server: tunggu 400ms (debounce) lalu mulai dari halaman 1.
watch(search, () => {
  if (!props.serverSide) return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (page.value !== 1)
      page.value = 1; // memicu watcher di atas
    else fetchServer();
  }, 400);
});

onMounted(() => {
  if (props.serverSide) fetchServer();
});

// Panggil ini dari luar (ref) untuk memuat ulang data server, mis. setelah hapus.
defineExpose({ reload: fetchServer });

// Kolom yang boleh dipakai untuk mencari (punya key sungguhan).
const searchableKeys = computed(() =>
  props.columns.filter((c) => c.key).map((c) => c.key),
);

// 1) Filter berdasarkan kata kunci pencarian.
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.rows;
  return props.rows.filter((row) =>
    searchableKeys.value.some((key) => {
      const val = row[key];
      return (
        val !== null &&
        val !== undefined &&
        String(val).toLowerCase().includes(q)
      );
    }),
  );
});

// 2) Urutkan bila ada kolom yang dipilih.
// Urutkan array apa pun berdasarkan kolom aktif. Dipakai mode klien MAUPUN server
// (di mode server: mengurutkan baris halaman yang sedang tampil, tanpa fetch ulang).
function sortArray(arr) {
  if (!sortKey.value) return arr;
  const dir = sortDir.value === "asc" ? 1 : -1;
  // Salin dulu agar tidak mengubah array asli.
  return [...arr].sort((a, b) => {
    const av = a[sortKey.value];
    const bv = b[sortKey.value];
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    // Bandingkan sebagai angka bila keduanya angka, selain itu sebagai teks.
    const an = Number(av);
    const bn = Number(bv);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

const sorted = computed(() => sortArray(filtered.value));

// 3) Potong sesuai halaman.
// Di mode server, total & baris berasal dari server; di mode client dari hasil olah lokal.
const total = computed(() =>
  props.serverSide ? serverTotal.value : sorted.value.length,
);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / perPage.value)),
);
const displayRows = computed(() => {
  // Mode server: baris halaman ini dari server, lalu diurutkan di klien (asc/desc).
  if (props.serverSide) return sortArray(serverRows.value);
  const start = (page.value - 1) * perPage.value;
  return sorted.value.slice(start, start + perPage.value);
});

// Gabungan status loading (dari prop induk atau proses fetch server).
const isLoading = computed(() => props.loading || serverLoading.value);

// Jumlah baris skeleton saat loading — secukupnya untuk mengisi tabel tanpa berlebihan.
const skeletonRows = computed(() => Math.min(Math.max(perPage.value, 3), 6));

const startIndex = computed(() =>
  total.value === 0 ? 0 : (page.value - 1) * perPage.value + 1,
);
const endIndex = computed(() =>
  Math.min(page.value * perPage.value, total.value),
);

// Kembali ke halaman 1 saat jumlah-per-halaman berubah (berlaku dua mode).
watch(perPage, () => {
  page.value = 1;
});
// Di mode client, pencarian juga mengembalikan ke halaman 1.
// (Di mode server, reset halaman ditangani oleh debounce pencarian di atas.)
watch(search, () => {
  if (!props.serverSide) page.value = 1;
});
// Jaga agar halaman tidak melebihi total di mode client.
watch(totalPages, (t) => {
  if (!props.serverSide && page.value > t) page.value = t;
});

// Kolom bisa diurutkan secara DEFAULT, kecuali kolom aksi/checkbox atau yang
// ditandai `sortable: false`. Perlu `key` (nama field) sebagai dasar pengurutan.
const NON_SORTABLE_KEYS = ["aksi", "select"];
function isSortable(col) {
  return (
    col.sortable !== false && !!col.key && !NON_SORTABLE_KEYS.includes(col.key)
  );
}

function toggleSort(col) {
  if (!isSortable(col)) return;
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = col.key;
    sortDir.value = "asc";
  }
}

function goPage(p) {
  if (p >= 1 && p <= totalPages.value) page.value = p;
}

// Tampilkan sederet nomor halaman di sekitar halaman aktif (maks 5).
const pageNumbers = computed(() => {
  const t = totalPages.value;
  const cur = page.value;
  const arr = [];
  let start = Math.max(1, cur - 2);
  let end = Math.min(t, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
});

function cellValue(row, col) {
  const val = row[col.key];
  return col.formatter ? col.formatter(val, row) : val;
}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
</script>

<template>
  <div>
    <!-- Toolbar: pencarian + slot tambahan -->
    <div
      v-if="searchable || $slots.toolbar || total > 0"
      class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <!-- Kiri: pilihan jumlah data per halaman + tombol toolbar (bila ada) -->
      <div class="flex flex-wrap items-center gap-3">
        <label
          v-if="total > 0"
          class="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400"
        >
          <span>Tampilkan</span>
          <select
            v-model.number="perPage"
            class="form-select w-auto py-1.5 text-xs"
          >
            <option v-for="opt in perPageOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
          <span>Data</span>
        </label>
        <div v-if="$slots.toolbar" class="flex flex-wrap items-center gap-2">
          <slot name="toolbar" />
        </div>
      </div>
      <!-- Kanan: pencarian -->
      <div v-if="searchable" class="relative w-full sm:max-w-xs">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          v-model="search"
          :placeholder="searchPlaceholder"
          class="form-input pl-9"
        />
      </div>
    </div>

    <!-- Tabel -->
    <!-- Pembungkus Utama: Memberikan efek kartu modern dengan sudut melengkung dan bayangan halus -->
    <div
      class="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-full">
          <!-- Header Tabel: Background soft, teks kecil semi-bold uppercase, tracking renggang -->
          <thead>
            <tr
              class="bg-slate-50/70 border-b border-slate-100 text-slate-600 text-xs font-semibold select-none"
            >
              <th
                v-for="col in columns"
                :key="col.key || col.label"
                :class="[
                  'text-center',
                  isSortable(col)
                    ? 'cursor-pointer hover:bg-slate-100/80 hover:text-slate-800 transition-colors duration-150'
                    : '',
                  'py-4 px-6 font-semibold whitespace-nowrap',
                ]"
                :style="col.width ? { width: col.width } : {}"
                @click="toggleSort(col)"
              >
                <slot
                  :name="`header-${col.key}`"
                  :column="col"
                  :rows="displayRows"
                >
                  <span class="inline-flex items-center gap-1.5">
                    {{ col.label }}
                    <template v-if="isSortable(col)">
                      <ArrowUp
                        v-if="sortKey === col.key && sortDir === 'asc'"
                        class="h-3.5 w-3.5 text-primary-600 animate-fade-in"
                      />
                      <ArrowDown
                        v-else-if="sortKey === col.key && sortDir === 'desc'"
                        class="h-3.5 w-3.5 text-primary-600 animate-fade-in"
                      />
                      <ChevronsUpDown
                        v-else
                        class="h-3.5 w-3.5 text-slate-300"
                      />
                    </template>
                  </span>
                </slot>
              </th>
            </tr>
          </thead>

          <!-- Body Tabel: Jarak (padding) lebih lega dan efek hover baris yang halus -->
          <tbody class="divide-y divide-slate-100 text-sm text-slate-600">
            <!-- Loading State: skeleton shimmer (mengikuti jumlah & perataan kolom) -->
            <template v-if="isLoading">
              <tr v-for="n in skeletonRows" :key="`skeleton-${n}`">
                <td
                  v-for="col in columns"
                  :key="col.key || col.label"
                  class="py-[18px] px-6"
                >
                  <div
                    class="skeleton h-3.5 rounded"
                    :class="col.align === 'center' ? 'mx-auto w-10' : 'w-3/4'"
                  ></div>
                </td>
              </tr>
            </template>

            <!-- Kosong State -->
            <tr v-else-if="displayRows.length === 0" class="bg-white">
              <td :colspan="columns.length" class="py-12">
                <EmptyState :message="emptyMessage" />
              </td>
            </tr>

            <!-- Data State -->
            <template v-else>
              <tr
                v-for="(row, idx) in displayRows"
                :key="row.id ?? idx"
                class="hover:bg-slate-50/60 transition-colors duration-150 last:[&>td]:pb-7"
              >
                <td
                  v-for="col in columns"
                  :key="col.key || col.label"
                  :class="[
                    alignClass[col.align] || 'text-left',
                    col.wrap ? '' : 'whitespace-nowrap',
                    'py-[18px] px-6 text-slate-600 font-normal align-middle leading-relaxed',
                  ]"
                >
                  <!-- Kolom `wrap` (mis. Kode Unik) DIBUNGKUS div sendiri supaya
                       line-clamp benar-benar membatasi MAKS 2 baris. line-clamp
                       tidak bisa langsung di <td> (bentrok dengan display table-cell).
                       Kolom lain tetap 1 baris (nowrap di <td>). -->
                  <div v-if="col.wrap" class="line-clamp-2 break-words">
                    <slot
                      :name="`cell-${col.key}`"
                      :row="row"
                      :value="row[col.key]"
                      :index="startIndex + idx - 1"
                    >
                      {{ cellValue(row, col) }}
                    </slot>
                  </div>
                  <slot
                    v-else
                    :name="`cell-${col.key}`"
                    :row="row"
                    :value="row[col.key]"
                    :index="startIndex + idx - 1"
                  >
                    {{ cellValue(row, col) }}
                  </slot>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer: info + pagination -->
    <div
      v-if="!isLoading && total > 0"
      class="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <div
        class="flex items-center gap-3 text-[13px] text-slate-500 dark:text-slate-400"
      >
        <span
          >Menampilkan {{ startIndex }} sampai {{ endIndex }} dari
          {{ total }} data</span
        >
      </div>

      <div class="flex items-center gap-1">
        <button
          class="btn-icon btn-ghost"
          :disabled="page === 1"
          @click="goPage(page - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          v-for="p in pageNumbers"
          :key="p"
          class="h-8 min-w-[32px] rounded-md px-2 text-[13px] font-medium transition-colors"
          :class="
            p === page
              ? 'bg-primary-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          @click="goPage(p)"
        >
          {{ p }}
        </button>
        <button
          class="btn-icon btn-ghost"
          :disabled="page === totalPages"
          @click="goPage(page + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Skeleton shimmer: bar abu-abu dengan kilau bergerak saat data sedang dimuat. */
.skeleton {
  position: relative;
  overflow: hidden;
  background-color: #e2e8f0; /* slate-200 */
}
.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.65),
    transparent
  );
  animation: skeleton-shimmer 1.4s infinite;
}
@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>

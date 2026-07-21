<script setup>
/**
 * Dropdown pilihan (select) reusable — GAYA CUSTOM seperti pemilih bank di header:
 * tombol + panel melayang + kotak pencarian + sorotan pilihan aktif, sadar dark mode.
 *
 * API-nya SAMA dengan versi lama (drop-in), jadi seluruh form otomatis ikut cantik:
 *   <BaseSelect
 *     v-model="bankId"
 *     :options="bankList"
 *     option-label="partner_name"
 *     option-value="partner_id"
 *     placeholder="Pilih Bank"
 *     label="Bank" />
 *
 * - `options` boleh array objek atau array string/angka.
 * - Bila `optionValue` diisi, v-model mengirim nilai field itu (mis. partner_id);
 *   bila kosong, mengirim item apa adanya.
 * - Kotak pencarian muncul otomatis saat opsi cukup banyak (> 6), atau atur `searchable`.
 */
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ChevronDown, Search, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number, Object, null], default: null },
  options: { type: Array, default: () => [] },
  optionLabel: { type: String, default: 'label' },
  optionValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Pilih...' },
  label: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  // 'auto' (default): tampil bila opsi > 6. true: selalu. false: tidak pernah.
  searchable: { type: [Boolean, String], default: 'auto' },
})
const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const open = ref(false)
const search = ref('')

onClickOutside(root, () => close())

function labelOf(opt) {
  return opt !== null && typeof opt === 'object' ? opt[props.optionLabel] : opt
}
function valueOf(opt) {
  if (opt !== null && typeof opt === 'object') {
    return props.optionValue ? opt[props.optionValue] : opt
  }
  return opt
}

// Teks pada tombol: label opsi terpilih, atau placeholder.
const selectedLabel = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') return ''
  const found = props.options.find((o) => String(valueOf(o)) === String(props.modelValue))
  return found !== undefined ? labelOf(found) : ''
})

function isSelected(opt) {
  return props.modelValue !== null && props.modelValue !== undefined && String(valueOf(opt)) === String(props.modelValue)
}

const showSearch = computed(() => {
  if (props.searchable === true) return true
  if (props.searchable === false) return false
  return props.options.length > 6
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((o) => String(labelOf(o)).toLowerCase().includes(q))
})

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (!open.value) search.value = ''
}
function close() {
  open.value = false
  search.value = ''
}
function choose(opt) {
  emit('update:modelValue', valueOf(opt))
  close()
}
</script>

<template>
  <div>
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>

    <div ref="root" class="relative">
      <!-- Tombol pemicu -->
      <button
        type="button"
        :disabled="disabled"
        class="flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-400 dark:bg-slate-900"
        :class="[
          error ? 'border-danger' : 'border-slate-300 dark:border-slate-700',
          disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-800/60' : 'hover:border-slate-400 dark:hover:border-slate-500',
        ]"
        @click="toggle"
      >
        <span class="truncate" :class="selectedLabel ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'">
          {{ selectedLabel || placeholder }}
        </span>
        <ChevronDown class="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': open }" />
      </button>

      <!-- Panel opsi -->
      <transition name="dropdown-pop">
        <div
          v-if="open"
          class="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-floating dark:border-slate-700 dark:bg-slate-800"
        >
          <!-- Pencarian -->
          <div v-if="showSearch" class="border-b border-slate-100 p-2 dark:border-slate-700">
            <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <Search class="h-4 w-4 shrink-0 text-slate-400" />
              <input
                v-model="search"
                type="text"
                class="w-full bg-transparent text-sm outline-none placeholder-slate-400"
                placeholder="Cari..."
                @click.stop
              />
            </div>
          </div>

          <!-- Daftar opsi -->
          <div class="max-h-60 overflow-y-auto py-1">
            <button
              v-for="(opt, i) in filtered"
              :key="i"
              type="button"
              class="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60"
              :class="isSelected(opt) ? 'font-medium text-primary-600 dark:text-primary-300' : 'text-slate-600 dark:text-slate-300'"
              @click="choose(opt)"
            >
              <span class="truncate">{{ labelOf(opt) }}</span>
              <Check v-if="isSelected(opt)" class="h-4 w-4 shrink-0 text-primary-500" />
            </button>
            <div v-if="!filtered.length" class="px-4 py-6 text-center text-sm text-slate-400">Tidak ada pilihan</div>
          </div>
        </div>
      </transition>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
  </div>
</template>

<style scoped>
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

<script setup>
/**
 * Modal (dialog) reusable — memakai v-model untuk buka/tutup.
 * Contoh:
 *   <Modal v-model="showModal" title="Konfirmasi">
 *     Isi modal...
 *     <template #footer>
 *       <BaseButton variant="secondary" @click="showModal=false">Batal</BaseButton>
 *       <BaseButton variant="danger" @click="hapus">Hapus</BaseButton>
 *     </template>
 *   </Modal>
 *
 * Catatan: memakai <Teleport to="body"> agar modal tidak "terpotong" oleh
 * container yang punya overflow.
 */
import { onBeforeUnmount, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg | xl
  // closeOnBackdrop: klik latar untuk menutup
  closeOnBackdrop: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' }
let previousOverflow = ''

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

// Kunci scroll body saat modal terbuka supaya latar tidak ikut bergulir.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
    } else {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <transition name="modal-root">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <!-- Latar gelap -->
        <div class="modal-backdrop absolute inset-0" @click="closeOnBackdrop && close()" />

        <!-- Kotak modal -->
        <div
          class="modal-panel relative z-10 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-floating dark:border-slate-700 dark:bg-slate-900"
          :class="sizes[size] || sizes.md"
        >
          <div v-if="title || $slots.header" class="modal-header">
            <slot name="header">
              <h3 class="truncate text-base font-semibold text-slate-800 dark:text-slate-100">{{ title }}</h3>
            </slot>
            <button class="modal-close" aria-label="Tutup" @click="close">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="modal-body">
            <slot />
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  background: rgb(15 23 42 / 0.5);
  backdrop-filter: blur(2px);
}

.modal-panel {
  transform-origin: center 46%;
  will-change: transform, opacity;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgb(226 232 240);
  padding: 0.875rem 1.25rem;
}

:global(.dark) .modal-header {
  border-bottom-color: rgb(30 41 59);
}

.modal-body {
  max-height: min(72vh, 760px);
  overflow-y: auto;
  padding: 1.25rem;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  border-top: 1px solid rgb(226 232 240);
  padding: 0.75rem 1.25rem;
}

:global(.dark) .modal-footer {
  border-top-color: rgb(30 41 59);
}

.modal-close {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: rgb(100 116 139);
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-close:hover {
  background: rgb(241 245 249);
  color: rgb(15 23 42);
  transform: scale(1.04);
}

:global(.dark) .modal-close:hover {
  background: rgb(51 65 85 / 0.75);
  color: rgb(241 245 249);
}

.modal-root-enter-active,
.modal-root-leave-active {
  transition: opacity 260ms ease;
}

.modal-root-enter-active .modal-backdrop,
.modal-root-leave-active .modal-backdrop {
  transition:
    opacity 280ms ease,
    backdrop-filter 300ms ease;
}

.modal-root-enter-active .modal-panel {
  transition:
    opacity 340ms ease,
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-root-leave-active .modal-panel {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.4, 0, 1, 1);
}

.modal-root-enter-from,
.modal-root-leave-to {
  opacity: 0;
}

.modal-root-enter-from .modal-backdrop,
.modal-root-leave-to .modal-backdrop {
  opacity: 0;
  backdrop-filter: blur(0);
}

.modal-root-enter-from .modal-panel {
  opacity: 0;
  transform: translate3d(0, 18px, 0) scale(0.975);
}

.modal-root-leave-to .modal-panel {
  opacity: 0;
  transform: translate3d(0, 10px, 0) scale(0.985);
}
</style>

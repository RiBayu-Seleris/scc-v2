import { watchEffect } from 'vue'

const APP = import.meta.env.VITE_APP_NAME || 'Seleris Credit Cover'

/**
 * Set the document title. Usage: useMeta({ title: 'Dashboard' })
 */
export function useMeta(meta = {}) {
  watchEffect(() => {
    const title = typeof meta.title === 'function' ? meta.title() : meta.title
    document.title = title ? `${title} — ${APP}` : APP
  })
}

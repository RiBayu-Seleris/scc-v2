import { createI18n } from 'vue-i18n'
import id from './locales/id.json'

/**
 * i18n — Bahasa Indonesia as the default & only active locale for now.
 * The structure is ready for English: drop an `en.json` next to `id.json`,
 * import it here, and add it to `messages` + the UI store countryList.
 */
const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: localStorage.getItem('i18n_locale') || 'id',
  fallbackLocale: 'id',
  messages: { id },
})

export default i18n

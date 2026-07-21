import { defineStore } from 'pinia'

/**
 * UI / layout store — Pinia conversion of the old Vuex root store.
 * Handles theme (dark mode), sidebar visibility, locale, and layout style.
 */
export const useUiStore = defineStore('ui', {
  state: () => ({
    isShowSidebar: typeof window === 'undefined' ? true : window.innerWidth > 768,
    isCollapsed: false,
    isShowRightPanel: false,
    darkMode: localStorage.getItem('dark_mode') || 'light', // light | dark | system
    isDark: false,
    locale: localStorage.getItem('i18n_locale') || 'id',
    countryList: [
      { code: 'id', name: 'Indonesia' },
      { code: 'en', name: 'English' },
    ],
  }),

  actions: {
    initTheme() {
      this.applyDarkMode(this.darkMode)
    },

    toggleSidebar(value) {
      this.isShowSidebar = value ?? !this.isShowSidebar
    },

    collapseSidebar(value) {
      this.isCollapsed = value ?? !this.isCollapsed
    },

    toggleRightPanel(value) {
      this.isShowRightPanel = value ?? !this.isShowRightPanel
    },

    setLocale(value) {
      this.locale = value || 'id'
      localStorage.setItem('i18n_locale', this.locale)
    },

    /** value: 'light' | 'dark' | 'system' */
    applyDarkMode(value) {
      value = value || 'light'
      this.darkMode = value
      localStorage.setItem('dark_mode', value)

      if (value === 'dark') {
        this.isDark = true
      } else if (value === 'system') {
        this.isDark =
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      } else {
        this.isDark = false
      }

      document.documentElement.classList.toggle('dark', this.isDark)
    },

    toggleDark() {
      this.applyDarkMode(this.isDark ? 'light' : 'dark')
    },
  },
})

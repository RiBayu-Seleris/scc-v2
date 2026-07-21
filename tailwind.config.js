/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Primary brand — biru segar & modern (tidak gelap), khas admin dashboard masa kini.
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          DEFAULT: '#3b82f6',
        },
        // Accent — teal (freshness / trust)
        accent: {
          50: '#ecfdf7',
          100: '#d1faec',
          200: '#a7f3da',
          300: '#6ee7bf',
          400: '#34d3a0',
          500: '#10b585',
          600: '#05936c',
          700: '#047658',
          800: '#065d47',
          900: '#064c3b',
          DEFAULT: '#10b585',
        },
        success: { light: '#d1fae5', DEFAULT: '#10b981', dark: '#047857' },
        warning: { light: '#fef3c7', DEFAULT: '#f59e0b', dark: '#b45309' },
        danger: { light: '#fee2e2', DEFAULT: '#ef4444', dark: '#b91c1c' },
        info: { light: '#dbeafe', DEFAULT: '#3b82f6', dark: '#1d4ed8' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      // Bayangan dibuat sangat halus — desain "border-first" ala admin dashboard.
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04)',
        soft: '0 2px 8px rgba(15, 23, 42, 0.06)',
        floating: '0 8px 24px rgba(15, 23, 42, 0.12)',
      },
      // Radius diperkecil supaya terasa rapi & profesional (tidak "bulat mainan").
      borderRadius: {
        xl: '0.625rem',
        '2xl': '0.75rem',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}

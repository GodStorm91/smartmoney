import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(HttpBackend) // Load JSON from /public/locales
  .use(LanguageDetector) // Auto-detect + localStorage
  .use(initReactI18next) // React bindings
  .init({
    fallbackLng: 'ja', // Default to Japanese
    supportedLngs: ['ja', 'en', 'vi'],
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'goals', 'transactions', 'analytics', 'errors'],

    // Backend configuration
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Language detector options
    detection: {
      order: ['localStorage', 'navigator'], // Check localStorage first, then browser
      caches: ['localStorage'], // Persist to localStorage
      lookupLocalStorage: 'i18nextLng',
    },

    // Interpolation
    interpolation: {
      escapeValue: false, // React already escapes
    },

    // Dev options
    debug: false, // Set to true for debugging
  })

export default i18n

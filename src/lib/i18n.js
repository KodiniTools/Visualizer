import { ref, computed, reactive } from 'vue'
import de from './i18n/de.js'

// de is always available synchronously; other locales are loaded on demand
const translations = reactive({ de })

async function loadLocale(locale) {
  if (translations[locale]) return
  const mod = await import(`./i18n/${locale}.js`)
  translations[locale] = mod.default
}

// Start with de (available immediately), then switch if a different locale is stored
const initialLocale =
  (typeof localStorage !== 'undefined' && localStorage.getItem('locale')) || 'de'
const currentLocale = ref('de')

if (initialLocale !== 'de') {
  loadLocale(initialLocale).then(() => {
    currentLocale.value = initialLocale
    if (typeof document !== 'undefined') document.documentElement.lang = initialLocale
  })
} else {
  if (typeof document !== 'undefined') document.documentElement.lang = 'de'
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null
  }, obj)
}

export const localeRef = currentLocale

export function getLocale() {
  return currentLocale.value
}

export async function setLocale(locale) {
  if (!availableLocales.includes(locale)) return
  await loadLocale(locale)
  currentLocale.value = locale
  if (typeof localStorage !== 'undefined') localStorage.setItem('locale', locale)
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

if (typeof window !== 'undefined') {
  window.addEventListener('locale-changed', (e) => {
    const lang = e.detail && e.detail.locale
    if (lang) setLocale(lang)
  })
}

export function toggleLocale() {
  const newLocale = currentLocale.value === 'de' ? 'en' : 'de'
  setLocale(newLocale)
}

export const availableLocales = ['de', 'en']

export function useI18n() {
  const locale = computed(() => currentLocale.value)

  const t = (key) => {
    const dict = translations[currentLocale.value] || translations.de
    const value = getNestedValue(dict, key)
    if (value === null) {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }
    return value
  }

  const messages = computed(() => translations[currentLocale.value] || translations.de)

  return {
    t,
    locale,
    messages,
    setLocale,
    toggleLocale,
    availableLocales,
  }
}

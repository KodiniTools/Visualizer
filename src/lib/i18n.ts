import { ref, computed, reactive } from 'vue'
import de from './i18n/de'
import { isLocale, resolveInitialLocale, type Locale } from './localeSeo'

/** Übersetzungsbaum einer Sprache (Struktur wie i18n/de.js) */
export type Messages = typeof de

// de is always available synchronously; other locales are loaded on demand
const translations = reactive<Partial<Record<Locale, Messages>>>({ de })

async function loadLocale(locale: Locale) {
  if (translations[locale]) return
  const mod = await import(`./i18n/${locale}.ts`)
  translations[locale] = mod.default
}

function readStoredLocale() {
  try {
    return localStorage.getItem('locale')
  } catch {
    return null
  }
}

// Start with de (available immediately), then switch if ?lang=en (hreflang target)
// or the stored locale asks for another language. ?lang wins and is persisted
// so the SSI navigation and other components agree.
const initialLocale = resolveInitialLocale(globalThis.location?.search ?? '', readStoredLocale())
try {
  localStorage.setItem('locale', initialLocale)
} catch {
  // storage blocked: the language applies to this visit only
}
const currentLocale = ref<Locale>('de')

if (initialLocale !== 'de') {
  loadLocale(initialLocale).then(() => {
    currentLocale.value = initialLocale
    if (typeof document !== 'undefined') document.documentElement.lang = initialLocale
  })
} else {
  if (typeof document !== 'undefined') document.documentElement.lang = 'de'
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    const next = current ? (current as Record<string, unknown>)[key] : undefined
    return current && next !== undefined ? next : null
  }, obj)
}

export const localeRef = currentLocale

export function getLocale(): Locale {
  return currentLocale.value
}

export async function setLocale(locale: unknown): Promise<void> {
  if (!isLocale(locale)) return
  await loadLocale(locale)
  currentLocale.value = locale
  if (typeof localStorage !== 'undefined') localStorage.setItem('locale', locale)
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

if (typeof window !== 'undefined') {
  window.addEventListener('locale-changed', (e) => {
    const detail = (e as CustomEvent<{ locale?: string } | null>).detail
    const lang = detail && detail.locale
    if (lang) setLocale(lang)
  })
}

export function toggleLocale() {
  const newLocale = currentLocale.value === 'de' ? 'en' : 'de'
  setLocale(newLocale)
}

export const availableLocales: Locale[] = ['de', 'en']

export function useI18n() {
  const locale = computed(() => currentLocale.value)

  /**
   * Übersetzung zum Schlüssel; fehlt sie, der Schlüssel selbst. Meist ein
   * String, bei Listen-Schlüsseln (z. B. `blog.stats`) auch Array/Objekt.
   */
  const t = (key: string): string => {
    const dict = translations[currentLocale.value] || translations.de
    const value = getNestedValue(dict, key)
    if (value === null) {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }
    return value as string
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

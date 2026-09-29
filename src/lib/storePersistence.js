import { watch } from 'vue'

/**
 * Dauerhaftes Speichern ausgewählter Pinia-Store-Einstellungen (localStorage).
 *
 * - Laden: nur bekannte Einstellungen mit passendem Typ (Vorlage = aktueller
 *   Store-Zustand mit Standardwerten); optional eigene Prüfung (`sanitize`).
 *   Beschädigte Daten → Standard, kein Absturz.
 * - Speichern: gebündelt, spätestens `delay` ms nach der ersten Änderung
 *   (der Timer wird nicht verlängert), beim Verlassen der Seite sofort.
 */

/** Tiefe Kopie über JSON (Einstellungen sind JSON-fähig). */
export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** Passt value zum Typ des Standardwerts? (null ist erlaubt, wo der Standard null ist) */
export function sameType(defaultValue, value) {
  if (defaultValue === null) return value === null || typeof value === 'string'
  if (Array.isArray(defaultValue)) return Array.isArray(value)
  if (typeof defaultValue === 'number') return Number.isFinite(value)
  if (isPlainObject(defaultValue)) return isPlainObject(value)
  return typeof value === typeof defaultValue
}

/** Übernimmt nur Felder, die im Vorbild existieren und typgleich sind (rekursiv für Objekte). */
export function sanitizeLike(template, value) {
  const out = {}
  if (!isPlainObject(value)) return out
  for (const [key, def] of Object.entries(template)) {
    if (!(key in value) || !sameType(def, value[key])) continue
    out[key] = isPlainObject(def)
      ? { ...clone(def), ...sanitizeLike(def, value[key]) }
      : clone(value[key])
  }
  return out
}

/**
 * @param {object} store - Pinia-Store
 * @param {object} opts
 * @param {string} opts.storageKey - localStorage-Schlüssel
 * @param {string[]} [opts.keys] - gespeicherte State-Keys (Standard: alle)
 * @param {(clean: object) => object} [opts.sanitize] - zusätzliche Prüfung nach der Typprüfung
 * @param {Storage} [opts.storage]
 * @param {number} [opts.delay=400]
 * @returns {{ flush(): void, stop(): void }}
 */
export function setupStorePersistence(store, opts) {
  const { storageKey, keys, sanitize, delay = 400 } = opts
  const storage = opts.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  const resolveKeys = () => keys ?? Object.keys(store.$state)
  const capture = () => {
    const out = {}
    for (const key of resolveKeys()) out[key] = clone(store.$state[key])
    return out
  }

  // ── Laden ──
  try {
    const raw = JSON.parse(storage?.getItem(storageKey) || 'null')
    if (raw) {
      let clean = sanitizeLike(capture(), raw)
      if (sanitize) clean = sanitize(clean) ?? {}
      if (Object.keys(clean).length) store.$patch(clean)
    }
  } catch (e) {
    console.warn(`[StorePersistence] ${storageKey}: gespeicherte Werte ungültig`, e)
  }

  // ── Speichern ──
  let timer = null
  const save = () => {
    clearTimeout(timer)
    timer = null
    try {
      storage?.setItem(storageKey, JSON.stringify(capture()))
    } catch (e) {
      console.warn(`[StorePersistence] ${storageKey}: Speichern fehlgeschlagen`, e)
    }
  }
  const schedule = () => {
    if (!timer) timer = setTimeout(save, delay)
  }
  // Nur die gespeicherten Felder beobachten (nicht jede Store-Änderung – der
  // Player-Store ändert z. B. die Wiedergabezeit mehrmals pro Sekunde)
  const unsubscribe = watch(() => JSON.stringify(capture()), schedule, { flush: 'sync' })
  const onPageHide = () => timer && save()
  if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide)

  return {
    flush: () => timer && save(),
    stop() {
      if (timer) save() // ausstehende Änderung nicht verlieren
      unsubscribe()
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', onPageHide)
    },
  }
}

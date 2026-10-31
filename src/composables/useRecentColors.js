/**
 * useRecentColors (übernommen aus KodiniTools/Bildkonverter)
 *
 * Zuletzt verwendete Farben für Formen, Text und Zeichenwerkzeuge. Geteilter
 * Zustand (alle Farbfelder sehen dieselbe Liste), neueste zuerst, ohne
 * Duplikate, im localStorage gespeichert.
 */
import { readonly, ref } from 'vue'

export const RECENT_COLORS_KEY = 'visualizer-recent-colors'
export const RECENT_COLORS_MAX = 8

const HEX = /^#[0-9a-f]{6}$/i

function load() {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_COLORS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list)
      ? list
          .filter((c) => typeof c === 'string' && HEX.test(c))
          .map((c) => c.toLowerCase())
          .slice(0, RECENT_COLORS_MAX)
      : []
  } catch {
    return []
  }
}

const colors = ref(load())

function save() {
  try {
    globalThis.localStorage?.setItem(RECENT_COLORS_KEY, JSON.stringify(colors.value))
  } catch {
    // Speicher voll oder gesperrt (privater Modus): Liste gilt dann nur für die Sitzung
  }
}

/** Farbe vorn einreihen (ungültige Werte werden ignoriert). @returns {boolean} */
export function addRecentColor(color) {
  if (typeof color !== 'string' || !HEX.test(color)) return false
  const value = color.toLowerCase()
  colors.value = [value, ...colors.value.filter((c) => c !== value)].slice(0, RECENT_COLORS_MAX)
  save()
  return true
}

export function clearRecentColors() {
  colors.value = []
  save()
}

/** Liste neu aus dem Speicher lesen (Tests, anderer Tab) */
export function reloadRecentColors() {
  colors.value = load()
}

export function useRecentColors() {
  return { recentColors: readonly(colors), addRecentColor, clearRecentColors }
}

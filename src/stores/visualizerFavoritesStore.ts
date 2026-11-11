import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/** localStorage-Schlüssel der gemerkten Visualizer-Favoriten (Liste von IDs). */
export const FAVORITES_STORAGE_KEY = 'visualizer-favorites'

/** Obergrenze, damit ein manipulierter Speicher die Liste nicht aufbläht. */
const MAX_FAVORITES = 500

/**
 * Gespeicherte Favoriten lesen. Nur eindeutige, nicht-leere Strings bleiben
 * übrig; beschädigter Speicher ergibt eine leere Liste statt eines Fehlers.
 * Unbekannte IDs (z. B. entfernte Visualizer) bleiben erhalten und werden erst
 * bei der Anzeige ausgefiltert, damit sie nach einem Update nicht verloren gehen.
 */
export function loadFavoriteIds(): string[] {
  let raw: unknown = null
  try {
    raw = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || 'null')
  } catch {
    raw = null
  }
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const id of raw) {
    if (typeof id === 'string' && id.trim() && !out.includes(id)) out.push(id)
    if (out.length >= MAX_FAVORITES) break
  }
  return out
}

/** Favoriten der Visualizer-Liste, dauerhaft im localStorage. */
export const useVisualizerFavoritesStore = defineStore('visualizerFavorites', () => {
  /** IDs in der Reihenfolge, in der sie favorisiert wurden. */
  const favoriteIds = ref<string[]>(loadFavoriteIds())

  watch(
    favoriteIds,
    (ids) => {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids))
      } catch (e) {
        console.warn('[VisualizerFavorites] Favoriten nicht speicherbar:', e)
      }
    },
    { deep: true },
  )

  function isFavorite(id: string): boolean {
    return favoriteIds.value.includes(id)
  }

  function addFavorite(id: string): void {
    if (!id || isFavorite(id) || favoriteIds.value.length >= MAX_FAVORITES) return
    favoriteIds.value.push(id)
  }

  function removeFavorite(id: string): void {
    const i = favoriteIds.value.indexOf(id)
    if (i !== -1) favoriteIds.value.splice(i, 1)
  }

  function toggleFavorite(id: string): void {
    if (isFavorite(id)) removeFavorite(id)
    else addFavorite(id)
  }

  return { favoriteIds, isFavorite, addFavorite, removeFavorite, toggleFavorite }
})

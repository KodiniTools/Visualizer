import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import {
  FAVORITES_STORAGE_KEY,
  loadFavoriteIds,
  useVisualizerFavoritesStore,
} from '../../stores/visualizerFavoritesStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('visualizerFavoritesStore', () => {
  it('startet leer und fügt per toggle hinzu bzw. entfernt wieder', () => {
    const fav = useVisualizerFavoritesStore()
    expect(fav.favoriteIds).toEqual([])
    fav.toggleFavorite('bars')
    fav.toggleFavorite('waveform')
    expect(fav.favoriteIds).toEqual(['bars', 'waveform'])
    expect(fav.isFavorite('bars')).toBe(true)
    fav.toggleFavorite('bars')
    expect(fav.favoriteIds).toEqual(['waveform'])
    expect(fav.isFavorite('bars')).toBe(false)
  })

  it('ignoriert Doppelte und leere IDs', () => {
    const fav = useVisualizerFavoritesStore()
    fav.addFavorite('bars')
    fav.addFavorite('bars')
    fav.addFavorite('')
    fav.removeFavorite('gibt-es-nicht')
    expect(fav.favoriteIds).toEqual(['bars'])
  })

  it('speichert jede Änderung im localStorage und lädt sie beim nächsten Start', async () => {
    const fav = useVisualizerFavoritesStore()
    fav.addFavorite('bars')
    fav.addFavorite('mandala')
    await nextTick()
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual(['bars', 'mandala'])

    fav.removeFavorite('bars')
    await nextTick()
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual(['mandala'])

    setActivePinia(createPinia())
    expect(useVisualizerFavoritesStore().favoriteIds).toEqual(['mandala'])
  })

  it('übersteht beschädigten oder manipulierten Speicher', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{kaputt')
    expect(loadFavoriteIds()).toEqual([])
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ a: 1 }))
    expect(loadFavoriteIds()).toEqual([])
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['bars', 3, null, '', 'bars', 'x']))
    expect(loadFavoriteIds()).toEqual(['bars', 'x'])
  })

  it('bricht nicht ab, wenn der Speicher voll ist', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    const fav = useVisualizerFavoritesStore()
    fav.addFavorite('bars')
    await nextTick()
    expect(fav.favoriteIds).toEqual(['bars'])
    expect(warn).toHaveBeenCalled()
    set.mockRestore()
    warn.mockRestore()
  })
})

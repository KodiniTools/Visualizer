/**
 * Raster-Einstellungen bleiben dauerhaft gespeichert: sichtbar, Farbe,
 * Deckkraft und „Am Raster ausrichten“ überstehen einen Neustart.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import {
  useGridStore,
  loadGridSettings,
  GRID_STORAGE_KEY,
  GRID_DEFAULTS,
} from '../../stores/gridStore.js'

// Neustart der App simulieren: neue Pinia-Instanz, Store liest localStorage
function restart() {
  setActivePinia(createPinia())
  return useGridStore()
}

beforeEach(() => localStorage.clear())

describe('Raster-Einstellungen – dauerhaft speichern', () => {
  it('ohne gespeicherte Werte: Standard (Raster aus, nicht einrasten)', () => {
    const store = restart()
    expect(store.isVisible).toBe(false)
    expect(store.snapToGrid).toBe(false)
    expect(store.gridColor).toBe(GRID_DEFAULTS.gridColor)
    expect(store.gridOpacity).toBe(GRID_DEFAULTS.gridOpacity)
  })

  it('Änderungen werden gespeichert und nach einem Neustart übernommen', async () => {
    const store = restart()
    store.setGridVisibility(true)
    store.setColor('#ff8800')
    store.setOpacity(0.35)
    store.setSnapToGrid(true)
    await nextTick()
    expect(JSON.parse(localStorage.getItem(GRID_STORAGE_KEY))).toEqual({
      isVisible: true,
      gridSize: 50,
      gridColor: '#ff8800',
      gridOpacity: 0.35,
      snapToGrid: true,
    })

    const again = restart()
    expect(again.isVisible).toBe(true)
    expect(again.gridColor).toBe('#ff8800')
    expect(again.gridOpacity).toBe(0.35)
    expect(again.snapToGrid).toBe(true)
  })

  it('auch Änderungen von außen (z. B. Rückgängig per $patch) werden gespeichert', async () => {
    const store = restart()
    store.$patch({ isVisible: true, gridColor: '#112233' })
    await nextTick()
    expect(restart().gridColor).toBe('#112233')
  })

  it('Raster per Taste G umschalten wird ebenfalls gemerkt', async () => {
    const store = restart()
    store.toggleGrid()
    await nextTick()
    expect(restart().isVisible).toBe(true)
  })

  it('beschädigte oder ungültige Werte fallen auf den Standard zurück', () => {
    localStorage.setItem(GRID_STORAGE_KEY, '{kaputt')
    expect(loadGridSettings()).toEqual({ ...GRID_DEFAULTS })

    localStorage.setItem(
      GRID_STORAGE_KEY,
      JSON.stringify({
        isVisible: 'ja',
        snapToGrid: 1,
        gridColor: 'red; background:url(x)',
        gridOpacity: 7,
        gridSize: -5,
      }),
    )
    expect(loadGridSettings()).toEqual({
      ...GRID_DEFAULTS,
      gridOpacity: 1, // begrenzt auf 0.1..1
      gridSize: 10, // begrenzt auf 10..200
    })
  })

  it('Speicher voll/gesperrt: kein Absturz', async () => {
    const store = restart()
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      store.setGridVisibility(true)
      await nextTick()
      expect(store.isVisible).toBe(true)
    } finally {
      Storage.prototype.setItem = orig
    }
  })
})

/**
 * Visualizer-Einstellungen dauerhaft speichern: Auswahl, Farbe, Reaktion,
 * Position, Multi-Layer und Effekte überstehen einen Neustart; beschädigte
 * oder veraltete Daten brechen den Start nicht ab.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import {
  setupVisualizerPersistence,
  VISUALIZER_STORAGE_KEY,
} from '../../lib/visualizerPersistence.js'

let persistence
// Neustart simulieren: neue Pinia, Store mit Standardwerten, dann laden
function restart() {
  persistence?.stop()
  setActivePinia(createPinia())
  const store = useVisualizerStore()
  persistence = setupVisualizerPersistence(store)
  return store
}
const saved = () => JSON.parse(localStorage.getItem(VISUALIZER_STORAGE_KEY))

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  localStorage.clear()
})
afterEach(() => {
  persistence?.stop()
  persistence = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// Zwei existierende, vom Standard abweichende Visualizer-IDs
function pickIds(store) {
  const ids = store.availableVisualizers
    .map((v) => v.id)
    .filter((id) => id !== store.selectedVisualizer)
  return [ids[0], ids[1]]
}

describe('Visualizer-Einstellungen – dauerhaft speichern', () => {
  it('ohne gespeicherte Werte: Standard, nichts geschrieben', () => {
    const store = restart()
    expect(store.selectedVisualizer).toBe('bars')
    expect(localStorage.getItem(VISUALIZER_STORAGE_KEY)).toBeNull()
  })

  it('Einstellungen werden gebündelt gespeichert und nach Neustart übernommen', async () => {
    let store = restart()
    const [idA] = pickIds(store)
    store.selectedVisualizer = idA
    store.visualizerColor = '#ff0080'
    store.visualizerOpacity = 0.4
    store.visualizerX = 0.25
    store.reactStrength = 33
    store.bloomEnabled = false
    store.trailsEnabled = true
    expect(localStorage.getItem(VISUALIZER_STORAGE_KEY)).toBeNull() // noch gebündelt
    vi.advanceTimersByTime(500)
    expect(saved().visualizerColor).toBe('#ff0080')

    store = restart()
    await vi.runAllTimersAsync()
    expect(store.selectedVisualizer).toBe(idA)
    expect(store.visualizerColor).toBe('#ff0080')
    expect(store.visualizerOpacity).toBe(0.4)
    expect(store.visualizerX).toBe(0.25)
    expect(store.reactStrength).toBe(33)
    expect(store.bloomEnabled).toBe(false)
    expect(store.trailsEnabled).toBe(true)
  })

  it('Multi-Layer inkl. Layer-Effekten und aktivem Layer bleiben erhalten', async () => {
    let store = restart()
    const [idA, idB] = pickIds(store)
    store.multiLayerMode = true
    store.addLayer(idA)
    store.addLayer(idB)
    const layers = store.visualizerLayers
    layers[1].color = '#00ff00'
    layers[1].blendMode = 'screen'
    store.activeLayerId = layers[1].id
    vi.advanceTimersByTime(500)

    store = restart()
    await vi.runAllTimersAsync()
    expect(store.multiLayerMode).toBe(true)
    expect(store.visualizerLayers.map((l) => l.visualizerId)).toEqual([idA, idB])
    expect(store.visualizerLayers[1].color).toBe('#00ff00')
    expect(store.visualizerLayers[1].blendMode).toBe('screen')
    expect(store.visualizerLayers[1].effects).toBeTruthy()
    expect(store.activeLayerId).toBe(store.visualizerLayers[1].id)
  })

  it('Bild-Verweise (Portrait) werden nicht gespeichert', () => {
    const store = restart()
    store.addLayer(pickIds(store)[0])
    store.visualizerLayers[0].imageId = 'img-123'
    store.visualizerImageId = 'img-123'
    vi.advanceTimersByTime(500)
    expect(saved().visualizerImageId).toBeNull()
    expect(saved().visualizerLayers[0].imageId).toBeNull()
  })

  it('beschädigte Daten: Standard bleibt, kein Absturz', () => {
    localStorage.setItem(VISUALIZER_STORAGE_KEY, '{kaputt')
    const store = restart()
    expect(store.selectedVisualizer).toBe('bars')
  })

  it('ungültige Werte werden verworfen, gültige übernommen', async () => {
    localStorage.setItem(
      VISUALIZER_STORAGE_KEY,
      JSON.stringify({
        selectedVisualizer: 'gibt-es-nicht',
        visualizerColor: 42, // falscher Typ
        visualizerOpacity: 'viel', // falscher Typ
        visualizerX: 0.7, // gültig
        unbekannt: true, // unbekannte Einstellung
        visualizerLayers: [
          { id: 'l1', visualizerId: 'gibt-es-nicht' },
          { id: 'l2', visualizerId: 'bars', color: '#123456', opacity: 'x' },
          { visualizerId: 'bars' }, // ohne ID
        ],
        activeLayerId: 'l1', // Layer verworfen → erster gültiger
      }),
    )
    const store = restart()
    await vi.runAllTimersAsync()
    expect(store.selectedVisualizer).toBe('bars')
    expect(store.visualizerColor).toBe('#6ea8fe')
    expect(store.visualizerOpacity).toBe(1)
    expect(store.visualizerX).toBe(0.7)
    expect(store.unbekannt).toBeUndefined()
    expect(store.visualizerLayers.map((l) => l.id)).toEqual(['l2'])
    expect(store.visualizerLayers[0].color).toBe('#123456')
    expect(store.visualizerLayers[0].opacity).toBe(1) // Standard statt ungültig
    expect(store.activeLayerId).toBe('l2')
  })

  it('Speicher voll/gesperrt: kein Absturz', () => {
    const store = restart()
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      store.visualizerColor = '#abcdef'
      expect(() => vi.advanceTimersByTime(500)).not.toThrow()
    } finally {
      Storage.prototype.setItem = orig
    }
  })

  it('ausstehende Änderung wird beim Beenden noch gespeichert', () => {
    const store = restart()
    store.visualizerColor = '#010203'
    persistence.stop()
    persistence = null
    expect(saved().visualizerColor).toBe('#010203')
  })
})

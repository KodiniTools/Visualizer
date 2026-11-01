import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as storeModule from '../../stores/visualizerStore.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

// Schnittstelle des visualizerStore (Fassade): Schlüssel, Standardzustand und
// Verhalten, das andere Specs nicht abdecken. Muss vor und nach der Aufteilung
// in Teilmodule identisch sein.

let store

beforeEach(() => {
  setActivePinia(createPinia())
  store = useVisualizerStore()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

const publicKeys = (s) => Object.keys(s).filter((k) => !k.startsWith('$') && !k.startsWith('_'))

describe('visualizerStore – Schnittstelle', () => {
  it('Modul-Exporte', () => {
    expect(Object.keys(storeModule).sort()).toMatchSnapshot()
    expect(storeModule.BLEND_MODES).toHaveLength(16)
  })

  it('Schlüssel des Stores in Reihenfolge', () => {
    expect(publicKeys(store)).toMatchSnapshot()
  })

  it('Standardzustand ($state)', () => {
    expect(Object.keys(store.$state)).toMatchSnapshot()
    expect(JSON.parse(JSON.stringify(store.$state))).toMatchSnapshot()
  })

  it('Typen: Funktionen vs. Werte', () => {
    const types = Object.fromEntries(publicKeys(store).map((k) => [k, typeof store[k]]))
    expect(types).toMatchSnapshot()
  })
})

describe('visualizerStore – Single-Modus', () => {
  it('Setter begrenzen ihre Werte', () => {
    store.setVisualizerX(2)
    store.setVisualizerY(-1)
    store.setVisualizerScale(5)
    expect([store.visualizerX, store.visualizerY, store.visualizerScale]).toEqual([1, 0, 2])
    store.setVisualizerScale(0)
    expect(store.visualizerScale).toBe(0.1)
    store.resetVisualizerTransform()
    expect([store.visualizerX, store.visualizerY, store.visualizerScale]).toEqual([0.5, 0.5, 1])

    store.setReactStrength(150.4)
    expect(store.reactStrength).toBe(100)
    store.setReactStrength('abc')
    expect(store.reactStrength).toBe(0)
    const src = store.reactSource
    store.setReactSource('quatsch')
    expect(store.reactSource).toBe(src)

    store.setVisualizerImageId('')
    expect(store.visualizerImageId).toBeNull()
    store.setVisualizerImageId('img1')
    expect(store.visualizerImageId).toBe('img1')

    store.toggleVisualizer()
    expect(store.showVisualizer).toBe(false)
    store.setColor('#123456')
    store.setOpacity(0.4)
    store.setColorOpacity(0.3)
    expect([store.visualizerColor, store.visualizerOpacity, store.colorOpacity]).toEqual([
      '#123456',
      0.4,
      0.3,
    ])
  })

  it('selectVisualizer: unbekannte ID fällt auf den letzten funktionierenden zurück', () => {
    store.selectVisualizer('glBars')
    store.markVisualizerWorking('glBars')
    store.markVisualizerWorking('gibtsNicht')
    expect(store.lastWorkingVisualizer).toBe('glBars')
    store.selectVisualizer('gibtsNicht')
    expect(store.selectedVisualizer).toBe('glBars')
    store.selectedVisualizer = 'kaputt'
    store.fallbackToLastWorking()
    expect(store.selectedVisualizer).toBe('glBars')
  })

  it('selectVisualizer verlässt den Multi-Layer-Modus, Layer bleiben', () => {
    store.addLayer('glBars')
    expect(store.multiLayerMode).toBe(true)
    store.selectVisualizer('glRings')
    expect(store.multiLayerMode).toBe(false)
    expect(store.layerCount).toBe(1)
  })

  it('resetReactShape setzt die Formungs-Regler zurück', () => {
    const before = [store.reactSmoothing, store.reactGain, store.reactEasing]
    store.setReactSmoothing(99)
    store.setReactGain(10)
    store.resetReactShape()
    expect([store.reactSmoothing, store.reactGain, store.reactEasing]).toEqual(before)
  })
})

describe('visualizerStore – Layer', () => {
  it('Multi-Layer-Modus übernimmt den Single-Visualizer als ersten Layer', () => {
    store.selectVisualizer('glRings')
    store.setColor('#ff0000')
    store.setVisualizerX(0.2)
    store.setLedConfig('ledText', 'HALLO')
    store.setMultiLayerMode(true)
    expect(store.layerCount).toBe(1)
    const l = store.activeLayer
    expect([l.visualizerId, l.color, l.x, l.ledText]).toEqual(['glRings', '#ff0000', 0.2, 'HALLO'])
    expect(l.effects.bloomEnabled).toBe(false)
    // zweites Einschalten erzeugt keinen weiteren Layer
    store.setMultiLayerMode(false)
    store.setMultiLayerMode(true)
    expect(store.layerCount).toBe(1)
  })

  it('hinzufügen, duplizieren, verschieben, entfernen', () => {
    const a = store.addLayer('glBars')
    const b = store.addLayer('glRings', { color: '#00ff00' })
    expect(store.activeLayerId).toBe(b.id)
    const c = store.duplicateLayer(a.id)
    expect(c.id).not.toBe(a.id)
    expect(store.visualizerLayers.map((l) => l.visualizerId)).toEqual([
      'glBars',
      'glBars',
      'glRings',
    ])
    expect(store.duplicateLayer('nope')).toBeNull()

    expect(store.moveLayerUp(b.id)).toBe(false)
    expect(store.moveLayerDown(a.id)).toBe(false)
    expect(store.moveLayerUp(a.id)).toBe(true)
    expect(store.visualizerLayers.map((l) => l.id)).toEqual([c.id, a.id, b.id])
    expect(store.moveLayerDown(b.id)).toBe(true)
    expect(store.visualizerLayers.map((l) => l.id)).toEqual([c.id, b.id, a.id])

    store.selectLayer(b.id)
    store.selectLayer('nope')
    expect(store.activeLayerId).toBe(b.id)
    store.toggleLayerVisibility(b.id)
    expect(store.visibleLayers.map((l) => l.id)).toEqual([c.id, a.id])

    expect(store.removeLayer('nope')).toBe(false)
    store.removeLayer(b.id)
    expect(store.activeLayerId).toBe(a.id)
    store.removeLayer(a.id)
    store.removeLayer(c.id)
    expect(store.activeLayerId).toBeNull()
    expect(store.multiLayerMode).toBe(false)
  })

  it('updateLayerProperty validiert und begrenzt', () => {
    const l = store.addLayer('glBars')
    const set = (p, v) => store.updateLayerProperty(l.id, p, v)
    expect(set('opacity', 2)).toBe(true)
    expect(set('x', -1)).toBe(true)
    expect(set('scale', 9)).toBe(true)
    expect([l.opacity, l.x, l.scale]).toEqual([1, 0, 3])
    expect(set('visualizerId', 'gibtsNicht')).toBe(false)
    expect(set('blendMode', 'quatsch')).toBe(false)
    expect(set('blendMode', 'screen')).toBe(true)
    expect(set('reactSource', 'quatsch')).toBe(false)
    expect(set('reactStrength', 42.6)).toBe(true)
    expect(set('imageId', 5)).toBe(true)
    expect(set('custom', 'x')).toBe(true)
    expect([l.blendMode, l.reactStrength, l.imageId, l.custom]).toEqual(['screen', 43, null, 'x'])
    expect(store.updateLayerProperty('nope', 'x', 1)).toBe(false)
    expect(store.updateLayer('nope', { x: 1 })).toBe(false)
    expect(store.updateLayer(l.id, { x: 0.3, y: 0.7 })).toBe(true)
    expect([l.x, l.y]).toEqual([0.3, 0.7])
  })

  it('Sync zwischen Single-Modus und aktivem Layer', () => {
    const l = store.addLayer('glBars', { color: '#111111', x: 0.1, ledText: 'LAYER' })
    store.syncSingleModeFromLayer()
    expect([
      store.selectedVisualizer,
      store.visualizerColor,
      store.visualizerX,
      store.ledText,
    ]).toEqual(['glBars', '#111111', 0.1, 'LAYER'])
    store.setColor('#222222')
    store.setVisualizerY(0.9)
    store.syncLayerFromSingleMode()
    expect([l.color, l.y]).toEqual(['#222222', 0.9])
  })

  it('clearAllLayers setzt alles zurück', () => {
    store.addLayer('glBars')
    store.clearAllLayers()
    expect([store.layerCount, store.activeLayerId, store.multiLayerMode]).toEqual([0, null, false])
  })

  it('layerPostFxConfig nutzt die globale adaptive Qualität', () => {
    const l = store.addLayer('glBars')
    store.updateLayerEffect(l.id, 'bloomEnabled', 1)
    store.setAdaptiveQuality(false)
    expect(store.layerPostFxConfig(l)).toEqual({
      bloom: { enabled: true, strength: 0.55, threshold: 0.35, radius: 8 },
      trails: { enabled: false, decay: 0.85 },
      adaptiveQuality: false,
    })
  })
})

describe('visualizerStore – Post-Processing', () => {
  it('Setter begrenzen, postFxConfig spiegelt den Zustand', () => {
    store.setBloomEnabled(0)
    store.setBloomStrength(5)
    store.setBloomThreshold(-1)
    store.setBloomRadius(100)
    store.setTrailsEnabled('ja')
    store.setTrailsDecay(1)
    expect(store.postFxConfig).toEqual({
      bloom: { enabled: false, strength: 2, threshold: 0, radius: 32 },
      trails: { enabled: true, decay: 0.97 },
      adaptiveQuality: true,
    })
    store.setBeatPunchEnabled(1)
    store.setBeatPunchSource('bass')
    store.setBeatPunchSource('quatsch')
    store.setBeatPunchStrength(120)
    store.setBeatPunchVariation(33.4)
    store.setOnsetFlourishEnabled(1)
    store.setOnsetFlourishStrength(-5)
    expect([
      store.beatPunchEnabled,
      store.beatPunchSource,
      store.beatPunchStrength,
      store.beatPunchVariation,
      store.onsetFlourishEnabled,
      store.onsetFlourishStrength,
    ]).toEqual([true, 'bass', 100, 33, true, 0])
  })
})

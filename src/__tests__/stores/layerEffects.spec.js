import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

let viz
let id

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  viz = useVisualizerStore()
  id = viz.addLayer('bars').id
})

describe('Effekte pro Layer – Standardwerte', () => {
  it('legt jeden Layer mit ausgeschalteten Effekten an', () => {
    const fx = viz.layerEffects(viz.visualizerLayers[0])
    expect(fx.bloomEnabled).toBe(false)
    expect(fx.trailsEnabled).toBe(false)
    expect(fx.beatPunchEnabled).toBe(false)
    expect(fx.onsetFlourishEnabled).toBe(false)
    expect(fx.bloomStrength).toBe(0.55)
    expect(fx.trailsDecay).toBe(0.85)
  })

  it('ergänzt fehlende Effekte bei Layern aus älteren Presets', () => {
    const legacy = { id: 'alt', visualizerId: 'bars', visible: true }
    const fx = viz.layerEffects(legacy)
    expect(fx.bloomEnabled).toBe(false)
    expect(fx.beatPunchSource).toBe('all')
  })

  it('übernimmt Effekte aus den Vorgaben beim Anlegen', () => {
    const layer = viz.addLayer('bars', { effects: { bloomEnabled: true, bloomRadius: 12 } })
    const fx = viz.layerEffects(layer)
    expect(fx.bloomEnabled).toBe(true)
    expect(fx.bloomRadius).toBe(12)
    // nicht gesetzte Felder behalten ihren Standard
    expect(fx.trailsDecay).toBe(0.85)
  })
})

describe('updateLayerEffect', () => {
  it('setzt Werte und begrenzt sie auf den gültigen Bereich', () => {
    expect(viz.updateLayerEffect(id, 'bloomEnabled', true)).toBe(true)
    expect(viz.updateLayerEffect(id, 'bloomStrength', 5)).toBe(true)
    expect(viz.updateLayerEffect(id, 'bloomThreshold', -1)).toBe(true)
    expect(viz.updateLayerEffect(id, 'bloomRadius', 99)).toBe(true)
    expect(viz.updateLayerEffect(id, 'trailsDecay', 1)).toBe(true)
    expect(viz.updateLayerEffect(id, 'beatPunchStrength', 250)).toBe(true)

    const fx = viz.layerEffects(viz.visualizerLayers[0])
    expect(fx.bloomEnabled).toBe(true)
    expect(fx.bloomStrength).toBe(2)
    expect(fx.bloomThreshold).toBe(0)
    expect(fx.bloomRadius).toBe(32)
    expect(fx.trailsDecay).toBe(0.97)
    expect(fx.beatPunchStrength).toBe(100)
  })

  it('weist unbekannte Layer, Felder und Quellen ab', () => {
    expect(viz.updateLayerEffect('gibt-es-nicht', 'bloomEnabled', true)).toBe(false)
    expect(viz.updateLayerEffect(id, 'gibtEsNicht', 1)).toBe(false)
    expect(viz.updateLayerEffect(id, 'beatPunchSource', 'quatsch')).toBe(false)
    expect(viz.updateLayerEffect(id, 'beatPunchSource', 'treble')).toBe(true)
    expect(viz.layerEffects(viz.visualizerLayers[0]).beatPunchSource).toBe('treble')
  })

  it('hält die Layer voneinander getrennt', () => {
    const second = viz.addLayer('waveform').id
    viz.updateLayerEffect(id, 'bloomEnabled', true)
    viz.updateLayerEffect(second, 'trailsEnabled', true)

    const a = viz.layerEffects(viz.visualizerLayers.find((l) => l.id === id))
    const b = viz.layerEffects(viz.visualizerLayers.find((l) => l.id === second))
    expect(a.bloomEnabled).toBe(true)
    expect(a.trailsEnabled).toBe(false)
    expect(b.bloomEnabled).toBe(false)
    expect(b.trailsEnabled).toBe(true)
  })

  it('setzt per resetLayerEffects auf die Standardwerte zurück', () => {
    viz.updateLayerEffect(id, 'bloomEnabled', true)
    viz.updateLayerEffect(id, 'trailsEnabled', true)
    expect(viz.resetLayerEffects(id)).toBe(true)
    const fx = viz.layerEffects(viz.visualizerLayers[0])
    expect(fx.bloomEnabled).toBe(false)
    expect(fx.trailsEnabled).toBe(false)
    expect(viz.resetLayerEffects('gibt-es-nicht')).toBe(false)
  })
})

describe('layerPostFxConfig', () => {
  it('liefert die Form, die der Post-Prozessor erwartet', () => {
    viz.updateLayerEffect(id, 'bloomEnabled', true)
    viz.updateLayerEffect(id, 'bloomStrength', 1.2)
    viz.updateLayerEffect(id, 'trailsEnabled', true)
    viz.updateLayerEffect(id, 'trailsDecay', 0.5)

    const cfg = viz.layerPostFxConfig(viz.visualizerLayers[0])
    expect(cfg.bloom).toEqual({ enabled: true, strength: 1.2, threshold: 0.35, radius: 8 })
    expect(cfg.trails).toEqual({ enabled: true, decay: 0.5 })
    expect(cfg.adaptiveQuality).toBe(viz.adaptiveQuality)
  })

  it('lässt die globalen Effekte unberührt', () => {
    const globalBloom = viz.bloomEnabled
    viz.updateLayerEffect(id, 'bloomEnabled', !globalBloom)
    expect(viz.bloomEnabled).toBe(globalBloom)
  })
})

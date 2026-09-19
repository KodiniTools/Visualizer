import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BUILT_IN_PRESETS, usePresetStore } from '../../stores/presetStore.js'
import { useVisualizerStore, BLEND_MODES, REACT_SOURCES } from '../../stores/visualizerStore.js'
import { Visualizers } from '../../lib/visualizers/index.js'

const multiPresets = BUILT_IN_PRESETS.filter((p) => p.visualizer.mode === 'multi')
const blendIds = BLEND_MODES.map((m) => m.id)

let viz
let presets

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  viz = useVisualizerStore()
  presets = usePresetStore()
})

describe('eingebaute Presets – Grundlagen', () => {
  it('hat eindeutige IDs und Namen', () => {
    const ids = BUILT_IN_PRESETS.map((p) => p.id)
    const names = BUILT_IN_PRESETS.map((p) => p.name)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it('enthält Multi-Layer-Vorlagen', () => {
    expect(multiPresets.length).toBeGreaterThanOrEqual(8)
    for (const p of multiPresets) {
      expect(p.visualizer.layers.length, p.name).toBeGreaterThanOrEqual(2)
    }
  })

  it('verweist überall auf vorhandene Visualizer', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(Visualizers[p.visualizer.selectedVisualizer], p.name).toBeDefined()
      for (const l of p.visualizer.layers ?? []) {
        expect(Visualizers[l.visualizerId], `${p.name} → ${l.visualizerId}`).toBeDefined()
      }
    }
  })
})

describe('Multi-Layer-Vorlagen – Layer-Form', () => {
  it('nutzt gültige Mischmodi und Reaktionsquellen', () => {
    for (const p of multiPresets) {
      for (const l of p.visualizer.layers) {
        expect(blendIds, `${p.name} → ${l.blendMode}`).toContain(l.blendMode)
        expect(REACT_SOURCES, `${p.name} → ${l.reactSource}`).toContain(l.reactSource)
      }
    }
  })

  it('hat je Preset eindeutige Layer-IDs und vollständige Felder', () => {
    const fields = [
      'id',
      'visualizerId',
      'visible',
      'color',
      'opacity',
      'colorOpacity',
      'x',
      'y',
      'scale',
      'blendMode',
      'reactSource',
      'reactStrength',
      'imageId',
    ]
    for (const p of multiPresets) {
      const ids = p.visualizer.layers.map((l) => l.id)
      expect(new Set(ids).size, p.name).toBe(ids.length)
      for (const l of p.visualizer.layers) {
        for (const f of fields) expect(l, `${p.name} → ${f}`).toHaveProperty(f)
        expect(l.color).toMatch(/^#[0-9a-f]{6}$/i)
        expect(l.opacity).toBeGreaterThan(0)
        expect(l.opacity).toBeLessThanOrEqual(1)
        expect(l.scale).toBeGreaterThan(0)
      }
    }
  })

  it('braucht keine Bilder (Portrait-Visualizer sind ausgenommen)', () => {
    for (const p of multiPresets) {
      for (const l of p.visualizer.layers) {
        expect(Visualizers[l.visualizerId].needsImage, `${p.name} → ${l.visualizerId}`).toBeFalsy()
      }
    }
  })

  it('verkleinert keinen Layer (sonst wird dessen Fläche als Rechteck sichtbar)', () => {
    for (const p of multiPresets) {
      for (const l of p.visualizer.layers) {
        expect(l.scale, `${p.name} → ${l.visualizerId}`).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('legt den untersten Layer ohne Mischmodus an, damit der Hintergrund trägt', () => {
    for (const p of multiPresets) {
      expect(p.visualizer.layers[0].blendMode, p.name).toBe('source-over')
    }
  })
})

describe('Anwenden einer Multi-Layer-Vorlage', () => {
  it('schaltet Multi-Layer ein, übernimmt die Layer und zeigt den Visualizer', () => {
    const preset = multiPresets[0]
    viz.showVisualizer = false
    viz.multiLayerMode = false

    presets.applyPreset(preset, { value: null })

    expect(viz.multiLayerMode).toBe(true)
    expect(viz.showVisualizer).toBe(true)
    expect(viz.visualizerLayers.map((l) => l.visualizerId)).toEqual(
      preset.visualizer.layers.map((l) => l.visualizerId),
    )
    expect(viz.activeLayerId).toBe(preset.visualizer.layers[0].id)
    expect(presets.activePresetId).toBe(preset.id)
  })

  it('wechselt sauber zurück auf eine Einzel-Vorlage', () => {
    const single = BUILT_IN_PRESETS.find((p) => p.visualizer.mode === 'single')
    presets.applyPreset(multiPresets[0], { value: null })
    expect(viz.multiLayerMode).toBe(true)

    presets.applyPreset(single, { value: null })
    expect(viz.multiLayerMode).toBe(false)
    expect(viz.visualizerLayers).toHaveLength(0)
    expect(viz.selectedVisualizer).toBe(single.visualizer.selectedVisualizer)
  })
})

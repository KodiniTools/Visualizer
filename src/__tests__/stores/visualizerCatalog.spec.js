// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { BUILT_IN_PRESETS, usePresetStore } from '../../stores/presetStore.js'
import { Visualizers, glVisualizers } from '../../lib/visualizers/index.js'

describe('visualizer catalogue (migration stage 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lists GPU presets first and every classic visualizer under "Klassisch"', () => {
    const store = useVisualizerStore()
    const categories = Object.keys(store.categorizedVisualizers)
    expect(categories[0]).toBe('GPU-Presets')
    expect(categories).toContain('Klassisch')

    const gpuIds = [
      ...store.categorizedVisualizers['GPU-Presets'],
      ...store.categorizedVisualizers.Laser,
      ...store.categorizedVisualizers['LED-Ziffern'],
      ...store.categorizedVisualizers['LED-Buchstaben'],
      ...store.categorizedVisualizers['LED-Rahmen'],
      ...store.categorizedVisualizers.Portrait,
    ].map((v) => v.id)
    expect(gpuIds.sort()).toEqual(Object.keys(glVisualizers).sort())

    const classicIds = store.categorizedVisualizers.Klassisch.map((v) => v.id)
    const expectedClassic = Object.keys(Visualizers).filter((id) => !glVisualizers[id])
    expect(classicIds.sort()).toEqual(expectedClassic.sort())
  })

  it('keeps every laser preset in its own category', () => {
    const store = useVisualizerStore()
    const laser = store.categorizedVisualizers.Laser.map((v) => v.id)
    const allLaserIds = Object.keys(glVisualizers).filter((id) => id.startsWith('glLaser'))
    expect([...laser].sort()).toEqual(allLaserIds.sort())
    expect(laser).toHaveLength(16)
    const gpu = store.categorizedVisualizers['GPU-Presets'].map((v) => v.id)
    expect(gpu.some((id) => id.startsWith('glLaser'))).toBe(false)
  })

  it('keeps the LED letters A–Z in their own category, in alphabetical order', () => {
    const store = useVisualizerStore()
    const letters = store.categorizedVisualizers['LED-Buchstaben'].map((v) => v.id)
    expect(letters).toEqual([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c) => `glLedLetter${c}`))
    const gpu = store.categorizedVisualizers['GPU-Presets'].map((v) => v.id)
    expect(gpu.some((id) => id.startsWith('glLedLetter'))).toBe(false)
  })

  it('keeps the LED digits 0–9 in their own category, in numeric order', () => {
    const store = useVisualizerStore()
    const digits = store.categorizedVisualizers['LED-Ziffern'].map((v) => v.id)
    expect(digits).toEqual([...Array(10).keys()].map((d) => `glLedDigit${d}`))
    const gpu = store.categorizedVisualizers['GPU-Presets'].map((v) => v.id)
    expect(gpu.some((id) => id.startsWith('glLedDigit'))).toBe(false)
    // Reihenfolge der Sektionen im Picker
    expect(Object.keys(store.categorizedVisualizers)).toEqual([
      'GPU-Presets',
      'Laser',
      'LED-Ziffern',
      'LED-Buchstaben',
      'LED-Rahmen',
      'Portrait',
      'Klassisch',
    ])
  })

  it('keeps the five LED frame presets in their own category', () => {
    const store = useVisualizerStore()
    const frames = store.categorizedVisualizers['LED-Rahmen'].map((v) => v.id)
    expect(frames).toEqual([
      'glLedFrameChase',
      'glLedFrameSpectrum',
      'glLedFrameVu',
      'glLedFramePulse',
      'glLedFrameRainbow',
    ])
  })

  it('lists every registered visualizer in exactly one category', () => {
    const store = useVisualizerStore()
    const all = Object.values(store.categorizedVisualizers).flatMap((list) => list.map((v) => v.id))
    expect(all.length).toBe(new Set(all).size)
    expect([...all].sort()).toEqual(Object.keys(Visualizers).sort())
  })

  it('built-in presets select GPU presets', () => {
    for (const preset of BUILT_IN_PRESETS) {
      const id = preset.visualizer.selectedVisualizer
      expect(glVisualizers[id], `${preset.name} → ${id}`).toBeDefined()
    }
  })

  it('selectVisualizer still accepts classic ids while they exist', () => {
    const store = useVisualizerStore()
    store.selectVisualizer('bars')
    expect(store.selectedVisualizer).toBe('bars')
    store.selectVisualizer('glMandala')
    expect(store.selectedVisualizer).toBe('glMandala')
  })

  it('applying a preset with an unknown visualizer falls back instead of breaking', () => {
    const vizStore = useVisualizerStore()
    const presets = usePresetStore()
    vizStore.selectVisualizer('glBars')
    vizStore.markVisualizerWorking('glBars')
    presets.applyPreset(
      {
        id: 'x',
        visualizer: { mode: 'single', selectedVisualizer: 'removedLongAgo', color: '#fff' },
        background: {},
      },
      null,
    )
    expect(vizStore.selectedVisualizer).toBe('glBars')
  })

  it('applying a multi-layer preset keeps existing ids and drops unknown ones to the fallback', () => {
    const vizStore = useVisualizerStore()
    const presets = usePresetStore()
    vizStore.markVisualizerWorking('glBars')
    presets.applyPreset(
      {
        id: 'y',
        visualizer: {
          mode: 'multi',
          layers: [
            { id: 'l1', visualizerId: 'glFire', visible: true },
            { id: 'l2', visualizerId: 'nope', visible: true },
          ],
        },
        background: {},
      },
      null,
    )
    expect(vizStore.visualizerLayers.map((l) => l.visualizerId)).toEqual(['glFire', 'glBars'])
  })

  describe('reaction source per layer', () => {
    it('new layers default to the spectrum source', () => {
      const store = useVisualizerStore()
      const layer = store.addLayer('glBars')
      expect(layer.reactSource).toBe('spectrum')
      expect(layer.reactStrength).toBe(70)
    })

    it('validates source and clamps strength on layer updates', () => {
      const store = useVisualizerStore()
      const layer = store.addLayer('glBars')
      expect(store.updateLayerProperty(layer.id, 'reactSource', 'allOnset')).toBe(true)
      expect(store.updateLayerProperty(layer.id, 'reactSource', 'bogus')).toBe(false)
      expect(layer.reactSource).toBe('allOnset')
      store.updateLayerProperty(layer.id, 'reactStrength', 250)
      expect(layer.reactStrength).toBe(100)
      store.updateLayerProperty(layer.id, 'reactStrength', -5)
      expect(layer.reactStrength).toBe(0)
    })

    it('syncs the source between single mode and the active layer', () => {
      const store = useVisualizerStore()
      store.setReactSource('bassOnset')
      store.setReactStrength(40)
      store.setMultiLayerMode(true)
      expect(store.activeLayer.reactSource).toBe('bassOnset')
      expect(store.activeLayer.reactStrength).toBe(40)
      store.updateLayerProperty(store.activeLayer.id, 'reactSource', 'treble')
      store.syncSingleModeFromLayer()
      expect(store.reactSource).toBe('treble')
    })

    it('round-trips the single-mode source through presets', () => {
      const vizStore = useVisualizerStore()
      const presets = usePresetStore()
      vizStore.setReactSource('midOnset')
      vizStore.setReactStrength(55)
      const preset = presets.saveCurrentAsPreset('react', null)
      expect(preset.visualizer.reactSource).toBe('midOnset')
      vizStore.setReactSource('spectrum')
      presets.applyPreset(preset, null)
      expect(vizStore.reactSource).toBe('midOnset')
      expect(vizStore.reactStrength).toBe(55)
    })
  })

  describe('reaction shaping (smoothing, gain, easing, beat boost, phase)', () => {
    it('defaults match the image panel defaults in single mode and per layer', () => {
      const store = useVisualizerStore()
      expect(store.reactSmoothing).toBe(50)
      expect(store.reactGain).toBe(100)
      expect(store.reactEasing).toBe('linear')
      expect(store.reactBeatBoost).toBe(1)
      expect(store.reactPhase).toBe(0)
      const layer = store.addLayer('glBars')
      expect(layer).toMatchObject({
        reactSmoothing: 50,
        reactGain: 100,
        reactEasing: 'linear',
        reactBeatBoost: 1,
        reactPhase: 0,
      })
    })

    it('clamps and validates the setters', () => {
      const store = useVisualizerStore()
      store.setReactSmoothing(130)
      store.setReactGain(-20)
      store.setReactEasing('nope')
      store.setReactBeatBoost(2.55)
      store.setReactPhase(725)
      expect(store.reactSmoothing).toBe(100)
      expect(store.reactGain).toBe(0)
      expect(store.reactEasing).toBe('linear')
      expect(store.reactBeatBoost).toBe(2.6)
      expect(store.reactPhase).toBe(360)
      store.setReactEasing('elastic')
      expect(store.reactEasing).toBe('elastic')
      store.resetReactShape()
      expect(store.reactSmoothing).toBe(50)
      expect(store.reactEasing).toBe('linear')
      expect(store.reactBeatBoost).toBe(1)
    })

    it('validates the same fields on layer updates', () => {
      const store = useVisualizerStore()
      const layer = store.addLayer('glBars')
      expect(store.updateLayerProperty(layer.id, 'reactSmoothing', 999)).toBe(true)
      expect(layer.reactSmoothing).toBe(100)
      store.updateLayerProperty(layer.id, 'reactGain', 150)
      expect(layer.reactGain).toBe(150)
      store.updateLayerProperty(layer.id, 'reactEasing', 'bogus')
      expect(layer.reactEasing).toBe('linear')
      store.updateLayerProperty(layer.id, 'reactEasing', 'punch')
      expect(layer.reactEasing).toBe('punch')
      store.updateLayerProperty(layer.id, 'reactBeatBoost', 0)
      expect(layer.reactBeatBoost).toBe(1)
      store.updateLayerProperty(layer.id, 'reactPhase', 90.4)
      expect(layer.reactPhase).toBe(90)
    })

    it('syncs shaping between single mode and the active layer', () => {
      const store = useVisualizerStore()
      store.setReactSource('bass')
      store.setReactSmoothing(80)
      store.setReactGain(120)
      store.setReactEasing('easeOut')
      store.setReactBeatBoost(1.5)
      store.setReactPhase(180)
      store.setMultiLayerMode(true)
      expect(store.activeLayer).toMatchObject({
        reactSmoothing: 80,
        reactGain: 120,
        reactEasing: 'easeOut',
        reactBeatBoost: 1.5,
        reactPhase: 180,
      })
      store.updateLayer(store.activeLayer.id, { reactSmoothing: 20, reactEasing: 'bounce' })
      store.syncSingleModeFromLayer()
      expect(store.reactSmoothing).toBe(20)
      expect(store.reactEasing).toBe('bounce')
      expect(store.reactGain).toBe(120)
      // A layer without the fields (older preset) syncs back to the defaults.
      delete store.activeLayer.reactSmoothing
      delete store.activeLayer.reactBeatBoost
      store.syncSingleModeFromLayer()
      expect(store.reactSmoothing).toBe(50)
      expect(store.reactBeatBoost).toBe(1)
    })

    it('round-trips shaping through single-mode presets and defaults older presets', () => {
      const vizStore = useVisualizerStore()
      const presets = usePresetStore()
      vizStore.setReactSource('midOnset')
      vizStore.setReactSmoothing(70)
      vizStore.setReactGain(140)
      vizStore.setReactEasing('easeInOut')
      vizStore.setReactBeatBoost(2)
      vizStore.setReactPhase(45)
      const preset = presets.saveCurrentAsPreset('shape', null)
      expect(preset.visualizer).toMatchObject({
        reactSmoothing: 70,
        reactGain: 140,
        reactEasing: 'easeInOut',
        reactBeatBoost: 2,
        reactPhase: 45,
      })
      vizStore.resetReactShape()
      presets.applyPreset(preset, null)
      expect(vizStore.reactSmoothing).toBe(70)
      expect(vizStore.reactGain).toBe(140)
      expect(vizStore.reactEasing).toBe('easeInOut')
      expect(vizStore.reactBeatBoost).toBe(2)
      expect(vizStore.reactPhase).toBe(45)

      // Older preset without the fields → defaults, not stale values.
      const legacy = JSON.parse(JSON.stringify(preset))
      for (const k of [
        'reactSmoothing',
        'reactGain',
        'reactEasing',
        'reactBeatBoost',
        'reactPhase',
      ])
        delete legacy.visualizer[k]
      presets.applyPreset(legacy, null)
      expect(vizStore.reactSmoothing).toBe(50)
      expect(vizStore.reactGain).toBe(100)
      expect(vizStore.reactEasing).toBe('linear')
      expect(vizStore.reactBeatBoost).toBe(1)
      expect(vizStore.reactPhase).toBe(0)
    })

    it('fills the fields on layers of older multi presets', () => {
      const vizStore = useVisualizerStore()
      const presets = usePresetStore()
      presets.applyPreset(
        {
          id: 'legacy-multi',
          visualizer: {
            mode: 'multi',
            layers: [
              {
                id: 'l1',
                visualizerId: 'glBars',
                color: '#ffffff',
                reactSource: 'bass',
                reactStrength: 60,
                reactGain: 150,
              },
            ],
          },
          background: {},
        },
        null,
      )
      expect(vizStore.visualizerLayers[0]).toMatchObject({
        reactSource: 'bass',
        reactStrength: 60,
        reactSmoothing: 50,
        reactGain: 150,
        reactEasing: 'linear',
        reactBeatBoost: 1,
        reactPhase: 0,
      })
    })
  })

  describe('portrait image per layer', () => {
    it('defaults to no image and accepts ids', () => {
      const store = useVisualizerStore()
      const layer = store.addLayer('glPortraitLed')
      expect(layer.imageId).toBeNull()
      expect(store.updateLayerProperty(layer.id, 'imageId', 'img_1')).toBe(true)
      expect(layer.imageId).toBe('img_1')
      store.updateLayerProperty(layer.id, 'imageId', '')
      expect(layer.imageId).toBeNull()
    })

    it('marks portrait presets as needing an image', () => {
      expect(Visualizers.glPortraitLed.needsImage).toBe(true)
      expect(Visualizers.glBars.needsImage).toBe(false)
    })

    it('round-trips the image id through single mode, layers and presets', () => {
      const vizStore = useVisualizerStore()
      const presets = usePresetStore()
      vizStore.setVisualizerImageId('img_7')
      vizStore.setMultiLayerMode(true)
      expect(vizStore.activeLayer.imageId).toBe('img_7')
      vizStore.setMultiLayerMode(false)
      const preset = presets.saveCurrentAsPreset('portrait', null)
      expect(preset.visualizer.imageId).toBe('img_7')
      vizStore.setVisualizerImageId(null)
      presets.applyPreset(preset, null)
      expect(vizStore.visualizerImageId).toBe('img_7')
    })
  })
})

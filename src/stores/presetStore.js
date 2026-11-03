import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useVisualizerStore } from './visualizerStore.js'
import { resolveVisualizerId } from '../lib/visualizers/aliases.js'
import { DEFAULT_REACT_SHAPE } from '../lib/visualizers/core/reactSource.js'
import { normalizeLedConfig } from '../lib/visualizers/gl/ledTextSettings.js'
import { normalizeVisualizerShape } from '../lib/visualizers/core/visualizerShape.js'
import { BUILT_IN_PRESETS } from '../data/builtInPresets.js'

// Re-Export, damit bestehende Importe aus dem Store weiter funktionieren.
export { BUILT_IN_PRESETS }

const USER_PRESETS_KEY = 'visualizer-user-presets'

export const usePresetStore = defineStore('presets', () => {
  const userPresets = ref([])
  const activePresetId = ref(null)

  function loadUserPresets() {
    try {
      const stored = localStorage.getItem(USER_PRESETS_KEY)
      if (stored) {
        userPresets.value = JSON.parse(stored)
      }
    } catch {
      userPresets.value = []
    }
  }

  function saveUserPresetsToStorage() {
    try {
      localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(userPresets.value))
    } catch {
      // Ignore storage errors
    }
  }

  function saveCurrentAsPreset(name, canvasManager) {
    const vizStore = useVisualizerStore()

    const preset = {
      id: `user-${Date.now()}`,
      name: name || `Preset ${userPresets.value.length + 1}`,
      builtIn: false,
      emoji: '⭐',
      visualizer: {
        mode: vizStore.multiLayerMode ? 'multi' : 'single',
        selectedVisualizer: vizStore.selectedVisualizer,
        color: vizStore.visualizerColor,
        opacity: vizStore.visualizerOpacity,
        colorOpacity: vizStore.colorOpacity,
        x: vizStore.visualizerX,
        y: vizStore.visualizerY,
        scale: vizStore.visualizerScale,
        shape: vizStore.visualizerShape,
        showVisualizer: vizStore.showVisualizer,
        reactSource: vizStore.reactSource,
        reactStrength: vizStore.reactStrength,
        reactSmoothing: vizStore.reactSmoothing,
        reactGain: vizStore.reactGain,
        reactEasing: vizStore.reactEasing,
        reactBeatBoost: vizStore.reactBeatBoost,
        reactPhase: vizStore.reactPhase,
        imageId: vizStore.visualizerImageId,
        ...vizStore.ledConfig,
        multiLayerMode: vizStore.multiLayerMode,
        layers: vizStore.multiLayerMode ? vizStore.visualizerLayers.map((l) => ({ ...l })) : [],
      },
      background: captureBackground(canvasManager),
    }

    userPresets.value.unshift(preset)
    saveUserPresetsToStorage()
    return preset
  }

  function captureBackground(canvasManager) {
    if (!canvasManager?.value) {
      return { color: '#ffffff', opacity: 1.0, gradientEnabled: false, gradientColor2: '#0066ff' }
    }
    // Read from the canvas manager's stored background string
    const bg = canvasManager.value.background
    if (typeof bg === 'string') {
      // Parse rgba(r, g, b, a)
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
      if (match) {
        const r = parseInt(match[1])
        const g = parseInt(match[2])
        const b = parseInt(match[3])
        const a = match[4] !== undefined ? parseFloat(match[4]) : 1.0
        const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
        return { color: hex, opacity: a, gradientEnabled: false, gradientColor2: '#0066ff' }
      }
    }
    return { color: '#ffffff', opacity: 1.0, gradientEnabled: false, gradientColor2: '#0066ff' }
  }

  function applyPreset(preset, canvasManager) {
    const vizStore = useVisualizerStore()
    const v = preset.visualizer

    // Apply visualizer state
    if (v.mode === 'multi' && v.layers?.length) {
      vizStore.multiLayerMode = true
      // Stored ids may point at retired classic visualizers → map to GPU preset.
      vizStore.visualizerLayers = v.layers.map((l) => ({
        // Ältere Presets kennen die Formungs-Regler nicht → Standardwerte
        ...DEFAULT_REACT_SHAPE,
        ...l,
        // LED-Text/-Zahlen: fehlende Felder → Standardwerte, sonst validiert
        ...normalizeLedConfig(l),
        // Form: fehlt in älteren Presets → 'free'
        shape: normalizeVisualizerShape(l.shape),
        visualizerId: resolveVisualizerId(l.visualizerId) || vizStore.lastWorkingVisualizer,
      }))
      if (v.layers.length > 0) vizStore.activeLayerId = v.layers[0].id
      // Ohne das bliebe ein zuvor ausgeblendeter Visualizer unsichtbar und das
      // Preset schiene wirkungslos.
      vizStore.showVisualizer = v.showVisualizer ?? true
    } else {
      vizStore.multiLayerMode = false
      vizStore.visualizerLayers = []
      vizStore.selectedVisualizer =
        resolveVisualizerId(v.selectedVisualizer) || vizStore.lastWorkingVisualizer
      vizStore.visualizerColor = v.color
      vizStore.visualizerOpacity = v.opacity ?? 1.0
      vizStore.colorOpacity = v.colorOpacity ?? 1.0
      vizStore.visualizerX = v.x ?? 0.5
      vizStore.visualizerY = v.y ?? 0.5
      vizStore.visualizerScale = v.scale ?? 1.0
      vizStore.setVisualizerShape(v.shape)
      vizStore.showVisualizer = v.showVisualizer ?? true
      vizStore.setReactSource(v.reactSource ?? 'spectrum')
      vizStore.setReactStrength(v.reactStrength ?? 70)
      // Formungs-Regler: fehlende Felder (ältere Presets) → Standardwerte
      vizStore.setReactSmoothing(v.reactSmoothing)
      vizStore.setReactGain(v.reactGain)
      vizStore.setReactEasing(v.reactEasing)
      vizStore.setReactBeatBoost(v.reactBeatBoost)
      vizStore.setReactPhase(v.reactPhase)
      vizStore.setVisualizerImageId(v.imageId ?? null)
      vizStore.applyLedConfig(v)
    }

    // Apply background via custom event (CanvasControlPanel listens)
    window.dispatchEvent(
      new CustomEvent('preset:apply', { detail: { background: preset.background } }),
    )

    activePresetId.value = preset.id
  }

  function deleteUserPreset(id) {
    userPresets.value = userPresets.value.filter((p) => p.id !== id)
    saveUserPresetsToStorage()
    if (activePresetId.value === id) activePresetId.value = null
  }

  return {
    userPresets,
    activePresetId,
    loadUserPresets,
    saveCurrentAsPreset,
    applyPreset,
    deleteUserPreset,
  }
})

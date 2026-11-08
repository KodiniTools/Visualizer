import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useVisualizerStore } from './visualizerStore'
import { resolveVisualizerId } from '../lib/visualizers/aliases'
import { DEFAULT_REACT_SHAPE } from '../lib/visualizers/core/reactSource'
import { normalizeLedConfig } from '../lib/visualizers/gl/ledTextSettings.js'
import { normalizeVisualizerShape } from '../lib/visualizers/core/visualizerShape'
import { BUILT_IN_PRESETS } from '../data/builtInPresets'
import type { VisualizerLayer } from './visualizer/useVisualizerLayers'

// Re-Export, damit bestehende Importe aus dem Store weiter funktionieren.
export { BUILT_IN_PRESETS }

const USER_PRESETS_KEY = 'visualizer-user-presets'

/** Ein Layer im Multi-Layer-Preset (Felder wie createLayer() im Visualizer-Store). */
export interface PresetLayer {
  id: string
  visualizerId: string
  shape?: string
  [key: string]: unknown
}

/** Gespeicherter Visualizer-Zustand eines Presets; LED-Felder liegen flach daneben. */
export interface PresetVisualizerSettings {
  mode?: 'single' | 'multi' | string
  selectedVisualizer?: string
  color?: string
  opacity?: number
  colorOpacity?: number
  x?: number
  y?: number
  scale?: number
  shape?: string
  showVisualizer?: boolean
  reactSource?: string
  reactStrength?: number
  reactSmoothing?: number
  reactGain?: number
  reactEasing?: string
  reactBeatBoost?: number
  reactPhase?: number
  imageId?: string | null
  multiLayerMode?: boolean
  layers?: PresetLayer[]
  [key: string]: unknown
}

export interface PresetBackground {
  color: string
  opacity: number
  gradientEnabled: boolean
  gradientColor2: string
  [key: string]: unknown
}

export interface VisualizerPreset {
  id: string
  name: string
  builtIn: boolean
  emoji?: string
  visualizer: PresetVisualizerSettings
  background: PresetBackground
  [key: string]: unknown
}

/** Ref-artiger Zugriff auf den CanvasManager; gelesen wird nur `background`. */
export type CanvasManagerRef = { value?: { background?: unknown } | null } | null | undefined

export const usePresetStore = defineStore('presets', () => {
  const userPresets = ref<VisualizerPreset[]>([])
  const activePresetId = ref<string | null>(null)

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

  function saveCurrentAsPreset(
    name: string | null | undefined,
    canvasManager: CanvasManagerRef,
  ): VisualizerPreset {
    const vizStore = useVisualizerStore()

    const preset: VisualizerPreset = {
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
        ...(vizStore.ledConfig as Record<string, unknown>),
        multiLayerMode: vizStore.multiLayerMode,
        layers: vizStore.multiLayerMode
          ? vizStore.visualizerLayers.map((l: PresetLayer) => ({ ...l }))
          : [],
      },
      background: captureBackground(canvasManager),
    }

    userPresets.value.unshift(preset)
    saveUserPresetsToStorage()
    return preset
  }

  function captureBackground(canvasManager: CanvasManagerRef): PresetBackground {
    if (!canvasManager?.value) {
      return { color: '#ffffff', opacity: 1.0, gradientEnabled: false, gradientColor2: '#0066ff' }
    }
    // Read from the canvas manager's stored background string
    const bg = canvasManager.value.background
    if (typeof bg === 'string') {
      // Parse rgba(r, g, b, a)
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
      if (match) {
        const r = parseInt(match[1] as string)
        const g = parseInt(match[2] as string)
        const b = parseInt(match[3] as string)
        const a = match[4] !== undefined ? parseFloat(match[4]) : 1.0
        const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
        return { color: hex, opacity: a, gradientEnabled: false, gradientColor2: '#0066ff' }
      }
    }
    return { color: '#ffffff', opacity: 1.0, gradientEnabled: false, gradientColor2: '#0066ff' }
  }

  // canvasManager bleibt für bestehende Aufrufer in der Signatur (Hintergrund läuft per Event)
  function applyPreset(preset: VisualizerPreset, _canvasManager?: CanvasManagerRef) {
    const vizStore = useVisualizerStore()
    const v = preset.visualizer

    // Apply visualizer state
    if (v.mode === 'multi' && v.layers?.length) {
      vizStore.multiLayerMode = true
      // Stored ids may point at retired classic visualizers → map to GPU preset.
      vizStore.visualizerLayers = v.layers.map((l: PresetLayer) => ({
        // Ältere Presets kennen die Formungs-Regler nicht → Standardwerte
        ...DEFAULT_REACT_SHAPE,
        ...l,
        // LED-Text/-Zahlen: fehlende Felder → Standardwerte, sonst validiert
        ...normalizeLedConfig(l),
        // Form: fehlt in älteren Presets → 'free'
        shape: normalizeVisualizerShape(l.shape),
        visualizerId: resolveVisualizerId(l.visualizerId) || vizStore.lastWorkingVisualizer,
        // Fehlende Felder älterer Presets ergänzt der Renderer bzw. layerEffects()
      })) as VisualizerLayer[]
      const firstLayer = v.layers[0]
      if (firstLayer) vizStore.activeLayerId = firstLayer.id
      // Ohne das bliebe ein zuvor ausgeblendeter Visualizer unsichtbar und das
      // Preset schiene wirkungslos.
      vizStore.showVisualizer = v.showVisualizer ?? true
    } else {
      vizStore.multiLayerMode = false
      vizStore.visualizerLayers = []
      vizStore.selectedVisualizer =
        resolveVisualizerId(v.selectedVisualizer as string) || vizStore.lastWorkingVisualizer
      vizStore.visualizerColor = v.color as string
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

  function deleteUserPreset(id: string) {
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

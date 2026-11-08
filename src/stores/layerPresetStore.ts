// src/stores/layerPresetStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useVisualizerStore } from './visualizerStore'
import { resolveVisualizerId } from '../lib/visualizers/aliases.js'
import { normalizeReactShape } from '../lib/visualizers/core/reactSource.js'
import { normalizeLedConfig } from '../lib/visualizers/gl/ledTextSettings.js'
import type { VisualizerLayer } from './visualizer/useVisualizerLayers'

const LAYER_PRESETS_KEY = 'visualizer-layer-presets'

/** Präfix für Preset-Referenzen in Visualizer-Auswahlfeldern (z.B. Beat-Marker). */
export const LAYER_PRESET_PREFIX = 'layerpreset:'

/** Baut aus einer Preset-ID die Referenz für Auswahlfelder. */
export function toLayerPresetRef(id: string): string {
  return `${LAYER_PRESET_PREFIX}${id}`
}

/** Liefert die Preset-ID aus einer Referenz oder null, wenn es keine ist. */
export function parseLayerPresetRef(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith(LAYER_PRESET_PREFIX)) return null
  const id = value.slice(LAYER_PRESET_PREFIX.length)
  return id || null
}

/** Layer-Eingabe (Store-Layer oder gespeicherter Preset-Layer). */
export interface LayerInput {
  visualizerId: string
  visible?: boolean
  color?: string
  opacity?: number
  colorOpacity?: number
  x?: number
  y?: number
  scale?: number
  blendMode?: string
  reactSource?: string
  reactStrength?: number
  imageId?: string | null
  [key: string]: unknown
}

export type LayerSnapshot = ReturnType<typeof snapshotLayer>

export interface LayerPreset {
  id: string
  name: string
  createdAt?: number
  layers: LayerInput[]
}

/** Reduziert einen Layer auf die speicherbaren Eigenschaften (ohne Laufzeit-ID). */
function snapshotLayer(layer: LayerInput) {
  return {
    visualizerId: layer.visualizerId,
    visible: layer.visible !== false,
    color: layer.color,
    opacity: layer.opacity ?? 1,
    colorOpacity: layer.colorOpacity ?? 1,
    x: layer.x ?? 0.5,
    y: layer.y ?? 0.5,
    scale: layer.scale ?? 1,
    blendMode: layer.blendMode || 'source-over',
    reactSource: layer.reactSource || 'spectrum',
    reactStrength: layer.reactStrength ?? 70,
    ...normalizeReactShape(layer),
    imageId: layer.imageId ?? null,
    ...normalizeLedConfig(layer),
  }
}

/**
 * Layer-Presets: gespeicherte Multi-Layer-Konfigurationen (mehrere Effekte).
 * Erscheinen als "Eigene Presets" in der Visualizer-Liste und im Beat-Marker.
 */
export const useLayerPresetStore = defineStore('layerPresets', () => {
  const layerPresets = ref<LayerPreset[]>([])
  let loaded = false

  function loadLayerPresets() {
    if (loaded) return
    loaded = true
    try {
      const stored = localStorage.getItem(LAYER_PRESETS_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      layerPresets.value = Array.isArray(parsed)
        ? parsed.filter(
            (p: Partial<LayerPreset> | null) =>
              p && typeof p.id === 'string' && Array.isArray(p.layers),
          )
        : []
    } catch {
      layerPresets.value = []
    }
  }

  function persist() {
    try {
      localStorage.setItem(LAYER_PRESETS_KEY, JSON.stringify(layerPresets.value))
    } catch {
      // Speicherfehler ignorieren (z.B. privater Modus / voller Speicher)
    }
  }

  function findLayerPreset(id: string): LayerPreset | null {
    return layerPresets.value.find((p) => p.id === id) || null
  }

  /**
   * Speichert die aktuellen Multi-Layer als Preset.
   * @param name - Anzeigename (leer → "Layer-Preset N")
   * @returns Das gespeicherte Preset oder null, wenn keine Layer vorhanden sind
   */
  function saveCurrentLayersAsPreset(name?: string | null): LayerPreset | null {
    const vizStore = useVisualizerStore()
    const layers = vizStore.visualizerLayers as LayerInput[] | undefined
    if (!layers || layers.length === 0) return null

    const trimmed = (name || '').trim()
    const preset: LayerPreset = {
      id: `layerpreset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed || `Layer-Preset ${layerPresets.value.length + 1}`,
      createdAt: Date.now(),
      layers: layers.map(snapshotLayer),
    }
    layerPresets.value.unshift(preset)
    persist()
    console.log(
      '💾 [LayerPreset] Preset gespeichert:',
      preset.name,
      `(${preset.layers.length} Layer)`,
    )
    return preset
  }

  /**
   * Wendet ein Preset an: Multi-Layer-Modus einschalten und die Layer ersetzen.
   * Akzeptiert ein Preset-Objekt, eine Preset-ID oder eine Referenz "layerpreset:ID".
   * @returns true, wenn angewendet
   */
  function applyLayerPreset(presetOrRef: LayerPreset | string | null | undefined): boolean {
    let preset: LayerPreset | null | undefined = presetOrRef as LayerPreset | null | undefined
    if (typeof presetOrRef === 'string') {
      preset = findLayerPreset(parseLayerPresetRef(presetOrRef) ?? presetOrRef)
    }
    if (!preset || !Array.isArray(preset.layers) || preset.layers.length === 0) return false

    const vizStore = useVisualizerStore()
    const stamp = Date.now()
    const layers = preset.layers.map((l, i) => ({
      ...snapshotLayer(l),
      id: `layer_${stamp}_p${i}`,
      // Gespeicherte IDs können auf entfernte Visualizer zeigen → Alias/Fallback
      visualizerId: resolveVisualizerId(l.visualizerId) || vizStore.lastWorkingVisualizer,
    }))

    // Effekte fehlen im Snapshot; layerEffects() liefert dafür Standardwerte
    vizStore.visualizerLayers = layers as VisualizerLayer[]
    vizStore.activeLayerId = (layers[0] as (typeof layers)[number]).id
    vizStore.multiLayerMode = true
    vizStore.showVisualizer = true
    console.log('🎛️ [LayerPreset] Preset angewendet:', preset.name)
    return true
  }

  function deleteLayerPreset(id: string) {
    const before = layerPresets.value.length
    layerPresets.value = layerPresets.value.filter((p) => p.id !== id)
    if (layerPresets.value.length !== before) persist()
  }

  function renameLayerPreset(id: string, name: string | null | undefined): boolean {
    const preset = findLayerPreset(id)
    const trimmed = (name || '').trim()
    if (!preset || !trimmed) return false
    preset.name = trimmed
    persist()
    return true
  }

  /** true, wenn die aktuellen Multi-Layer exakt diesem Preset entsprechen. */
  function isLayerPresetActive(preset: LayerPreset | null | undefined): boolean {
    const vizStore = useVisualizerStore()
    if (!preset || !vizStore.multiLayerMode) return false
    const current = (vizStore.visualizerLayers as LayerInput[]).map(snapshotLayer)
    const saved = preset.layers.map(snapshotLayer)
    return JSON.stringify(current) === JSON.stringify(saved)
  }

  loadLayerPresets()

  return {
    layerPresets,
    loadLayerPresets,
    findLayerPreset,
    saveCurrentLayersAsPreset,
    applyLayerPreset,
    deleteLayerPreset,
    renameLayerPreset,
    isLayerPresetActive,
  }
})

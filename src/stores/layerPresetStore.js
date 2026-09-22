// src/stores/layerPresetStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useVisualizerStore } from './visualizerStore.js'
import { resolveVisualizerId } from '../lib/visualizers/aliases.js'
import { normalizeReactShape } from '../lib/visualizers/core/reactSource.js'

const LAYER_PRESETS_KEY = 'visualizer-layer-presets'

/** Präfix für Preset-Referenzen in Visualizer-Auswahlfeldern (z.B. Beat-Marker). */
export const LAYER_PRESET_PREFIX = 'layerpreset:'

/** Baut aus einer Preset-ID die Referenz für Auswahlfelder. */
export function toLayerPresetRef(id) {
  return `${LAYER_PRESET_PREFIX}${id}`
}

/** Liefert die Preset-ID aus einer Referenz oder null, wenn es keine ist. */
export function parseLayerPresetRef(value) {
  if (typeof value !== 'string' || !value.startsWith(LAYER_PRESET_PREFIX)) return null
  const id = value.slice(LAYER_PRESET_PREFIX.length)
  return id || null
}

/** Reduziert einen Layer auf die speicherbaren Eigenschaften (ohne Laufzeit-ID). */
function snapshotLayer(layer) {
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
  }
}

/**
 * Layer-Presets: gespeicherte Multi-Layer-Konfigurationen (mehrere Effekte).
 * Erscheinen als "Eigene Presets" in der Visualizer-Liste und im Beat-Marker.
 */
export const useLayerPresetStore = defineStore('layerPresets', () => {
  const layerPresets = ref([])
  let loaded = false

  function loadLayerPresets() {
    if (loaded) return
    loaded = true
    try {
      const stored = localStorage.getItem(LAYER_PRESETS_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      layerPresets.value = Array.isArray(parsed)
        ? parsed.filter((p) => p && typeof p.id === 'string' && Array.isArray(p.layers))
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

  function findLayerPreset(id) {
    return layerPresets.value.find((p) => p.id === id) || null
  }

  /**
   * Speichert die aktuellen Multi-Layer als Preset.
   * @param {string} name - Anzeigename (leer → "Layer-Preset N")
   * @returns {object|null} Das gespeicherte Preset oder null, wenn keine Layer vorhanden sind
   */
  function saveCurrentLayersAsPreset(name) {
    const vizStore = useVisualizerStore()
    const layers = vizStore.visualizerLayers
    if (!layers || layers.length === 0) return null

    const trimmed = (name || '').trim()
    const preset = {
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
   * @returns {boolean} true, wenn angewendet
   */
  function applyLayerPreset(presetOrRef) {
    let preset = presetOrRef
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

    vizStore.visualizerLayers = layers
    vizStore.activeLayerId = layers[0].id
    vizStore.multiLayerMode = true
    vizStore.showVisualizer = true
    console.log('🎛️ [LayerPreset] Preset angewendet:', preset.name)
    return true
  }

  function deleteLayerPreset(id) {
    const before = layerPresets.value.length
    layerPresets.value = layerPresets.value.filter((p) => p.id !== id)
    if (layerPresets.value.length !== before) persist()
  }

  function renameLayerPreset(id, name) {
    const preset = findLayerPreset(id)
    const trimmed = (name || '').trim()
    if (!preset || !trimmed) return false
    preset.name = trimmed
    persist()
    return true
  }

  /** true, wenn die aktuellen Multi-Layer exakt diesem Preset entsprechen. */
  function isLayerPresetActive(preset) {
    const vizStore = useVisualizerStore()
    if (!preset || !vizStore.multiLayerMode) return false
    const current = vizStore.visualizerLayers.map(snapshotLayer)
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

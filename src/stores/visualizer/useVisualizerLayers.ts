// Multi-Visualizer-Layer: Layer-Liste, aktiver Layer, Validierung, Effekte
// pro Layer und Abgleich mit dem Single-Modus.
import { ref, computed, type Ref } from 'vue'
import { resolveVisualizerId } from '../../lib/visualizers/aliases'
import {
  DEFAULT_REACT_SOURCE,
  DEFAULT_REACT_STRENGTH,
  DEFAULT_REACT_SHAPE,
  isReactSource,
  normalizeReactSmoothing,
  normalizeReactGain,
  normalizeReactEasing,
  normalizeReactBeatBoost,
  normalizeReactPhase,
} from '../../lib/visualizers/core/reactSource'
import { DEFAULT_LED_CONFIG, normalizeLedField } from '../../lib/visualizers/gl/ledTextSettings.js'
import {
  DEFAULT_VISUALIZER_SHAPE,
  normalizeVisualizerShape,
} from '../../lib/visualizers/core/visualizerShape'
import { BLEND_MODES } from './catalog'
import type { useSingleVisualizer } from './useSingleVisualizer'

/** Effekte pro Layer (zusätzlich zum globalen Post-Processing). */
export interface LayerEffects {
  bloomEnabled: boolean
  bloomStrength: number
  bloomThreshold: number
  bloomRadius: number
  trailsEnabled: boolean
  trailsDecay: number
  beatPunchEnabled: boolean
  beatPunchSource: 'bass' | 'mid' | 'treble' | 'all' | string
  beatPunchStrength: number
  onsetFlourishEnabled: boolean
  onsetFlourishStrength: number
  [key: string]: unknown
}

/** Ein Visualizer-Layer; LED-Felder (ledText …) liegen flach im Objekt. */
export interface VisualizerLayer {
  id: string
  visualizerId: string
  visible: boolean
  color: string
  opacity: number
  colorOpacity: number
  x: number
  y: number
  scale: number
  shape: string
  blendMode: string
  reactSource: string
  reactStrength: number
  reactSmoothing: number
  reactGain: number
  reactEasing: string
  reactBeatBoost: number
  reactPhase: number
  imageId: string | null
  /** fehlt bei Layern aus älteren Presets/Projekten, siehe layerEffects() */
  effects?: LayerEffects
  [key: string]: unknown
}

export type LayerOverrides = Partial<Omit<VisualizerLayer, 'effects'>> & {
  effects?: Partial<LayerEffects> | null
  [key: string]: unknown
}

export interface VisualizerLayersDeps {
  /** Single-Modus (Quelle/Ziel beim Abgleich mit dem aktiven Layer) */
  single: ReturnType<typeof useSingleVisualizer>
  multiLayerMode: Ref<boolean>
  /** globale Einstellung, gilt auch für die Post-Processing-Konfiguration einzelner Layer */
  adaptiveQuality: Ref<boolean>
}

export function useVisualizerLayers({
  single,
  multiLayerMode,
  adaptiveQuality,
}: VisualizerLayersDeps) {
  const {
    selectedVisualizer,
    visualizerColor,
    visualizerOpacity,
    colorOpacity,
    visualizerX,
    visualizerY,
    visualizerScale,
    visualizerShape,
    reactSource,
    reactStrength,
    reactSmoothing,
    reactGain,
    reactEasing,
    reactBeatBoost,
    reactPhase,
    visualizerImageId,
    ledConfig,
    applyLedConfig,
  } = single

  // Layer-ID-Zähler für eindeutige IDs
  let layerIdCounter = 1

  // Generiert eine eindeutige Layer-ID
  function generateLayerId() {
    return `layer_${Date.now()}_${layerIdCounter++}`
  }

  /**
   * Standard-Effekte eines Layers. Sie wirken zusätzlich zu den globalen
   * Post-Processing-Einstellungen: Bloom und Bewegungsspuren werden auf das
   * Canvas dieses Layers angewendet, bevor er in die Gesamtszene gemischt
   * wird; Beat-Punch zoomt nur diesen Layer; Onset-Flourishes gelten nur für
   * dessen Visualizer. Standardmäßig ist alles aus, damit bestehende Projekte
   * unverändert aussehen.
   */
  function createLayerEffects(overrides: Partial<LayerEffects> | null = {}): LayerEffects {
    return {
      bloomEnabled: false,
      bloomStrength: 0.55,
      bloomThreshold: 0.35,
      bloomRadius: 8,
      trailsEnabled: false,
      trailsDecay: 0.85,
      beatPunchEnabled: false,
      beatPunchSource: 'all',
      beatPunchStrength: 50,
      onsetFlourishEnabled: false,
      onsetFlourishStrength: 70,
      ...overrides,
    }
  }

  /**
   * Effekte eines Layers inkl. Standardwerten. Layer aus älteren Presets oder
   * gespeicherten Projekten haben das Feld noch nicht.
   */
  function layerEffects(layer: { effects?: Partial<LayerEffects> | null } | null | undefined) {
    return layer?.effects ? createLayerEffects(layer.effects) : createLayerEffects()
  }

  /** Post-Processing-Konfiguration eines Layers (Form wie postFxConfig). */
  function layerPostFxConfig(layer: { effects?: Partial<LayerEffects> | null } | null | undefined) {
    const fx = layerEffects(layer)
    return {
      bloom: {
        enabled: fx.bloomEnabled,
        strength: fx.bloomStrength,
        threshold: fx.bloomThreshold,
        radius: fx.bloomRadius,
      },
      trails: { enabled: fx.trailsEnabled, decay: fx.trailsDecay },
      adaptiveQuality: adaptiveQuality.value,
    }
  }

  // Erstellt einen neuen Layer mit Standardwerten
  function createLayer(
    visualizerId: string | null | undefined,
    overrides: LayerOverrides = {},
  ): VisualizerLayer {
    return {
      id: generateLayerId(),
      visualizerId: visualizerId || 'bars',
      visible: true,
      color: '#6ea8fe',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      shape: DEFAULT_VISUALIZER_SHAPE,
      blendMode: 'source-over',
      reactSource: DEFAULT_REACT_SOURCE,
      reactStrength: DEFAULT_REACT_STRENGTH,
      ...DEFAULT_REACT_SHAPE,
      imageId: null,
      ...DEFAULT_LED_CONFIG,
      ...overrides,
      effects: createLayerEffects(overrides.effects),
    }
  }

  // Array von Visualizer-Layern (unterster Layer zuerst)
  const visualizerLayers = ref<VisualizerLayer[]>([])

  // Aktiver/ausgewählter Layer für Bearbeitung
  const activeLayerId = ref<string | null>(null)

  // Computed: Aktiver Layer
  const activeLayer = computed(() => {
    if (!activeLayerId.value) return null
    return visualizerLayers.value.find((l) => l.id === activeLayerId.value) || null
  })

  // Computed: Sichtbare Layer (für Rendering)
  const visibleLayers = computed(() => {
    return visualizerLayers.value.filter((l) => l.visible)
  })

  // Computed: Anzahl der Layer
  const layerCount = computed(() => visualizerLayers.value.length)

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 MULTI-LAYER FUNKTIONEN
  // ═══════════════════════════════════════════════════════════════════════════

  // Multi-Layer-Modus aktivieren/deaktivieren
  function setMultiLayerMode(enabled: boolean) {
    multiLayerMode.value = enabled

    if (enabled && visualizerLayers.value.length === 0) {
      // Ersten Layer aus aktuellem Single-Visualizer erstellen
      const initialLayer = createLayer(selectedVisualizer.value, {
        color: visualizerColor.value,
        opacity: visualizerOpacity.value,
        colorOpacity: colorOpacity.value,
        x: visualizerX.value,
        y: visualizerY.value,
        scale: visualizerScale.value,
        shape: visualizerShape.value,
        reactSource: reactSource.value,
        reactStrength: reactStrength.value,
        reactSmoothing: reactSmoothing.value,
        reactGain: reactGain.value,
        reactEasing: reactEasing.value,
        reactBeatBoost: reactBeatBoost.value,
        reactPhase: reactPhase.value,
        imageId: visualizerImageId.value,
        ...ledConfig.value,
      })
      visualizerLayers.value.push(initialLayer)
      activeLayerId.value = initialLayer.id
    }
  }

  // Layer hinzufügen
  function addLayer(visualizerId = 'bars', options: LayerOverrides = {}) {
    const newLayer = createLayer(visualizerId, options)
    visualizerLayers.value.push(newLayer)
    activeLayerId.value = newLayer.id

    // Automatisch Multi-Layer-Modus aktivieren
    if (!multiLayerMode.value) {
      multiLayerMode.value = true
    }

    return newLayer
  }

  // Layer entfernen
  function removeLayer(layerId: string) {
    const index = visualizerLayers.value.findIndex((l) => l.id === layerId)
    if (index === -1) return false

    visualizerLayers.value.splice(index, 1)

    // Wenn aktiver Layer entfernt wurde, nächsten auswählen
    if (activeLayerId.value === layerId) {
      if (visualizerLayers.value.length > 0) {
        const next = visualizerLayers.value[
          Math.min(index, visualizerLayers.value.length - 1)
        ] as VisualizerLayer
        activeLayerId.value = next.id
      } else {
        activeLayerId.value = null
        multiLayerMode.value = false
      }
    }

    return true
  }

  // Layer duplizieren
  function duplicateLayer(layerId: string) {
    const layer = visualizerLayers.value.find((l) => l.id === layerId)
    if (!layer) return null

    const newLayer = createLayer(layer.visualizerId, {
      ...layer,
      id: undefined, // Neue ID generieren
    })

    const index = visualizerLayers.value.findIndex((l) => l.id === layerId)
    visualizerLayers.value.splice(index + 1, 0, newLayer)
    activeLayerId.value = newLayer.id

    return newLayer
  }

  // Layer nach oben verschieben (höhere Z-Ordnung)
  function moveLayerUp(layerId: string) {
    const index = visualizerLayers.value.findIndex((l) => l.id === layerId)
    if (index === -1 || index >= visualizerLayers.value.length - 1) return false

    const layers = visualizerLayers.value
    const temp = layers[index] as VisualizerLayer
    layers[index] = layers[index + 1] as VisualizerLayer
    layers[index + 1] = temp

    return true
  }

  // Layer nach unten verschieben (niedrigere Z-Ordnung)
  function moveLayerDown(layerId: string) {
    const index = visualizerLayers.value.findIndex((l) => l.id === layerId)
    if (index <= 0) return false

    const layers = visualizerLayers.value
    const temp = layers[index] as VisualizerLayer
    layers[index] = layers[index - 1] as VisualizerLayer
    layers[index - 1] = temp

    return true
  }

  // Layer auswählen
  function selectLayer(layerId: string) {
    if (visualizerLayers.value.find((l) => l.id === layerId)) {
      activeLayerId.value = layerId
    }
  }

  // Layer-Eigenschaft aktualisieren
  function updateLayerProperty(layerId: string, property: string, value: unknown): boolean {
    const layer = visualizerLayers.value.find((l) => l.id === layerId)
    if (!layer) return false

    // Werte validieren
    switch (property) {
      case 'opacity':
      case 'colorOpacity':
        value = Math.max(0, Math.min(1, value as number))
        break
      case 'x':
      case 'y':
        value = Math.max(0, Math.min(1, value as number))
        break
      case 'scale':
        value = Math.max(0.1, Math.min(3.0, value as number))
        break
      case 'visualizerId': {
        const resolved = resolveVisualizerId(value as string)
        if (!resolved) return false
        value = resolved
        break
      }
      case 'shape':
        value = normalizeVisualizerShape(value)
        break
      case 'blendMode':
        if (!BLEND_MODES.find((m: { id: string }) => m.id === value)) return false
        break
      case 'reactSource':
        if (!isReactSource(value as string)) return false
        break
      case 'reactStrength':
        value = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
        break
      case 'reactSmoothing':
        value = normalizeReactSmoothing(value)
        break
      case 'reactGain':
        value = normalizeReactGain(value)
        break
      case 'reactEasing':
        value = normalizeReactEasing(value)
        break
      case 'reactBeatBoost':
        value = normalizeReactBeatBoost(value)
        break
      case 'reactPhase':
        value = normalizeReactPhase(value)
        break
      case 'imageId':
        value = typeof value === 'string' && value ? value : null
        break
      case 'ledText':
      case 'ledNumberText':
      case 'ledNumberMode':
      case 'ledNumberSeconds':
      case 'ledNumberTimeZone':
      case 'ledCountdownTarget':
        value = normalizeLedField(property, value)
        break
    }

    layer[property] = value
    return true
  }

  /**
   * Setzt einen einzelnen Effekt-Wert eines Layers (validiert und begrenzt).
   * @returns {boolean} true, wenn der Wert übernommen wurde
   */
  function updateLayerEffect(layerId: string, property: string, value: unknown): boolean {
    const layer = visualizerLayers.value.find((l) => l.id === layerId)
    if (!layer) return false
    if (!layer.effects) layer.effects = createLayerEffects()
    if (!(property in layer.effects)) return false

    const clamp = (v: unknown, min: number, max: number) =>
      Math.max(min, Math.min(max, Number(v) || 0))
    switch (property) {
      case 'bloomEnabled':
      case 'trailsEnabled':
      case 'beatPunchEnabled':
      case 'onsetFlourishEnabled':
        value = !!value
        break
      case 'bloomStrength':
        value = clamp(value, 0, 2)
        break
      case 'bloomThreshold':
        value = clamp(value, 0, 1)
        break
      case 'bloomRadius':
        value = Math.round(clamp(value, 1, 32))
        break
      case 'trailsDecay':
        value = clamp(value, 0, 0.97)
        break
      case 'beatPunchSource':
        if (!['bass', 'mid', 'treble', 'all'].includes(value as string)) return false
        break
      case 'beatPunchStrength':
      case 'onsetFlourishStrength':
        value = Math.round(clamp(value, 0, 100))
        break
    }

    layer.effects[property] = value
    return true
  }

  /** Setzt alle Effekte eines Layers auf die Standardwerte zurück. */
  function resetLayerEffects(layerId: string) {
    const layer = visualizerLayers.value.find((l) => l.id === layerId)
    if (!layer) return false
    layer.effects = createLayerEffects()
    return true
  }

  // Mehrere Layer-Eigenschaften auf einmal aktualisieren
  function updateLayer(layerId: string, updates: Record<string, unknown>) {
    const layer = visualizerLayers.value.find((l) => l.id === layerId)
    if (!layer) return false

    for (const [property, value] of Object.entries(updates)) {
      updateLayerProperty(layerId, property, value)
    }

    return true
  }

  // Layer-Sichtbarkeit umschalten
  function toggleLayerVisibility(layerId: string) {
    const layer = visualizerLayers.value.find((l) => l.id === layerId)
    if (layer) {
      layer.visible = !layer.visible
    }
  }

  // Alle Layer löschen
  function clearAllLayers() {
    visualizerLayers.value = []
    activeLayerId.value = null
    multiLayerMode.value = false
  }

  // Layer aus Single-Modus-Einstellungen synchronisieren
  function syncLayerFromSingleMode() {
    if (activeLayer.value) {
      updateLayer(activeLayer.value.id, {
        visualizerId: selectedVisualizer.value,
        color: visualizerColor.value,
        opacity: visualizerOpacity.value,
        colorOpacity: colorOpacity.value,
        x: visualizerX.value,
        y: visualizerY.value,
        scale: visualizerScale.value,
        shape: visualizerShape.value,
        reactSource: reactSource.value,
        reactStrength: reactStrength.value,
        reactSmoothing: reactSmoothing.value,
        reactGain: reactGain.value,
        reactEasing: reactEasing.value,
        reactBeatBoost: reactBeatBoost.value,
        reactPhase: reactPhase.value,
        imageId: visualizerImageId.value,
        ...ledConfig.value,
      })
    }
  }

  // Single-Modus aus aktivem Layer synchronisieren
  function syncSingleModeFromLayer() {
    if (activeLayer.value) {
      selectedVisualizer.value = activeLayer.value.visualizerId
      visualizerColor.value = activeLayer.value.color
      visualizerOpacity.value = activeLayer.value.opacity
      colorOpacity.value = activeLayer.value.colorOpacity
      visualizerX.value = activeLayer.value.x
      visualizerY.value = activeLayer.value.y
      visualizerScale.value = activeLayer.value.scale
      visualizerShape.value = normalizeVisualizerShape(activeLayer.value.shape)
      reactSource.value = activeLayer.value.reactSource || DEFAULT_REACT_SOURCE
      reactStrength.value = activeLayer.value.reactStrength ?? DEFAULT_REACT_STRENGTH
      reactSmoothing.value = normalizeReactSmoothing(activeLayer.value.reactSmoothing)
      reactGain.value = normalizeReactGain(activeLayer.value.reactGain)
      reactEasing.value = normalizeReactEasing(activeLayer.value.reactEasing)
      reactBeatBoost.value = normalizeReactBeatBoost(activeLayer.value.reactBeatBoost)
      reactPhase.value = normalizeReactPhase(activeLayer.value.reactPhase)
      visualizerImageId.value = activeLayer.value.imageId || null
      applyLedConfig(activeLayer.value)
    }
  }

  return {
    visualizerLayers,
    activeLayerId,
    activeLayer,
    visibleLayers,
    layerCount,
    // Layer-Funktionen
    setMultiLayerMode,
    addLayer,
    createLayer,
    removeLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    selectLayer,
    updateLayerProperty,
    updateLayerEffect,
    resetLayerEffects,
    createLayerEffects,
    layerEffects,
    layerPostFxConfig,
    updateLayer,
    toggleLayerVisibility,
    clearAllLayers,
    syncLayerFromSingleMode,
    syncSingleModeFromLayer,
  }
}

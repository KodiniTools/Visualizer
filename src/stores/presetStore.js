import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useVisualizerStore } from './visualizerStore.js'
import { resolveVisualizerId } from '../lib/visualizers/aliases.js'

const USER_PRESETS_KEY = 'visualizer-user-presets'

/**
 * Baut einen Layer für ein Multi-Layer-Preset. Ergänzt die Standardwerte, die
 * createLayer() im Visualizer-Store ebenfalls setzt, damit gespeicherte und
 * eingebaute Layer dieselbe Form haben.
 * @param {string} id - eindeutige Layer-ID innerhalb des Presets
 * @param {string} visualizerId
 * @param {object} overrides - color, opacity, blendMode, scale, reactSource …
 *
 * Hinweis: `scale` unter 1.0 vermeiden. Ein verkleinerter Layer zeichnet seine
 * eigene Fläche kleiner als das Canvas, wodurch deren Rand als sichtbares
 * Rechteck über den darunter liegenden Layern erscheint. Werte über 1.0 sind
 * unproblematisch (der Layer wird beschnitten).
 */
function layer(id, visualizerId, overrides = {}) {
  return {
    id,
    visualizerId,
    visible: true,
    color: '#6ea8fe',
    opacity: 1.0,
    colorOpacity: 1.0,
    x: 0.5,
    y: 0.5,
    scale: 1.0,
    blendMode: 'source-over',
    reactSource: 'spectrum',
    reactStrength: 70,
    imageId: null,
    ...overrides,
  }
}

/**
 * Erzeugt ein eingebautes Multi-Layer-Preset. `selectedVisualizer` zeigt auf
 * den prägenden Layer, damit Kachel und Single-Modus einen sinnvollen Wert
 * haben, wenn das Preset nur teilweise angewendet wird.
 */
function multiPreset({ id, name, emoji, color, background, layers }) {
  return {
    id,
    name,
    builtIn: true,
    emoji,
    visualizer: {
      mode: 'multi',
      multiLayerMode: true,
      selectedVisualizer: layers[0].visualizerId,
      color,
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
      reactSource: 'spectrum',
      reactStrength: 70,
      layers,
    },
    background,
  }
}

export const BUILT_IN_PRESETS = [
  {
    id: 'builtin-neon-dark',
    name: 'Neon Dark',
    builtIn: true,
    emoji: '💚',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glNeonGrid',
      color: '#00ff88',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#0a0a0a',
      opacity: 1.0,
      gradientEnabled: false,
      gradientColor2: '#1a1a2e',
    },
  },
  {
    id: 'builtin-cosmic-purple',
    name: 'Cosmic Purple',
    builtIn: true,
    emoji: '🌌',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glGalaxy',
      color: '#aa44ff',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#08001a',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#1a0033',
    },
  },
  {
    id: 'builtin-ocean-waves',
    name: 'Ocean Waves',
    builtIn: true,
    emoji: '🌊',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glAurora',
      color: '#00c8ff',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#001525',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#003355',
    },
  },
  {
    id: 'builtin-fire',
    name: 'Fire Storm',
    builtIn: true,
    emoji: '🔥',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glFire',
      color: '#ff4400',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#0a0000',
      opacity: 1.0,
      gradientEnabled: false,
      gradientColor2: '#200000',
    },
  },
  {
    id: 'builtin-minimal-light',
    name: 'Minimal Light',
    builtIn: true,
    emoji: '⬜',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glBars',
      color: '#224488',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#ffffff',
      opacity: 1.0,
      gradientEnabled: false,
      gradientColor2: '#eeeeee',
    },
  },
  {
    id: 'builtin-matrix',
    name: 'Matrix',
    builtIn: true,
    emoji: '💻',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glRain',
      color: '#00ff00',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#000500',
      opacity: 1.0,
      gradientEnabled: false,
      gradientColor2: '#001000',
    },
  },
  {
    id: 'builtin-retro-arcade',
    name: 'Retro Arcade',
    builtIn: true,
    emoji: '🕹️',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glBarsMirrored',
      color: '#ffdd00',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#1a0033',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#330066',
    },
  },
  {
    id: 'builtin-crystal',
    name: 'Crystal',
    builtIn: true,
    emoji: '💎',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glVoronoi',
      color: '#00eeff',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#040815',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#080830',
    },
  },
  {
    id: 'builtin-mandala',
    name: 'Mandala',
    builtIn: true,
    emoji: '🌸',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glMandala',
      color: '#c9984d',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#0d0618',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#1a0a28',
    },
  },
  {
    id: 'builtin-heartbeat',
    name: 'Heartbeat',
    builtIn: true,
    emoji: '❤️',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glRings',
      color: '#ff2244',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#0a0002',
      opacity: 1.0,
      gradientEnabled: false,
      gradientColor2: '#1a000a',
    },
  },
  {
    id: 'builtin-particle-storm',
    name: 'Particle Storm',
    builtIn: true,
    emoji: '✨',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glParticles',
      color: '#ff88ff',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#000510',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#050020',
    },
  },
  {
    id: 'builtin-hex-grid',
    name: 'Hex Grid',
    builtIn: true,
    emoji: '🔷',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'glNeonGrid',
      color: '#44ff88',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      showVisualizer: true,
    },
    background: {
      color: '#001a0a',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#003318',
    },
  },

  // ═══════════════ Multi-Layer-Vorlagen (mehrere Effekte übereinander) ═══════════════
  // Reihenfolge der Layer: Index 0 liegt unten, weitere Layer darüber.
  multiPreset({
    id: 'builtin-nebula-drift',
    name: 'Nebula Drift',
    emoji: '🌠',
    color: '#b488ff',
    background: {
      color: '#05001a',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#1a0033',
    },
    layers: [
      layer('nebula-1', 'glGalaxy', { color: '#8844ff', scale: 1.15 }),
      layer('nebula-2', 'glParticles', {
        color: '#66e0ff',
        blendMode: 'screen',
        opacity: 0.75,
        reactSource: 'treble',
      }),
      layer('nebula-3', 'glLightRays', {
        color: '#ffd0ff',
        blendMode: 'screen',
        opacity: 0.45,
        reactSource: 'bassOnset',
        reactStrength: 85,
      }),
    ],
  }),
  multiPreset({
    id: 'builtin-laser-club',
    name: 'Laser Club',
    emoji: '🔺',
    color: '#ff2fb0',
    background: {
      color: '#0a0012',
      opacity: 1.0,
      gradientEnabled: false,
      gradientColor2: '#22003a',
    },
    layers: [
      layer('laser-1', 'glLaserGrid', { color: '#ff2fb0', opacity: 0.9 }),
      layer('laser-2', 'glLaserFan', {
        color: '#28e7ff',
        blendMode: 'screen',
        reactSource: 'bassOnset',
        reactStrength: 90,
      }),
      layer('laser-3', 'glStageLights', {
        color: '#ffb347',
        blendMode: 'screen',
        opacity: 0.6,
        reactSource: 'allOnset',
        reactStrength: 80,
      }),
    ],
  }),
  multiPreset({
    id: 'builtin-deep-ocean',
    name: 'Deep Ocean',
    emoji: '🐋',
    color: '#19d3c5',
    background: {
      color: '#001522',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#003a4d',
    },
    layers: [
      layer('ocean-1', 'glAuroraLake', { color: '#19d3c5', scale: 1.1 }),
      layer('ocean-2', 'glWaveform', {
        color: '#8fe8ff',
        blendMode: 'screen',
        opacity: 0.8,
        y: 0.62,
        reactSource: 'mid',
      }),
      layer('ocean-3', 'glParticles', {
        color: '#9fe8ff',
        blendMode: 'screen',
        opacity: 0.35,
        reactSource: 'treble',
        reactStrength: 55,
      }),
    ],
  }),
  multiPreset({
    id: 'builtin-volcano',
    name: 'Volcano',
    emoji: '🌋',
    color: '#ff6a00',
    background: {
      color: '#120000',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#3d0d00',
    },
    layers: [
      layer('volcano-1', 'glFire', { color: '#ff6a00' }),
      layer('volcano-2', 'glLightRays', {
        color: '#ff7a1e',
        blendMode: 'screen',
        opacity: 0.45,
        reactSource: 'bassOnset',
        reactStrength: 90,
      }),
      layer('volcano-3', 'glFireworksFountain', {
        color: '#ffb347',
        blendMode: 'screen',
        opacity: 0.85,
        reactSource: 'bassOnset',
        reactStrength: 90,
      }),
    ],
  }),
  multiPreset({
    id: 'builtin-synthwave',
    name: 'Synthwave',
    emoji: '🛸',
    color: '#ff37c8',
    background: {
      color: '#1a0033',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#4b0082',
    },
    layers: [
      layer('synth-1', 'glNeonGrid', { color: '#ff37c8' }),
      layer('synth-2', 'glRings', {
        color: '#ff9a3c',
        blendMode: 'screen',
        opacity: 0.75,
        y: 0.38,
        reactSource: 'bass',
      }),
      layer('synth-3', 'glStrings', {
        color: '#31e6ff',
        blendMode: 'screen',
        opacity: 0.55,
        reactSource: 'mid',
      }),
    ],
  }),
  multiPreset({
    id: 'builtin-crystal-cave',
    name: 'Crystal Cave',
    emoji: '💠',
    color: '#31e6ff',
    background: {
      color: '#04121a',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#0b2e3d',
    },
    layers: [
      layer('crystal-1', 'glVoronoi', { color: '#31e6ff', opacity: 0.9 }),
      layer('crystal-2', 'glFlowerOfLife', {
        color: '#b07bff',
        blendMode: 'screen',
        opacity: 0.6,
        reactSource: 'mid',
      }),
      layer('crystal-3', 'glParticles', {
        color: '#bff5ff',
        blendMode: 'screen',
        opacity: 0.4,
        reactSource: 'trebleOnset',
        reactStrength: 60,
      }),
    ],
  }),
  multiPreset({
    id: 'builtin-disco-night',
    name: 'Disco Night',
    emoji: '🪩',
    color: '#ffd34a',
    background: {
      color: '#0c0010',
      opacity: 1.0,
      gradientEnabled: false,
      gradientColor2: '#2a0030',
    },
    layers: [
      layer('disco-1', 'glDiscoFloor', { color: '#ff4fd8' }),
      layer('disco-2', 'glDiscoRays', {
        color: '#7cf3ff',
        blendMode: 'screen',
        opacity: 0.7,
        reactSource: 'bass',
      }),
      layer('disco-3', 'glDiscoBall', {
        color: '#ffd34a',
        blendMode: 'screen',
        reactSource: 'allOnset',
        reactStrength: 85,
      }),
    ],
  }),
  multiPreset({
    id: 'builtin-aurora-sky',
    name: 'Aurora Sky',
    emoji: '🌌',
    color: '#4dffa6',
    background: {
      color: '#00121a',
      opacity: 1.0,
      gradientEnabled: true,
      gradientColor2: '#002438',
    },
    layers: [
      layer('aurora-1', 'glAuroraCurtain', { color: '#4dffa6' }),
      layer('aurora-2', 'glAuroraBands', {
        color: '#39c6ff',
        blendMode: 'screen',
        opacity: 0.7,
        scale: 1.05,
        reactSource: 'mid',
      }),
      layer('aurora-3', 'glAuroraCorona', {
        color: '#7cf3ff',
        blendMode: 'screen',
        opacity: 0.5,
        reactSource: 'treble',
        reactStrength: 45,
      }),
    ],
  }),
]

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
        showVisualizer: vizStore.showVisualizer,
        reactSource: vizStore.reactSource,
        reactStrength: vizStore.reactStrength,
        imageId: vizStore.visualizerImageId,
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
        ...l,
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
      vizStore.showVisualizer = v.showVisualizer ?? true
      vizStore.setReactSource(v.reactSource ?? 'spectrum')
      vizStore.setReactStrength(v.reactStrength ?? 70)
      vizStore.setVisualizerImageId(v.imageId ?? null)
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

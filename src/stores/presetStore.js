import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useVisualizerStore } from './visualizerStore.js'

const USER_PRESETS_KEY = 'visualizer-user-presets'

export const BUILT_IN_PRESETS = [
  {
    id: 'builtin-neon-dark',
    name: 'Neon Dark',
    builtIn: true,
    emoji: '💚',
    visualizer: {
      mode: 'single',
      selectedVisualizer: 'neonGrid',
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
      selectedVisualizer: 'spiralGalaxy',
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
      selectedVisualizer: 'fluidWaves',
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
      selectedVisualizer: 'audioFire',
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
      selectedVisualizer: 'bars',
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
      selectedVisualizer: 'digitalRain',
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
      selectedVisualizer: 'arcadeBlocks',
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
      selectedVisualizer: 'liquidCrystals',
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
      selectedVisualizer: 'bloomingMandala',
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
      selectedVisualizer: 'heartbeat',
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
      selectedVisualizer: 'particleStorm',
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
      selectedVisualizer: 'hexagonGrid',
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
      vizStore.visualizerLayers = v.layers.map((l) => ({ ...l }))
      if (v.layers.length > 0) vizStore.activeLayerId = v.layers[0].id
    } else {
      vizStore.multiLayerMode = false
      vizStore.visualizerLayers = []
      vizStore.selectedVisualizer = v.selectedVisualizer
      vizStore.visualizerColor = v.color
      vizStore.visualizerOpacity = v.opacity ?? 1.0
      vizStore.colorOpacity = v.colorOpacity ?? 1.0
      vizStore.visualizerX = v.x ?? 0.5
      vizStore.visualizerY = v.y ?? 0.5
      vizStore.visualizerScale = v.scale ?? 1.0
      vizStore.showVisualizer = v.showVisualizer ?? true
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

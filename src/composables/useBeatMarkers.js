import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { usePlayerStore } from '../stores/playerStore.js'
import { useBeatMarkerStore } from '../stores/beatMarkerStore.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'
import { useBackgroundBridgeStore } from '../stores/backgroundBridgeStore.js'
import { formatTime, parseTimeInput } from '../utils/formatTime.js'

/**
 * Beat-marker management for the sticky player bar: the add/edit form state,
 * marker CRUD, progress-bar positioning, and the watchers that trigger
 * visualizer/color changes as playback crosses markers.
 *
 * @param {() => void} openMarkersPopover - opens the markers popover, so adding
 *   a marker (incl. via the "M" shortcut) reveals the form.
 */
export function useBeatMarkers(openMarkersPopover) {
  const { t } = useI18n()
  const playerStore = usePlayerStore()
  const beatMarkerStore = useBeatMarkerStore()
  const visualizerStore = useVisualizerStore()
  const backgroundBridge = useBackgroundBridgeStore()

  const showMarkerPanel = ref(false)
  const editingMarkerId = ref(null)
  const pendingMarkerTime = ref(0)
  const pendingMarkerTimeInput = ref('0:00')
  const newMarkerVisualizer = ref('')
  const newMarkerColor = ref('#6ea8fe')
  const newMarkerChangeColor = ref(false)
  const newMarkerChangeBackground = ref(false)
  const capturedBackground = ref(null)
  const newMarkerLabel = ref('')

  /**
   * Wendet die Hintergrund-Aktion eines ausgelösten Markers an (falls vorhanden).
   */
  const applyMarkerBackground = (action) => {
    if (action?.background) {
      backgroundBridge.applySnapshot(action.background)
      console.log('🎨 Hintergrund via Beat-Marker gewechselt')
    }
  }

  const updateMarkerTimeFromInput = () => {
    const seconds = parseTimeInput(pendingMarkerTimeInput.value)
    const maxTime = playerStore.duration || 0
    pendingMarkerTime.value = Math.max(0, Math.min(seconds, maxTime))
    pendingMarkerTimeInput.value = formatTime(pendingMarkerTime.value)
  }

  const getMarkerPosition = (time) => {
    if (playerStore.duration === 0) return 0
    return (time / playerStore.duration) * 100
  }

  const addMarkerAtCurrentTime = () => {
    editingMarkerId.value = null
    pendingMarkerTime.value = playerStore.currentTime
    pendingMarkerTimeInput.value = formatTime(playerStore.currentTime)
    newMarkerLabel.value = `Drop ${beatMarkerStore.markerCount + 1}`
    newMarkerVisualizer.value = ''
    newMarkerChangeColor.value = false
    newMarkerChangeBackground.value = false
    capturedBackground.value = null
    showMarkerPanel.value = true
    openMarkersPopover()
  }

  const startEditMarker = (marker) => {
    editingMarkerId.value = marker.id
    pendingMarkerTime.value = marker.time
    pendingMarkerTimeInput.value = formatTime(marker.time)
    newMarkerLabel.value = marker.label || ''
    newMarkerVisualizer.value = marker.action?.visualizer || ''
    newMarkerColor.value = marker.action?.color || '#6ea8fe'
    newMarkerChangeColor.value = !!marker.action?.color
    newMarkerChangeBackground.value = !!marker.action?.background
    capturedBackground.value = marker.action?.background || null
    showMarkerPanel.value = true
  }

  /**
   * Erfasst den aktuellen Hintergrund und speichert ihn für den Marker.
   * Aktiviert automatisch "Hintergrund ändern".
   */
  const captureCurrentBackground = () => {
    const snapshot = backgroundBridge.captureSnapshot()
    if (snapshot) {
      capturedBackground.value = snapshot
      newMarkerChangeBackground.value = true
      console.log('🎨 Aktueller Hintergrund für Marker erfasst')
    }
  }

  const confirmAddMarker = () => {
    let background = null
    if (newMarkerChangeBackground.value) {
      // Bereits erfassten Snapshot verwenden, sonst aktuellen Hintergrund erfassen
      background = capturedBackground.value || backgroundBridge.captureSnapshot()
    }

    const action = {
      type: 'combined',
      visualizer: newMarkerVisualizer.value || null,
      color: newMarkerChangeColor.value ? newMarkerColor.value : null,
      background: background,
    }
    if (editingMarkerId.value !== null) {
      beatMarkerStore.updateMarker(editingMarkerId.value, {
        time: pendingMarkerTime.value,
        label: newMarkerLabel.value,
        action: action,
      })
    } else {
      beatMarkerStore.addMarker(pendingMarkerTime.value, action, newMarkerLabel.value)
    }
    editingMarkerId.value = null
    showMarkerPanel.value = false
    capturedBackground.value = null
    newMarkerChangeBackground.value = false
  }

  const cancelAddMarker = () => {
    editingMarkerId.value = null
    showMarkerPanel.value = false
  }

  const seekToMarker = (time) => {
    playerStore.seekTo(time)
    beatMarkerStore.resetTriggers()
  }

  const removeMarker = (id) => {
    beatMarkerStore.removeMarker(id)
  }

  const clearAllMarkers = () => {
    if (confirm(t('player.confirmDeleteMarkers'))) {
      beatMarkerStore.clearAllMarkers()
    }
  }

  const getVisualizerName = (id) => {
    const allViz = visualizerStore.availableVisualizers
    const found = allViz.find((v) => v.id === id)
    return found ? found.name : id
  }

  // Watch for time changes to trigger markers
  watch(
    () => playerStore.currentTime,
    (newTime) => {
      if (!playerStore.isPlaying) return
      const triggered = beatMarkerStore.checkTrigger(newTime)
      if (triggered && triggered.action) {
        if (triggered.action.visualizer) {
          visualizerStore.selectVisualizer(triggered.action.visualizer)
          console.log('🎯 Visualizer gewechselt zu:', triggered.action.visualizer)
        }
        if (triggered.action.color) {
          visualizerStore.setColor(triggered.action.color)
          console.log('🎨 Farbe gewechselt zu:', triggered.action.color)
        }
        applyMarkerBackground(triggered.action)
      }
    },
  )

  // Reset markers when seeking (large time jump)
  watch(
    () => playerStore.currentTime,
    (newTime, oldTime) => {
      if (Math.abs(newTime - oldTime) > 1) {
        beatMarkerStore.resetTriggers()
      }
    },
  )

  // Check for markers at start (0:00) when playback begins
  watch(
    () => playerStore.isPlaying,
    (isPlaying) => {
      if (isPlaying && playerStore.currentTime < 0.5) {
        beatMarkerStore.resetTriggers()
        const triggered = beatMarkerStore.checkTrigger(playerStore.currentTime)
        if (triggered && triggered.action) {
          if (triggered.action.visualizer) {
            visualizerStore.selectVisualizer(triggered.action.visualizer)
            console.log('🎯 Start-Marker: Visualizer gewechselt zu:', triggered.action.visualizer)
          }
          if (triggered.action.color) {
            visualizerStore.setColor(triggered.action.color)
            console.log('🎨 Start-Marker: Farbe gewechselt zu:', triggered.action.color)
          }
          applyMarkerBackground(triggered.action)
        }
      }
    },
  )

  // Keyboard shortcut for adding marker (M key)
  const handleKeydown = (e) => {
    if (e.key === 'm' || e.key === 'M') {
      if (!e.target.matches('input, textarea, select')) {
        e.preventDefault()
        if (playerStore.hasTracks) {
          addMarkerAtCurrentTime()
        }
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    showMarkerPanel,
    editingMarkerId,
    pendingMarkerTimeInput,
    newMarkerVisualizer,
    newMarkerColor,
    newMarkerChangeColor,
    newMarkerChangeBackground,
    capturedBackground,
    newMarkerLabel,
    updateMarkerTimeFromInput,
    getMarkerPosition,
    addMarkerAtCurrentTime,
    startEditMarker,
    captureCurrentBackground,
    confirmAddMarker,
    cancelAddMarker,
    seekToMarker,
    removeMarker,
    clearAllMarkers,
    getVisualizerName,
  }
}

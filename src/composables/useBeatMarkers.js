import { ref, watch, onMounted, onUnmounted, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { usePlayerStore } from '../stores/playerStore.js'
import { useBeatMarkerStore } from '../stores/beatMarkerStore.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'
import { useBackgroundBridgeStore } from '../stores/backgroundBridgeStore.js'
import { useMarkerTransitionStore } from '../stores/markerTransitionStore.js'
import { formatTime, parseTimeInput } from '../utils/formatTime.js'
import { resolveBackgroundPreset } from '../utils/backgroundPresets.js'

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
  const markerTransition = useMarkerTransitionStore()

  // Canvas-Manager (bereitgestellt von VisualizerApp). Wird für die
  // Text-Steuerung der Marker benötigt: Texte werden zum Marker-Zeitpunkt
  // eingeblendet. Kann null sein, solange der Canvas noch nicht bereit ist.
  const canvasManager = inject('canvasManager', ref(null))

  const showMarkerPanel = ref(false)
  const editingMarkerId = ref(null)
  const pendingMarkerTime = ref(0)
  const pendingMarkerTimeInput = ref('0:00')
  const newMarkerVisualizer = ref('')
  const newMarkerColor = ref('#6ea8fe')
  const newMarkerChangeColor = ref(false)
  // Visualizer-Zustand, den dieser Marker erzwingt: true = anzeigen,
  // false = ausblenden (nur Hintergrund + Audio-Reaktiv). Immer wirksam.
  const newMarkerShowVisualizer = ref(true)
  // Ausgewählter Hintergrund pro Marker (Dropdown-Key, z.B. 'user:123' oder
  // 'builtin:neon-dark'; '' = kein Wechsel). Unabhängig vom Live-Hintergrund –
  // genau wie die Visualizer-Auswahl.
  const newMarkerBackgroundKey = ref('')
  // Ausgewählter Text pro Marker (Text-ID aus dem Text-Verzeichnis; '' = kein
  // Text). Der zugewiesene Text erscheint zum Marker-Zeitpunkt auf dem Canvas.
  const newMarkerTextId = ref('')
  const newMarkerLabel = ref('')

  // ══════════════════ Text-Steuerung über Marker ══════════════════
  // Gemerkte Original-Deckkraft der von Markern gesteuerten Texte. Beim Start
  // der Wiedergabe werden zugewiesene Texte ausgeblendet und erscheinen erst
  // zum jeweiligen Marker-Zeitpunkt; beim Zurücksetzen wird die ursprüngliche
  // Deckkraft wiederhergestellt.
  const markerTextOriginalOpacity = new Map()

  /** Alle Text-Objekte des Canvas (stabil nach Erstellungsreihenfolge sortiert). */
  const orderedTextObjects = () => {
    const objs = canvasManager.value?.textManager?.textObjects || []
    return [...objs].sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
  }

  /**
   * Liste der Texte für das Marker-Dropdown (Nummer + Vorschau des Inhalts).
   * Spiegelt die Nummerierung des Text-Verzeichnisses wider.
   */
  const getMarkerTexts = () => {
    return orderedTextObjects().map((o, i) => ({
      id: o.id,
      number: i + 1,
      content: (o.content || '').replace(/\s+/g, ' ').trim().slice(0, 30),
    }))
  }

  const findText = (id) => orderedTextObjects().find((o) => o.id === id) || null

  /** IDs aller Texte, die aktuell irgendeinem Marker zugewiesen sind. */
  const referencedTextIds = () => {
    const ids = new Set()
    for (const m of beatMarkerStore.markers) {
      const tid = m.action?.textId
      if (tid !== undefined && tid !== null && tid !== '') ids.add(tid)
    }
    return ids
  }

  /**
   * Setzt den Animations-Zustand eines Textes vollständig zurück, sodass alle
   * Animationen (Typewriter, Fade, Scale, Slide) ab dem Marker-Zeitpunkt neu
   * abgespielt werden.
   */
  const restartTextAnimation = (obj) => {
    if (!obj?.animation) return
    obj.animation._state = {
      startTime: null,
      isPlaying: false,
      currentIndex: 0,
      fadeStartTime: null,
      fadePhase: null,
      scaleStartTime: null,
      slideStartTime: null,
    }
  }

  /**
   * Blendet zu Beginn der Wiedergabe alle einem Marker zugewiesenen Texte aus,
   * damit sie erst zum jeweiligen Marker-Zeitpunkt erscheinen. Die
   * ursprüngliche Deckkraft wird gemerkt.
   */
  const activateTextMarkers = () => {
    const ids = referencedTextIds()
    if (ids.size === 0) return
    orderedTextObjects().forEach((o) => {
      if (!ids.has(o.id)) return
      if (!markerTextOriginalOpacity.has(o.id)) {
        markerTextOriginalOpacity.set(o.id, o.opacity ?? 100)
      }
      o.opacity = 0
    })
    canvasManager.value?.redrawCallback?.()
  }

  /**
   * Stellt die ursprüngliche Deckkraft aller von Markern gesteuerten Texte
   * wieder her (z.B. beim Deaktivieren der Marker oder beim Zurückspulen).
   */
  const restoreTextMarkers = () => {
    if (markerTextOriginalOpacity.size === 0) return
    const objs = orderedTextObjects()
    for (const [id, op] of markerTextOriginalOpacity.entries()) {
      const o = objs.find((x) => x.id === id)
      if (o) o.opacity = op
    }
    markerTextOriginalOpacity.clear()
    canvasManager.value?.redrawCallback?.()
  }

  /**
   * Stellt die Deckkraft aller Texte wieder her, die keinem Marker mehr
   * zugewiesen sind (z.B. nach dem Löschen eines Markers oder dem Entfernen
   * der Text-Zuweisung).
   */
  const reconcileTextMarkers = () => {
    if (markerTextOriginalOpacity.size === 0) return
    const ids = referencedTextIds()
    const objs = orderedTextObjects()
    let changed = false
    for (const id of [...markerTextOriginalOpacity.keys()]) {
      if (ids.has(id)) continue
      const o = objs.find((x) => x.id === id)
      if (o) o.opacity = markerTextOriginalOpacity.get(id)
      markerTextOriginalOpacity.delete(id)
      changed = true
    }
    if (changed) canvasManager.value?.redrawCallback?.()
  }

  /**
   * Wendet die Text-Aktion eines ausgelösten Markers an: Der zugewiesene Text
   * erscheint mit seinen Einstellungen auf dem Canvas (Deckkraft + Animation
   * neu starten), alle anderen von Markern gesteuerten Texte werden
   * ausgeblendet.
   */
  const applyTextAction = (action) => {
    const tid = action?.textId
    if (tid === undefined || tid === null || tid === '') return
    const target = findText(tid)
    if (!target) return

    const ids = referencedTextIds()
    orderedTextObjects().forEach((o) => {
      if (o.id === tid || !ids.has(o.id)) return
      if (!markerTextOriginalOpacity.has(o.id)) {
        markerTextOriginalOpacity.set(o.id, o.opacity ?? 100)
      }
      o.opacity = 0
    })

    // Zieltext sichtbar machen: gemerkte Original-Deckkraft bevorzugen, sonst
    // die aktuelle (falls > 0) bzw. voll sichtbar.
    let visible = 100
    if (markerTextOriginalOpacity.has(tid)) {
      visible = markerTextOriginalOpacity.get(tid)
    } else if (target.opacity && target.opacity > 0) {
      visible = target.opacity
    }
    target.opacity = visible > 0 ? visible : 100
    restartTextAnimation(target)
    canvasManager.value?.redrawCallback?.()
  }

  /**
   * Wendet die Hintergrund-Aktion eines ausgelösten Markers an (falls vorhanden).
   */
  const applyMarkerBackground = (action) => {
    if (!action) return
    // Preset bevorzugt frisch anhand des Keys auflösen (spiegelt aktuelle
    // Presets wider); sonst den im Marker gespeicherten Snapshot verwenden.
    let snapshot = action.background
    if (action.backgroundKey) {
      const resolved = resolveBackgroundPreset(action.backgroundKey)
      if (resolved?.snapshot) snapshot = resolved.snapshot
    }
    if (snapshot) {
      backgroundBridge.applySnapshot(snapshot)
      console.log('🎨 Hintergrund via Beat-Marker gewechselt')
    }
  }

  /**
   * Wendet alle Änderungen eines Markers an (Visualizer, Farbe, Hintergrund).
   */
  const applyMarkerAction = (action) => {
    if (!action) return

    // Jeder Marker erzwingt den Visualizer-Zustand explizit.
    // Rückwärtskompatibel zum alten Feld `hideVisualizer`.
    const showVisualizer =
      action.visualizerVisible !== undefined ? action.visualizerVisible : !action.hideVisualizer

    if (showVisualizer) {
      if (action.visualizer) {
        visualizerStore.selectVisualizer(action.visualizer)
        console.log('🎯 Visualizer gewechselt zu:', action.visualizer)
      }
      visualizerStore.showVisualizer = true
    } else {
      // Visualizer ausblenden – an diesem Marker läuft nur der Hintergrund
      visualizerStore.showVisualizer = false
      console.log('🚫 Visualizer via Beat-Marker ausgeblendet')
    }

    if (action.color) {
      visualizerStore.setColor(action.color)
      console.log('🎨 Farbe gewechselt zu:', action.color)
    }
    applyMarkerBackground(action)
    applyTextAction(action)
  }

  /**
   * Führt einen ausgelösten Marker aus. Ist der Crossfade aktiviert, wird der
   * aktuelle (alte) Frame kurz eingefroren, dann die Änderung angewendet und der
   * alte Frame über der neuen Szene ausgeblendet. Sonst wird sofort gewechselt.
   * @param {object} action
   * @param {boolean} allowTransition - false z.B. für den Start-Marker (0:00)
   */
  const runMarkerTrigger = (action, allowTransition = true) => {
    if (!action) return
    if (allowTransition && markerTransition.enabled) {
      // 1) Capture-Fenster öffnen: Renderer friert den alten Frame ein
      markerTransition.beginCapture()
      // 2) Nach dem Capture-Fenster: Änderung anwenden und Ausblenden starten
      setTimeout(() => {
        applyMarkerAction(action)
        markerTransition.startFade()
      }, markerTransition.captureMs)
    } else {
      applyMarkerAction(action)
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
    newMarkerShowVisualizer.value = true
    newMarkerBackgroundKey.value = ''
    newMarkerTextId.value = ''
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
    newMarkerShowVisualizer.value =
      marker.action?.visualizerVisible !== undefined
        ? marker.action.visualizerVisible
        : !marker.action?.hideVisualizer
    newMarkerBackgroundKey.value = marker.action?.backgroundKey || ''
    newMarkerTextId.value = marker.action?.textId ?? ''
    showMarkerPanel.value = true
  }

  const confirmAddMarker = () => {
    // Hintergrund wird wie der Visualizer per Auswahl festgelegt und beim
    // Speichern zu einem eigenständigen Snapshot aufgelöst. Die Live-Ansicht
    // bleibt unberührt – der Wechsel passiert erst beim Abspielen am Marker.
    let background = null
    let backgroundKey = null
    let backgroundLabel = null
    if (newMarkerBackgroundKey.value) {
      const resolved = resolveBackgroundPreset(newMarkerBackgroundKey.value)
      if (resolved) {
        background = resolved.snapshot
        backgroundKey = resolved.key
        backgroundLabel = resolved.label
      }
    }

    // Zugewiesenen Text (aus dem Text-Verzeichnis) als eigenständige Aktion
    // speichern. Der Text erscheint zum Marker-Zeitpunkt auf dem Canvas.
    let textId = null
    let textLabel = null
    if (newMarkerTextId.value !== '' && newMarkerTextId.value !== null) {
      textId = newMarkerTextId.value
      const txt = getMarkerTexts().find((tt) => tt.id === textId)
      if (txt) textLabel = txt.content ? txt.content : `#${txt.number}`
    }

    const action = {
      type: 'combined',
      visualizer: newMarkerVisualizer.value || null,
      color: newMarkerChangeColor.value ? newMarkerColor.value : null,
      visualizerVisible: newMarkerShowVisualizer.value,
      background: background,
      backgroundKey: backgroundKey,
      backgroundLabel: backgroundLabel,
      textId: textId,
      textLabel: textLabel,
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
    newMarkerBackgroundKey.value = ''
    newMarkerTextId.value = ''
    // Texte, die keinem Marker mehr zugewiesen sind, wieder einblenden.
    reconcileTextMarkers()
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
    // Text des gelöschten Markers ggf. wieder einblenden.
    reconcileTextMarkers()
  }

  const clearAllMarkers = () => {
    if (confirm(t('player.confirmDeleteMarkers'))) {
      beatMarkerStore.clearAllMarkers()
      restoreTextMarkers()
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
        runMarkerTrigger(triggered.action, true)
      }
    },
  )

  // Reset markers when seeking (large time jump)
  watch(
    () => playerStore.currentTime,
    (newTime, oldTime) => {
      if (Math.abs(newTime - oldTime) > 1) {
        beatMarkerStore.resetTriggers()
        // Beim Zurückspulen an den Anfang die von Markern gesteuerten Texte
        // wieder einblenden (Marker blenden sie beim nächsten Start erneut aus).
        if (newTime < 0.5) restoreTextMarkers()
      }
    },
  )

  // Check for markers at start (0:00) when playback begins
  watch(
    () => playerStore.isPlaying,
    (isPlaying) => {
      if (isPlaying && playerStore.currentTime < 0.5) {
        beatMarkerStore.resetTriggers()
        // Zugewiesene Texte ausblenden, damit sie erst zum jeweiligen
        // Marker-Zeitpunkt erscheinen.
        activateTextMarkers()
        const triggered = beatMarkerStore.checkTrigger(playerStore.currentTime)
        if (triggered && triggered.action) {
          // Start-Marker (0:00): sofort anwenden, ohne Übergang (nichts zum Ausblenden)
          runMarkerTrigger(triggered.action, false)
        }
      }
    },
  )

  // Marker deaktiviert → von Markern gesteuerte Texte wieder einblenden.
  watch(
    () => beatMarkerStore.markersEnabled,
    (enabled) => {
      if (!enabled) restoreTextMarkers()
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
    // Von Markern ausgeblendete Texte beim Verlassen wiederherstellen.
    restoreTextMarkers()
  })

  return {
    showMarkerPanel,
    editingMarkerId,
    pendingMarkerTimeInput,
    newMarkerVisualizer,
    newMarkerColor,
    newMarkerChangeColor,
    newMarkerShowVisualizer,
    newMarkerBackgroundKey,
    newMarkerTextId,
    newMarkerLabel,
    getMarkerTexts,
    updateMarkerTimeFromInput,
    getMarkerPosition,
    addMarkerAtCurrentTime,
    startEditMarker,
    confirmAddMarker,
    cancelAddMarker,
    seekToMarker,
    removeMarker,
    clearAllMarkers,
    getVisualizerName,
  }
}

import { ref, watch, onMounted, onUnmounted, inject, toRaw } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { usePlayerStore } from '../stores/playerStore.js'
import { useBeatMarkerStore } from '../stores/beatMarkerStore.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'
import { useBackgroundBridgeStore } from '../stores/backgroundBridgeStore.js'
import { useMarkerTransitionStore } from '../stores/markerTransitionStore.js'
import { useLayerPresetStore, parseLayerPresetRef } from '../stores/layerPresetStore.js'
import { formatTimePrecise, parseTimeInput, roundToHundredths } from '../utils/formatTime.js'
import { resolveBackgroundPreset } from '../utils/backgroundPresets.js'
import { useHistoryStore } from '../stores/historyStore.js'
import { getHistoryRecorder } from '../lib/history/historyRecorder.js'
import { useShapeStore } from '../stores/shapeStore.js'
import { SHAPE_CATEGORIES, SHAPE_GALLERY } from '../lib/shapes/shapes.js'
import { useImageGallery } from './useImageGallery.js'
import {
  captureBackgroundImageDefaults,
  captureBaseBackground,
  findGalleryImage,
  resolveBackgroundImageDefaults,
  restoreBaseBackground,
  setBackgroundImageWithDefaults,
} from '../lib/background/markerBackgroundImage.js'

// Marker-Hintergründe laden Bilder/Videos per Callback nach → Baseline nach
// dieser Zeit erneut übernehmen, damit sie nicht im nächsten Nutzer-Schritt landen.
const MARKER_MEDIA_SETTLE_MS = 3000

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
  const layerPresetStore = useLayerPresetStore()
  const shapeStore = useShapeStore()
  const { imageGallery } = useImageGallery()
  // Marker-Aktionen während der Wiedergabe sind keine Nutzer-Bearbeitungen →
  // am globalen Undo/Redo-Verlauf vorbei ausführen.
  const historyRecorder = getHistoryRecorder(useHistoryStore())

  // Canvas-Manager (bereitgestellt von VisualizerApp). Wird für die
  // Text-Steuerung der Marker benötigt: Texte werden zum Marker-Zeitpunkt
  // eingeblendet. Kann null sein, solange der Canvas noch nicht bereit ist.
  const canvasManager = inject('canvasManager', ref(null))

  const showMarkerPanel = ref(false)
  const editingMarkerId = ref(null)
  const pendingMarkerTime = ref(0)
  const pendingMarkerTimeInput = ref('0:00.00')
  // Schrittweite des Zeit-Spinners in Sekunden (0.01 = langsam/fein, 1 = schnell/grob)
  const markerTimeStep = ref(0.01)
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
  // Ausgewählte Form pro Marker (Form-ID aus „Formen & Symbole“; '' = keine).
  // Die Form erscheint zum Marker-Zeitpunkt auf dem Canvas.
  const newMarkerShapeId = ref('')
  // Hintergrund-Bild pro Marker (Galerie-Bild-ID; '' = kein Wechsel). Übernimmt
  // beim Auslösen Audio-Reaktiv und Format (Workspace/Normal) vom vorherigen
  // Hintergrund-Bild.
  const newMarkerBgImageId = ref('')
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
  const activateTextMarkers = () => historyRecorder.absorb(() => activateTextMarkersNow())
  const activateTextMarkersNow = () => {
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
  const restoreTextMarkers = () => historyRecorder.absorb(() => restoreTextMarkersNow())
  const restoreTextMarkersNow = () => {
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
  const reconcileTextMarkers = () => historyRecorder.absorb(() => reconcileTextMarkersNow())
  const reconcileTextMarkersNow = () => {
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

  // ══════════════════ Formen-Steuerung über Marker ══════════════════
  // Wie bei Texten: Zugewiesene Formen (Formen & Symbole) werden beim Start der
  // Wiedergabe ausgeblendet und erscheinen erst zum jeweiligen Marker-Zeitpunkt.
  // Das Ausblenden ist reiner Laufzeit-Zustand im shapeStore (markerHiddenIds)
  // und gehört nicht zum Undo/Redo-Verlauf.

  /** Anzeigename einer Form (Galerie-Eintrag, sonst Formtyp) */
  const shapeDisplayName = (shape) =>
    SHAPE_GALLERY.some((g) => g.id === shape.galleryId)
      ? t(`shapes.items.${shape.galleryId}`)
      : shape.type

  /**
   * Liste der Formen für das Marker-Dropdown (Nummer in Einfüge-Reihenfolge
   * der Ebenen + Name; Emojis mit Zeichen, Formen mit Text mit Vorschau).
   */
  const getMarkerShapes = () =>
    shapeStore.shapes.map((s, i) => {
      const extra =
        s.type === 'emoji'
          ? String(s.emoji ?? '')
          : String(s.text ?? '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 20)
      return { id: s.id, number: i + 1, name: shapeDisplayName(s), extra }
    })

  // Galerie-Einträge im Dropdown: Wert `gallery:<id>`; beim Speichern des
  // Markers wird daraus eine neue Form auf dem Canvas (Zeichenwerkzeuge
  // ausgenommen – sie fügen keine Form ein).
  const GALLERY_PREFIX = 'gallery:'

  /**
   * Galerie „Formen & Symbole“ für das Marker-Dropdown, nach Kategorien.
   * @returns {{ category: string, label: string, items: { value: string, name: string }[] }[]}
   */
  const getMarkerShapeGallery = () =>
    SHAPE_CATEGORIES.filter((c) => c !== 'draw')
      .map((category) => ({
        category,
        label: t(`shapes.categories.${category}`),
        items: SHAPE_GALLERY.filter((g) => g.category === category).map((g) => ({
          value: GALLERY_PREFIX + g.id,
          name:
            g.type === 'emoji' && g.preset?.emoji
              ? `${g.preset.emoji} ${t(`shapes.items.${g.id}`)}`
              : t(`shapes.items.${g.id}`),
        })),
      }))
      .filter((group) => group.items.length > 0)

  /** Canvas-Größe für neue Formen (Live-Canvas, sonst Bezugsgröße der Formen) */
  const shapeCanvasSize = () => {
    const c = canvasManager.value?.canvas
    if (c?.width && c?.height) return { width: c.width, height: c.height }
    const s = shapeStore.canvasSize
    return s.width && s.height ? s : { width: 1920, height: 1080 }
  }

  /**
   * Löst die Dropdown-Auswahl zu einer Form-ID auf. Ein Galerie-Eintrag legt
   * eine neue Form an (mittig, Standard-Stil; danach im Formen-Panel
   * bearbeitbar). @returns {string|null}
   */
  const resolveMarkerShapeSelection = (value) => {
    if (value === '' || value === null || value === undefined) return null
    if (typeof value === 'string' && value.startsWith(GALLERY_PREFIX)) {
      const { width, height } = shapeCanvasSize()
      const shape = shapeStore.addShape(value.slice(GALLERY_PREFIX.length), width, height)
      if (!shape) return null
      shapeStore.selectShape(null)
      return shape.id
    }
    return value
  }

  /** IDs aller Formen, die aktuell irgendeinem Marker zugewiesen sind. */
  const referencedShapeIds = () => {
    const ids = new Set()
    for (const m of beatMarkerStore.markers) {
      const sid = m.action?.shapeId
      if (sid !== undefined && sid !== null && sid !== '') ids.add(sid)
    }
    return ids
  }

  /** Wiedergabe-Start: zugewiesene Formen bis zu ihrem Marker ausblenden. */
  const activateShapeMarkers = () => {
    for (const id of referencedShapeIds()) shapeStore.setMarkerHidden(id, true)
  }

  /** Alle von Markern ausgeblendeten Formen wieder einblenden. */
  const restoreShapeMarkers = () => shapeStore.clearMarkerHidden()

  /** Formen einblenden, die keinem Marker mehr zugewiesen sind. */
  const reconcileShapeMarkers = () => {
    const ids = referencedShapeIds()
    for (const id of shapeStore.markerHiddenIds) {
      if (!ids.has(id)) shapeStore.setMarkerHidden(id, false)
    }
  }

  /**
   * Form-Aktion eines ausgelösten Markers: Die zugewiesene Form erscheint,
   * alle anderen von Markern gesteuerten Formen werden ausgeblendet. Ein
   * Marker ohne Form („Keine Form“) blendet alle Marker-Formen aus; Formen
   * ohne Marker-Zuweisung bleiben unberührt.
   */
  const applyShapeAction = (action) => {
    const raw = action?.shapeId
    const sid =
      raw !== undefined && raw !== null && raw !== '' && shapeStore.shapes.some((s) => s.id === raw)
        ? raw
        : null
    for (const id of referencedShapeIds()) {
      shapeStore.setMarkerHidden(id, id !== sid)
    }
  }

  // ══════════════════ Hintergrund-Bild aus der Galerie ══════════════════

  /** Bilder der eigenen Bildgalerie für das Marker-Dropdown */
  const getMarkerGalleryImages = () =>
    imageGallery.value.map((g, i) => ({ id: g.id, number: i + 1, name: g.name }))

  /**
   * Setzt das Galerie-Bild eines Markers als Hintergrund. Format und
   * Audio-Reaktiv stammen vom vorherigen (beim Auslösen sichtbaren)
   * Hintergrund-Bild, ersatzweise aus den beim Speichern gemerkten Vorgaben.
   * @param {object} action
   * @param {object|null} previous - vor allen Marker-Änderungen erfasste Vorgaben
   */
  // Hintergrund vor dem ersten Hintergrund-Bild-Marker eines Durchlaufs. Ein
  // späterer Marker ohne Hintergrund-Bild (und ohne Hintergrund-Preset) stellt
  // ihn wieder her, statt das Marker-Bild stehen zu lassen. Reiner
  // Laufzeit-Zustand, nicht im Verlauf.
  let bgImageBase = null

  const applyBackgroundImageAction = (action, previous, presetApplied = false) => {
    const ref = action?.backgroundImage
    if (!ref) {
      if (presetApplied) {
        // Das Preset dieses Markers bestimmt den Hintergrund.
        bgImageBase = null
      } else if (bgImageBase) {
        restoreBaseBackground(canvasManager.value, bgImageBase)
        bgImageBase = null
        console.log('🖼️ Hintergrund-Bild via Beat-Marker zurückgesetzt')
      }
      return
    }
    const entry = findGalleryImage(imageGallery.value, ref)
    if (!entry?.img) {
      console.warn('⚠️ Hintergrund-Bild des Markers nicht mehr in der Galerie:', ref.name)
      return
    }
    // Mit Preset gilt der Preset-Hintergrund als neue Basis, sonst bleibt die
    // Basis vom ersten Bild-Marker dieses Durchlaufs erhalten.
    if (presetApplied || !bgImageBase) bgImageBase = captureBaseBackground(canvasManager.value)
    const defaults = previous || resolveBackgroundImageDefaults(null, ref.defaults)
    const target = setBackgroundImageWithDefaults(canvasManager.value, toRaw(entry.img), defaults)
    console.log('🖼️ Hintergrund-Bild via Beat-Marker:', ref.name, `(${target})`)
  }

  /** Wiedergabe-Ende/Neustart: Hintergrund von vor den Bild-Markern zurück. */
  const restoreBackgroundImageMarkers = () =>
    historyRecorder.absorb(() => {
      if (bgImageBase) restoreBaseBackground(canvasManager.value, bgImageBase)
      bgImageBase = null
    })

  /**
   * Wendet die Hintergrund-Aktion eines ausgelösten Markers an (falls vorhanden).
   */
  const applyMarkerBackground = (action) => {
    if (!action) return false
    // Preset bevorzugt frisch anhand des Keys auflösen (spiegelt aktuelle
    // Presets wider); sonst den im Marker gespeicherten Snapshot verwenden.
    let snapshot = action.background
    if (action.backgroundKey) {
      const resolved = resolveBackgroundPreset(action.backgroundKey)
      if (resolved?.snapshot) snapshot = resolved.snapshot
    }
    // Mit Hintergrund-Bild aus der Galerie liefert das Preset nur Farbe,
    // Gradient, Audio-Reaktiv und Elemente – sein (asynchron geladenes) Bild
    // bzw. Video würde das Galerie-Bild sonst wieder überdecken.
    if (snapshot && action.backgroundImage) {
      snapshot = { ...snapshot, backgroundImage: null, backgroundVideo: null }
    }
    if (snapshot) {
      backgroundBridge.applySnapshot(snapshot)
      console.log('🎨 Hintergrund via Beat-Marker gewechselt')
      return true
    }
    return false
  }

  /**
   * Wendet alle Änderungen eines Markers an (Visualizer, Farbe, Hintergrund).
   */
  const applyMarkerAction = (action) =>
    historyRecorder.absorb(() => applyMarkerActionNow(action), {
      settleMs: MARKER_MEDIA_SETTLE_MS,
    })

  const applyMarkerActionNow = (action) => {
    if (!action) return
    // Vorgaben des vorherigen Hintergrund-Bildes erfassen, bevor ein
    // Hintergrund-Preset dieses Markers den Hintergrund ändert.
    const previousBgImage = action.backgroundImage
      ? resolveBackgroundImageDefaults(canvasManager.value, action.backgroundImage.defaults)
      : null

    // Jeder Marker erzwingt den Visualizer-Zustand explizit.
    // Rückwärtskompatibel zum alten Feld `hideVisualizer`.
    const showVisualizer =
      action.visualizerVisible !== undefined ? action.visualizerVisible : !action.hideVisualizer

    if (showVisualizer) {
      if (action.visualizer) {
        const presetId = parseLayerPresetRef(action.visualizer)
        if (presetId) {
          // Eigenes Layer-Preset: frisch aus dem Store, sonst der im Marker
          // gespeicherte Snapshot (Preset könnte inzwischen gelöscht sein).
          const preset = layerPresetStore.findLayerPreset(presetId) || action.layerPreset
          if (layerPresetStore.applyLayerPreset(preset)) {
            console.log('🎛️ Layer-Preset via Beat-Marker angewendet:', preset.name)
          } else {
            console.warn('⚠️ Layer-Preset des Markers nicht gefunden:', action.visualizer)
          }
        } else {
          // Einzelner Visualizer (selectVisualizer verlässt den Multi-Layer-Modus)
          visualizerStore.selectVisualizer(action.visualizer)
          console.log('🎯 Visualizer gewechselt zu:', action.visualizer)
        }
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
    const presetApplied = applyMarkerBackground(action)
    applyBackgroundImageAction(action, previousBgImage, presetApplied)
    applyTextAction(action)
    applyShapeAction(action)
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

  /**
   * Setzt die Marker-Zeit auf Hundertstel gerundet und auf [0, Trackdauer]
   * begrenzt; hält das Textfeld synchron.
   */
  const setPendingMarkerTime = (seconds) => {
    const maxTime = playerStore.duration || 0
    const clamped = Math.max(0, Math.min(roundToHundredths(seconds), maxTime))
    pendingMarkerTime.value = roundToHundredths(clamped)
    pendingMarkerTimeInput.value = formatTimePrecise(pendingMarkerTime.value)
  }

  const updateMarkerTimeFromInput = () => {
    setPendingMarkerTime(parseTimeInput(pendingMarkerTimeInput.value))
  }

  /**
   * Verschiebt die Marker-Zeit um die aktuelle Schrittweite.
   * @param {number} direction - +1 (vor) oder -1 (zurück)
   */
  const stepMarkerTime = (direction) => {
    const sign = direction < 0 ? -1 : 1
    setPendingMarkerTime(pendingMarkerTime.value + sign * markerTimeStep.value)
  }

  const getMarkerPosition = (time) => {
    if (playerStore.duration === 0) return 0
    return (time / playerStore.duration) * 100
  }

  const addMarkerAtCurrentTime = () => {
    editingMarkerId.value = null
    setPendingMarkerTime(playerStore.currentTime)
    newMarkerLabel.value = `Drop ${beatMarkerStore.markerCount + 1}`
    newMarkerVisualizer.value = ''
    newMarkerChangeColor.value = false
    newMarkerShowVisualizer.value = true
    newMarkerBackgroundKey.value = ''
    newMarkerTextId.value = ''
    newMarkerShapeId.value = ''
    newMarkerBgImageId.value = ''
    showMarkerPanel.value = true
    openMarkersPopover()
  }

  const startEditMarker = (marker) => {
    editingMarkerId.value = marker.id
    setPendingMarkerTime(marker.time)
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
    newMarkerShapeId.value = marker.action?.shapeId ?? ''
    newMarkerBgImageId.value = marker.action?.backgroundImage
      ? (findGalleryImage(imageGallery.value, marker.action.backgroundImage)?.id ?? '')
      : ''
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

    // Zugewiesene Form (Formen & Symbole) – erscheint zum Marker-Zeitpunkt.
    let shapeId = null
    let shapeLabel = null
    if (newMarkerShapeId.value !== '' && newMarkerShapeId.value !== null) {
      shapeId = resolveMarkerShapeSelection(newMarkerShapeId.value)
      const sh = getMarkerShapes().find((s) => s.id === shapeId)
      if (sh) shapeLabel = sh.extra ? `${sh.name} ${sh.extra}` : sh.name
    }

    // Hintergrund-Bild aus der Galerie: nur Verweis (id + Name) speichern, kein
    // Bildinhalt. Vorgaben des aktuellen Hintergrund-Bildes als Ersatz merken,
    // falls beim Auslösen kein Hintergrund-Bild zu sehen ist.
    let backgroundImage = null
    if (newMarkerBgImageId.value !== '' && newMarkerBgImageId.value !== null) {
      const entry = imageGallery.value.find((g) => g.id === newMarkerBgImageId.value)
      if (entry) {
        backgroundImage = {
          galleryId: entry.id,
          name: entry.name,
          defaults: captureBackgroundImageDefaults(canvasManager.value),
        }
      }
    }

    // Eigenes Layer-Preset: Snapshot mitspeichern, damit der Marker auch nach
    // dem Löschen des Presets noch funktioniert (analog zum Hintergrund).
    let layerPreset = null
    const presetId = parseLayerPresetRef(newMarkerVisualizer.value)
    if (presetId) {
      const found = layerPresetStore.findLayerPreset(presetId)
      if (found) {
        layerPreset = {
          id: found.id,
          name: found.name,
          layers: found.layers.map((l) => ({ ...l })),
        }
      }
    }

    const action = {
      type: 'combined',
      visualizer: newMarkerVisualizer.value || null,
      layerPreset: layerPreset,
      color: newMarkerChangeColor.value ? newMarkerColor.value : null,
      visualizerVisible: newMarkerShowVisualizer.value,
      background: background,
      backgroundKey: backgroundKey,
      backgroundLabel: backgroundLabel,
      textId: textId,
      textLabel: textLabel,
      shapeId: shapeId,
      shapeLabel: shapeLabel,
      backgroundImage: backgroundImage,
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
    newMarkerShapeId.value = ''
    newMarkerBgImageId.value = ''
    // Texte und Formen, die keinem Marker mehr zugewiesen sind, wieder einblenden.
    reconcileTextMarkers()
    reconcileShapeMarkers() // Läuft die Wiedergabe schon und liegt der Marker noch vor uns, erscheint
    // die Form erst zum Marker-Zeitpunkt (wie beim Start ab 0:00).
    if (shapeId && playerStore.isPlaying && pendingMarkerTime.value > playerStore.currentTime) {
      shapeStore.setMarkerHidden(shapeId, true)
    }
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
    // Text bzw. Form des gelöschten Markers ggf. wieder einblenden.
    reconcileTextMarkers()
    reconcileShapeMarkers()
  }

  const clearAllMarkers = () => {
    if (confirm(t('player.confirmDeleteMarkers'))) {
      beatMarkerStore.clearAllMarkers()
      restoreTextMarkers()
      restoreShapeMarkers()
      restoreBackgroundImageMarkers()
    }
  }

  const getVisualizerName = (id) => {
    const presetId = parseLayerPresetRef(id)
    if (presetId) {
      const preset = layerPresetStore.findLayerPreset(presetId)
      if (preset) return preset.name
      // Gelöschtes Preset: Name aus dem Marker-Snapshot verwenden
      const marker = beatMarkerStore.markers.find((m) => m.action?.visualizer === id)
      return marker?.action?.layerPreset?.name || id
    }
    const allViz = visualizerStore.availableVisualizers
    const found = allViz.find((v) => v.id === id)
    return found ? found.name : id
  }

  // ══════════════════ Frame-genaue Auslösung ══════════════════
  // Primärer Pfad: Die Render-Schleife meldet jeden Frame die präzise
  // Audio-Position. Ein Marker feuert genau dann, wenn seine Zeit zwischen
  // zwei Frames überschritten wurde (Crossing) – unabhängig von der Toleranz.
  // Sprünge (Seek) und Rückwärtsbewegungen setzen die Auslösung zurück.
  const SEEK_JUMP_SECONDS = 1
  // Solange in diesem Zeitfenster ein Frame kam, gilt die Schleife als aktiv
  // und der timeupdate-Fallback bleibt stumm.
  const FRAME_ALIVE_MS = 500
  let lastFrameTime = null
  let lastFrameAt = -Infinity

  const handleFrame = (time) => {
    lastFrameAt = performance.now()
    if (lastFrameTime === null) {
      lastFrameTime = time
      return
    }
    if (time < lastFrameTime || time - lastFrameTime > SEEK_JUMP_SECONDS) {
      // Rückwärts-Seek oder großer Sprung: nicht nachträglich feuern
      beatMarkerStore.resetTriggers()
      lastFrameTime = time
      return
    }
    const crossed = beatMarkerStore.checkCrossing(lastFrameTime, time)
    lastFrameTime = time
    for (const marker of crossed) {
      if (marker.action) runMarkerTrigger(marker.action, true)
    }
  }

  const isFrameLoopAlive = () => performance.now() - lastFrameAt < FRAME_ALIVE_MS

  // Fallback: timeupdate-basiert (~4x/s), nur wenn keine Frames ankommen
  // (z.B. Tab im Hintergrund, requestAnimationFrame pausiert). Nutzt dieselbe
  // Überschreitungs-Logik wie der Frame-Pfad, feuert also nie zu früh –
  // schlimmstenfalls um ein timeupdate-Intervall verspätet.
  watch(
    () => playerStore.currentTime,
    (newTime, oldTime) => {
      if (!playerStore.isPlaying || isFrameLoopAlive()) return
      if (typeof oldTime !== 'number') return
      // Sprünge übernimmt der Seek-Watcher unten (resetTriggers)
      if (newTime < oldTime || newTime - oldTime > SEEK_JUMP_SECONDS) return
      const crossed = beatMarkerStore.checkCrossing(oldTime, newTime)
      for (const marker of crossed) {
        if (marker.action) runMarkerTrigger(marker.action, true)
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
        if (newTime < 0.5) {
          restoreTextMarkers()
          restoreShapeMarkers()
          restoreBackgroundImageMarkers()
        }
      }
    },
  )

  // Check for markers at start (0:00) when playback begins
  watch(
    () => playerStore.isPlaying,
    (isPlaying) => {
      // Frame-Referenz auf die Startposition setzen, damit der erste Frame
      // Marker direkt hinter dem Startpunkt korrekt als überschritten erkennt.
      lastFrameTime = isPlaying ? playerStore.getPreciseTime() : null
      if (isPlaying && playerStore.currentTime < 0.5) {
        beatMarkerStore.resetTriggers()
        // Zugewiesene Texte ausblenden, damit sie erst zum jeweiligen
        // Marker-Zeitpunkt erscheinen.
        activateTextMarkers()
        activateShapeMarkers()
        const triggered = beatMarkerStore.checkTrigger(playerStore.currentTime)
        if (triggered && triggered.action) {
          // Start-Marker (0:00): sofort anwenden, ohne Übergang (nichts zum Ausblenden)
          runMarkerTrigger(triggered.action, false)
        }
      }
    },
  )

  // Marker deaktiviert → von Markern gesteuerte Texte und Formen wieder einblenden.
  watch(
    () => beatMarkerStore.markersEnabled,
    (enabled) => {
      if (!enabled) {
        restoreTextMarkers()
        restoreShapeMarkers()
        restoreBackgroundImageMarkers()
      }
    },
  )

  // Taste M (ohne Zusatztasten) setzt einen Marker. Umschalt+M = Stummschalten
  // (keyboardShortcuts), Strg/Cmd/Alt+M bleiben dem Browser/System überlassen.
  const handleKeydown = (e) => {
    if (e.key?.toLowerCase() === 'm' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!e.target?.matches?.('input, textarea, select, [contenteditable="true"]')) {
        e.preventDefault()
        if (playerStore.hasTracks) {
          addMarkerAtCurrentTime()
        }
      }
    }
  }

  let unsubscribeFrame = null

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    unsubscribeFrame = playerStore.onFrame(handleFrame)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    unsubscribeFrame?.()
    unsubscribeFrame = null
    // Von Markern ausgeblendete Texte und Formen beim Verlassen wiederherstellen.
    restoreTextMarkers()
    restoreShapeMarkers()
    restoreBackgroundImageMarkers()
  })

  return {
    showMarkerPanel,
    editingMarkerId,
    pendingMarkerTimeInput,
    markerTimeStep,
    newMarkerVisualizer,
    newMarkerColor,
    newMarkerChangeColor,
    newMarkerShowVisualizer,
    newMarkerBackgroundKey,
    newMarkerTextId,
    newMarkerShapeId,
    newMarkerBgImageId,
    newMarkerLabel,
    getMarkerTexts,
    getMarkerShapes,
    getMarkerShapeGallery,
    getMarkerGalleryImages,
    updateMarkerTimeFromInput,
    stepMarkerTime,
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

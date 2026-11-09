import { ref, watch, onMounted, onUnmounted, inject, toRaw, type Ref } from 'vue'
import { useI18n } from '../lib/i18n'
import { usePlayerStore } from '../stores/playerStore'
import { useBeatMarkerStore, type BeatMarkerAction } from '../stores/beatMarkerStore'
import { useVisualizerStore } from '../stores/visualizerStore'
import { useBackgroundBridgeStore, type BackgroundSnapshot } from '../stores/backgroundBridgeStore'
import { useMarkerTransitionStore } from '../stores/markerTransitionStore'
import {
  useLayerPresetStore,
  parseLayerPresetRef,
  type LayerPreset,
} from '../stores/layerPresetStore'
import { formatTimePrecise, parseTimeInput, roundToHundredths } from '../utils/formatTime'
import { resolveBackgroundPreset } from '../utils/backgroundPresets'
import { useHistoryStore } from '../stores/historyStore'
import { getHistoryRecorder } from '../lib/history/historyRecorder'
import { useShapeStore, type Shape } from '../stores/shapeStore'
import { SHAPE_CATEGORIES, SHAPE_GALLERY } from '../lib/shapes/shapes'
import { useImageGallery } from './useImageGallery'
import { loadImageAnimation } from '../lib/imagePlacementSettings'
import { onMarkerTargetEdited, type MarkerTargetEdit } from '../lib/markerTargetEdits'
import {
  cloneImageAnimation,
  createImageAnimation,
  hasImageAnimation,
  type ImageTimedAnimation,
} from '../lib/canvasObjects/imageAnimation'
import {
  captureBackgroundImageDefaults,
  captureBaseBackground,
  discardBaseBackground,
  findGalleryImage,
  releaseVideoBackgrounds,
  resolveBackgroundImageDefaults,
  restoreBaseBackground,
  setBackgroundImageWithDefaults,
  type BackgroundImageDefaults,
  type BaseBackground,
} from '../lib/background/markerBackgroundImage'
import {
  captureBackgroundMediaDefaults,
  findGalleryVideo,
  loadMarkerVideo,
  resolveBackgroundMediaDefaults,
  isMarkerVideoLoop,
  setBackgroundVideoWithDefaults,
  type GalleryVideoEntry,
  type MarkerVideoRef,
} from '../lib/background/markerBackgroundVideo'
import type { TextObject } from '../lib/textManager/types'
import type { CanvasImage, MultiImageManager } from '../lib/multiImageManager'
import type { CanvasManagerRef } from './types'

// Marker-Hintergründe laden Bilder/Videos per Callback nach → Baseline nach
// dieser Zeit erneut übernehmen, damit sie nicht im nächsten Nutzer-Schritt landen.
const MARKER_MEDIA_SETTLE_MS = 3000

/** Verweis eines Markers auf ein Galerie-Bild (kein Bildinhalt) */
export interface MarkerBackgroundImageRef {
  galleryId?: unknown
  name?: string
  defaults?: BackgroundImageDefaults | null
  /** Animation (Fade/Scale/Slide wie bei Texten) beim Einblenden des Bildes */
  timedAnimation?: ImageTimedAnimation | null
}

/** Felder der Marker-Aktion, die dieses Composable liest und schreibt */
export type MarkerAction = BeatMarkerAction & {
  visualizerVisible?: boolean
  /** Altes Feld (rückwärtskompatibel) */
  hideVisualizer?: boolean
  layerPreset?: Pick<LayerPreset, 'id' | 'name' | 'layers'> | null
  background?: BackgroundSnapshot | null
  backgroundKey?: string | null
  backgroundLabel?: string | null
  shapeId?: string | null
  shapeLabel?: string | null
  /** Platziertes Canvas-Bild, das zum Marker-Zeitpunkt erscheint */
  imageId?: CanvasImage['id'] | null
  imageLabel?: string | null
  backgroundImage?: MarkerBackgroundImageRef | null
  video?: MarkerVideoRef | null
}

/** Optionen für useBeatMarkers */
export interface UseBeatMarkersOptions {
  /** Hochgeladene Videos (Video-Panel), wählbar als Marker-Video */
  videoGallery?: Ref<GalleryVideoEntry[]>
}

/**
 * Beat-marker management for the sticky player bar: the add/edit form state,
 * marker CRUD, progress-bar positioning, and the watchers that trigger
 * visualizer/color changes as playback crosses markers.
 *
 * @param openMarkersPopover - opens the markers popover, so adding
 *   a marker (incl. via the "M" shortcut) reveals the form.
 * @param options.videoGallery - hochgeladene Videos (Video-Panel), wählbar als Marker-Video.
 */
export function useBeatMarkers(
  openMarkersPopover: () => void,
  { videoGallery = ref<GalleryVideoEntry[]>([]) }: UseBeatMarkersOptions = {},
) {
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
  const canvasManager = inject('canvasManager', ref(null)) as CanvasManagerRef
  // Platzierte Bilder (Foto-Panel) – für die Bild-Aktion der Marker
  const multiImageManager = inject('multiImageManager', ref(null)) as Ref<MultiImageManager | null>

  const showMarkerPanel = ref(false)
  const editingMarkerId = ref<number | null>(null)
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
  const newMarkerTextId = ref<TextObject['id'] | ''>('')
  // Ausgewählte Form pro Marker (Form-ID aus „Formen & Symbole“; '' = keine).
  // Die Form erscheint zum Marker-Zeitpunkt auf dem Canvas.
  const newMarkerShapeId = ref<string | null>('')
  // Platziertes Bild pro Marker (Canvas-Bild-ID oder `gallery:<id>` für ein
  // neu zu platzierendes Galerie-Bild; '' = keins). Das Bild erscheint mit
  // seinen Einstellungen und Animationen zum Marker-Zeitpunkt.
  const newMarkerImageId = ref<CanvasImage['id'] | ''>('')
  // Hintergrund-Bild pro Marker (Galerie-Bild-ID; '' = kein Wechsel). Übernimmt
  // beim Auslösen Audio-Reaktiv und Format (Workspace/Normal) vom vorherigen
  // Hintergrund-Bild.
  // (Select liefert die numerische Galerie-ID)
  const newMarkerBgImageId = ref<number | string | null>('')
  // Video pro Marker (Video-Galerie-ID; '' = kein Video). Wird zum
  // Marker-Zeitpunkt Hintergrund und startet von vorne.
  const newMarkerVideoId = ref<number | string | null>('')
  // true = Video in Schleife, false = einmal abspielen; danach kehrt der
  // Hintergrund von vor dem Video zurück.
  const newMarkerVideoLoop = ref(true)
  // Animation des Hintergrund-Bildes; neue Marker übernehmen die im Foto-Panel
  // eingestellte „Animation beim Hinzufügen“
  const newMarkerBgImageAnimation = ref<ImageTimedAnimation>(createImageAnimation())
  // Animation für ein Galerie-Bild, das der Marker beim Speichern neu platziert
  // (Vorgabe: „Animation beim Hinzufügen“ aus dem Foto-Panel)
  const newMarkerPlacedImageAnimation = ref<ImageTimedAnimation>(createImageAnimation())
  const newMarkerLabel = ref('')

  // ══════════════════ Text-Steuerung über Marker ══════════════════
  // Gemerkte Original-Deckkraft der von Markern gesteuerten Texte. Beim Start
  // der Wiedergabe werden zugewiesene Texte ausgeblendet und erscheinen erst
  // zum jeweiligen Marker-Zeitpunkt; beim Zurücksetzen wird die ursprüngliche
  // Deckkraft wiederhergestellt.
  const markerTextOriginalOpacity = new Map<TextObject['id'], number>()

  /** Alle Text-Objekte des Canvas (stabil nach Erstellungsreihenfolge sortiert). */
  const orderedTextObjects = () => {
    const objs = canvasManager.value?.textManager?.textObjects || []
    return [...objs].sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
  }

  /** Runtime-Set der vom Canvas entfernten Texte, die ein Marker anzeigt. */
  const revealedTextIds = () => canvasManager.value?.textManager?.markerRevealedIds ?? null

  /**
   * Liste der Texte für das Marker-Dropdown (Nummer + Vorschau des Inhalts).
   * Spiegelt die Nummerierung des Text-Verzeichnisses wider – inklusive der
   * vom Canvas entfernten Texte (`offCanvas`), die im Verzeichnis bleiben.
   */
  const getMarkerTexts = () => {
    return orderedTextObjects().map((o, i) => ({
      id: o.id,
      number: i + 1,
      content: (o.content || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      offCanvas: !!o.offCanvas,
    }))
  }

  /**
   * Aktuelle Bezeichnung eines Marker-Textes (Inhalt bzw. Nummer). Folgt
   * Änderungen am Text; null, wenn der Text nicht mehr existiert.
   */
  const getMarkerTextLabel = (id: TextObject['id'] | null | undefined) => {
    if (id === undefined || id === null || id === '') return null
    const txt = getMarkerTexts().find((tt) => tt.id === id)
    return txt ? txt.content || `#${txt.number}` : null
  }

  const findText = (id: TextObject['id']) => orderedTextObjects().find((o) => o.id === id) || null

  /** IDs aller Texte, die aktuell irgendeinem Marker zugewiesen sind. */
  const referencedTextIds = () => {
    const ids = new Set<TextObject['id']>()
    for (const m of beatMarkerStore.markers) {
      const tid = m.action?.textId
      if (tid !== undefined && tid !== null && tid !== '') ids.add(tid)
    }
    return ids
  }

  /**
   * Hat der Text eine eigene Anzeigedauer (mindestens ein aktiver Effekt mit
   * „Permanent anzeigen“ aus und ohne Loop)? Dann beendet seine Animation
   * die Anzeige, nicht der nächste Text-Marker.
   */
  const hasOwnDisplayEnd = (obj: TextObject) => {
    const a = obj.animation
    if (!a) return false
    return [a.typewriter, a.fade, a.scale, a.slide].some(
      (cfg) => !!cfg?.enabled && cfg.permanent === false && !cfg.loop,
    )
  }

  /**
   * Setzt den Animations-Zustand eines Textes vollständig zurück, sodass alle
   * Animationen (Typewriter, Fade, Scale, Slide) ab dem Marker-Zeitpunkt neu
   * abgespielt werden.
   */
  const restartTextAnimation = (obj: TextObject) => {
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
    const revealed = revealedTextIds()
    if (revealed?.size) {
      revealed.clear()
      canvasManager.value?.redrawCallback?.()
    }
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
    const revealed = revealedTextIds()
    if (revealed?.size) {
      const refs = referencedTextIds()
      for (const id of revealed) if (!refs.has(id)) revealed.delete(id)
    }
    if (markerTextOriginalOpacity.size === 0) return
    const ids = referencedTextIds()
    const objs = orderedTextObjects()
    let changed = false
    for (const id of [...markerTextOriginalOpacity.keys()]) {
      if (ids.has(id)) continue
      const o = objs.find((x) => x.id === id)
      if (o) o.opacity = markerTextOriginalOpacity.get(id) as number
      markerTextOriginalOpacity.delete(id)
      changed = true
    }
    if (changed) canvasManager.value?.redrawCallback?.()
  }

  /**
   * Wendet die Text-Aktion eines ausgelösten Markers an: Der zugewiesene Text
   * erscheint mit seinen Einstellungen auf dem Canvas (Deckkraft + Animation
   * neu starten), alle anderen von Markern gesteuerten Texte werden
   * ausgeblendet – außer Texten mit eigener Anzeigedauer: Die laufen nach
   * ihren Einstellungen (Anzeigedauer, Ausblenden) weiter.
   */
  const applyTextAction = (action: MarkerAction, restart = true) => {
    const tid = action?.textId
    if (tid === undefined || tid === null || tid === '') return
    const target = findText(tid)
    if (!target) return

    const ids = referencedTextIds()
    const revealed = revealedTextIds()
    orderedTextObjects().forEach((o) => {
      if (o.id === tid || !ids.has(o.id)) return
      // Text mit eigener Anzeigedauer läuft nach seinen Einstellungen aus
      // (bereits ausgeblendete Texte bleiben ausgeblendet).
      if (o.opacity !== 0 && hasOwnDisplayEnd(o)) return
      if (!markerTextOriginalOpacity.has(o.id)) {
        markerTextOriginalOpacity.set(o.id, o.opacity ?? 100)
      }
      o.opacity = 0
      revealed?.delete(o.id)
    })
    // Vom Canvas entfernter Text (nur noch im Verzeichnis): für die Wiedergabe
    // einblenden, ohne ihn dauerhaft auf den Canvas zurückzuholen.
    if (target.offCanvas) revealed?.add(tid)

    // Zieltext sichtbar machen: gemerkte Original-Deckkraft bevorzugen, sonst
    // die aktuelle (falls > 0) bzw. voll sichtbar.
    let visible = 100
    if (markerTextOriginalOpacity.has(tid)) {
      visible = markerTextOriginalOpacity.get(tid) as number
    } else if (target.opacity && target.opacity > 0) {
      visible = target.opacity
    }
    target.opacity = visible > 0 ? visible : 100
    if (restart) restartTextAnimation(target)
    canvasManager.value?.redrawCallback?.()
  }

  // ══════════════════ Formen-Steuerung über Marker ══════════════════
  // Wie bei Texten: Zugewiesene Formen (Formen & Symbole) werden beim Start der
  // Wiedergabe ausgeblendet und erscheinen erst zum jeweiligen Marker-Zeitpunkt.
  // Das Ausblenden ist reiner Laufzeit-Zustand im shapeStore (markerHiddenIds)
  // und gehört nicht zum Undo/Redo-Verlauf.

  /** Anzeigename einer Form (Galerie-Eintrag, sonst Formtyp) */
  const shapeDisplayName = (shape: Shape) =>
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
   * bearbeitbar).
   */
  const resolveMarkerShapeSelection = (value: string | null | undefined): string | null => {
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
    const ids = new Set<string>()
    for (const m of beatMarkerStore.markers) {
      const sid = (m.action as MarkerAction | undefined)?.shapeId
      if (sid !== undefined && sid !== null && sid !== '') ids.add(sid)
    }
    return ids
  }

  /** Wiedergabe-Start: zugewiesene Formen bis zu ihrem Marker ausblenden. */
  const activateShapeMarkers = () => {
    // Einmalige Form-Animationen (Einblenden …) laufen ab Wiedergabe-Start neu
    shapeStore.restartAnimations()
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
  const applyShapeAction = (action: MarkerAction) => {
    const raw = action?.shapeId
    const sid =
      raw !== undefined && raw !== null && raw !== '' && shapeStore.shapes.some((s) => s.id === raw)
        ? raw
        : null
    for (const id of referencedShapeIds()) {
      shapeStore.setMarkerHidden(id, id !== sid)
    }
  }

  // ══════════════════ Platzierte Bilder über Marker ══════════════════
  // Wie bei Formen: Zugewiesene Canvas-Bilder werden beim Start der Wiedergabe
  // ausgeblendet und erscheinen zum Marker-Zeitpunkt mit ihren Einstellungen;
  // ihre Animationen (Fade/Scale/Slide, Einblend-Effekt) starten dabei neu.
  // Das Ausblenden ist Laufzeit-Zustand im MultiImageManager (markerHiddenIds).

  const IMAGE_GALLERY_PREFIX = 'gallery:'

  /** Frei platzierte Bilder (ohne Slideshow-Bilder) mit ihrer Ebenen-Nummer */
  const placedImages = () =>
    (multiImageManager.value?.images ?? [])
      .map((img, i) => ({ img, layer: i + 1 }))
      .filter(({ img }) => img.type === 'image' && !img.isSlideshowImage)

  /** Name des Galerie-Bildes, aus dem ein Canvas-Bild stammt ('' = unbekannt) */
  const placedImageName = (img: CanvasImage) =>
    imageGallery.value.find((g) => g.img === img.imageObject)?.name ?? ''

  /**
   * Platzierte Bilder für das Marker-Dropdown (Ebene wie in „Bilder auf
   * Canvas“, Name aus der Galerie, ob Animationen eingestellt sind).
   */
  const getMarkerCanvasImages = () =>
    placedImages().map(({ img, layer }) => ({
      id: img.id,
      layer,
      name: placedImageName(img),
      animated: hasImageAnimation(img.timedAnimation),
    }))

  /** Eigene Galerie-Bilder, die der Marker beim Speichern neu platziert */
  const getMarkerImageGallery = () =>
    imageGallery.value.map((g, i) => ({
      value: `${IMAGE_GALLERY_PREFIX}${g.id}`,
      number: i + 1,
      name: g.name,
    }))

  /**
   * Löst die Dropdown-Auswahl zu einer Canvas-Bild-ID auf. Ein Galerie-Eintrag
   * wird jetzt platziert – mit der „Animation beim Hinzufügen“ aus dem
   * Foto-Panel – und lässt sich danach wie jedes Bild bearbeiten.
   */
  const resolveMarkerImageSelection = (
    value: CanvasImage['id'] | '' | null | undefined,
  ): CanvasImage['id'] | null => {
    if (value === '' || value === null || value === undefined) return null
    if (typeof value === 'string' && value.startsWith(IMAGE_GALLERY_PREFIX)) {
      const mim = multiImageManager.value
      const galleryId = value.slice(IMAGE_GALLERY_PREFIX.length)
      const entry = imageGallery.value.find((g) => String(g.id) === galleryId)
      if (!mim || !entry?.img) return null
      const placed = mim.addImage(entry.img, {
        timedAnimation: cloneImageAnimation(newMarkerPlacedImageAnimation.value),
      })
      mim.setSelectedImage(null)
      return placed?.id ?? null
    }
    return placedImages().some(({ img }) => img.id === value) ? value : null
  }

  /**
   * Platziertes Canvas-Bild zur Dropdown-Auswahl (null bei Galerie-Eintrag
   * oder unbekannter ID). Das Marker-Formular bearbeitet dessen Animationen
   * direkt – dieselben Einstellungen wie im Foto-Panel.
   */
  const getMarkerCanvasImage = (id: CanvasImage['id'] | '' | null | undefined) => {
    if (id === '' || id === null || id === undefined) return null
    return placedImages().find(({ img }) => img.id === id)?.img ?? null
  }

  /** Anzeigename eines Canvas-Bildes in der Marker-Liste */
  const markerImageLabel = (id: CanvasImage['id']) => {
    const entry = placedImages().find(({ img }) => img.id === id)
    if (!entry) return null
    const name = placedImageName(entry.img)
    return `${t('common.layer')} ${entry.layer}${name ? ` — ${name}` : ''}`
  }

  /** IDs aller Canvas-Bilder, die aktuell irgendeinem Marker zugewiesen sind. */
  const referencedImageIds = () => {
    const ids = new Set<CanvasImage['id']>()
    for (const m of beatMarkerStore.markers) {
      const iid = (m.action as MarkerAction | undefined)?.imageId
      if (iid !== undefined && iid !== null && iid !== '') ids.add(iid)
    }
    return ids
  }

  /** Wiedergabe-Start: zugewiesene Bilder bis zu ihrem Marker ausblenden. */
  const activateImageMarkers = () => {
    const mim = multiImageManager.value
    if (!mim) return
    for (const id of referencedImageIds()) mim.setMarkerHidden(id, true)
    mim.redrawCallback?.()
  }

  /** Alle von Markern ausgeblendeten Bilder wieder einblenden. */
  const restoreImageMarkers = () => multiImageManager.value?.clearMarkerHidden()

  /** Bilder einblenden, die keinem Marker mehr zugewiesen sind. */
  const reconcileImageMarkers = () => {
    const mim = multiImageManager.value
    if (!mim) return
    const ids = referencedImageIds()
    for (const id of mim.markerHiddenIds) {
      if (!ids.has(id)) mim.setMarkerHidden(id, false)
    }
  }

  /**
   * Bild-Aktion eines ausgelösten Markers: Das zugewiesene Bild erscheint und
   * spielt seine Animationen von vorn ab, alle anderen von Markern
   * gesteuerten Bilder werden ausgeblendet. Ein Marker ohne Bild blendet alle
   * Marker-Bilder aus (wie bei Formen); Bilder ohne Marker bleiben unberührt.
   */
  const applyImageAction = (action: MarkerAction, restart = true) => {
    const mim = multiImageManager.value
    if (!mim) return
    const raw = action?.imageId
    const iid =
      raw !== undefined && raw !== null && raw !== '' && mim.images.some((i) => i.id === raw)
        ? raw
        : null
    for (const id of referencedImageIds()) mim.setMarkerHidden(id, id !== iid)
    if (iid !== null && restart) mim.restartImageAnimations(iid)
    else mim.redrawCallback?.()
  }

  // ══════════════════ Hintergrund-Bild aus der Galerie ══════════════════

  /** Bilder der eigenen Bildgalerie für das Marker-Dropdown */
  const getMarkerGalleryImages = () =>
    imageGallery.value.map((g, i) => ({ id: g.id, number: i + 1, name: g.name }))

  /** Hochgeladene Videos (Video-Panel) für das Marker-Dropdown */
  const getMarkerGalleryVideos = () =>
    videoGallery.value.map((v, i) => ({ id: v.id, number: i + 1, name: v.name }))

  // Hintergrund vor dem ersten Hintergrund-Bild- bzw. Video-Marker eines
  // Durchlaufs. Ein späterer Marker ohne Bild, Video und Hintergrund-Preset
  // stellt ihn wieder her, statt das Marker-Bild/-Video stehen zu lassen.
  // Reiner Laufzeit-Zustand, nicht im Verlauf.
  let bgImageBase: BaseBackground | null = null
  // Zählt Marker-Hintergrundwechsel: ein Marker-Video, das erst nach einem
  // späteren Wechsel fertig lädt, wird verworfen.
  let mediaToken = 0
  // Hintergrund direkt vor einem einmal abgespielten Marker-Video; wird nach
  // dessen Ende wiederhergestellt. Reiner Laufzeit-Zustand.
  let onceVideoBefore: BaseBackground | null = null

  /** Vorher-Zustand eines einmaligen Videos verwerfen (geparkte Videos freigeben). */
  const dropOnceVideoBefore = () => {
    if (!onceVideoBefore) return
    discardBaseBackground(canvasManager.value, onceVideoBefore, bgImageBase)
    onceVideoBefore = null
  }

  const setMediaBase = (base: BaseBackground | null) => {
    if (bgImageBase && bgImageBase !== base) discardBaseBackground(canvasManager.value, bgImageBase)
    bgImageBase = base
  }

  /**
   * Setzt das Galerie-Video eines Markers als Hintergrund (lädt asynchron).
   * @param entry - Galerie-Video
   * @param ref - action.video
   * @param previous - vor allen Marker-Änderungen erfasste Vorgaben
   */
  const applyVideoAction = (
    entry: GalleryVideoEntry,
    ref: MarkerVideoRef,
    previous: BackgroundImageDefaults | null,
  ) => {
    const token = mediaToken
    const defaults = previous || resolveBackgroundMediaDefaults(null, ref.defaults)
    loadMarkerVideo(entry.src, (video) => {
      if (token !== mediaToken) {
        // Inzwischen hat ein anderer Marker den Hintergrund gewechselt.
        video.src = ''
        return
      }
      const loop = isMarkerVideoLoop(ref)
      historyRecorder.absorb(() => {
        const cm = canvasManager.value
        if (loop) {
          releaseVideoBackgrounds(cm, bgImageBase)
        } else {
          // Einmal abspielen: aktuellen Hintergrund merken und alle Videos nur
          // parken, damit er nach dem Video-Ende unverändert zurückkommt.
          const before = captureBaseBackground(cm)
          releaseVideoBackgrounds(cm, before)
          onceVideoBefore = before
          video.onended = () => {
            if (token !== mediaToken || onceVideoBefore !== before) return
            historyRecorder.absorb(() => {
              mediaToken++
              restoreBaseBackground(canvasManager.value, before)
              onceVideoBefore = null
              console.log('🎬 Marker-Video beendet – Hintergrund von vorher zurück:', ref.name)
            })
          }
        }
        const target = setBackgroundVideoWithDefaults(cm, video, defaults, { loop })
        console.log('🎬 Video via Beat-Marker:', ref.name, `(${target})`, loop ? '🔁' : '1×')
      })
    })
  }

  /**
   * Setzt Galerie-Bild bzw. Video eines Markers als Hintergrund. Format und
   * Audio-Reaktiv stammen vom vorherigen (beim Auslösen sichtbaren)
   * Hintergrund, ersatzweise aus den beim Speichern gemerkten Vorgaben.
   * Hat ein Marker beides, gewinnt das Video.
   * @param previous - vor allen Marker-Änderungen erfasste Vorgaben
   */
  const applyBackgroundImageAction = (
    action: MarkerAction,
    previous: BackgroundImageDefaults | null,
    presetApplied = false,
  ) => {
    const videoRef = action?.video || null
    const ref = videoRef ? null : action?.backgroundImage
    if (!ref && !videoRef) {
      mediaToken++
      if (presetApplied) {
        dropOnceVideoBefore()
        // Das Preset dieses Markers bestimmt den Hintergrund.
        setMediaBase(null)
      } else if (bgImageBase) {
        restoreBaseBackground(canvasManager.value, bgImageBase)
        bgImageBase = null
        console.log('🖼️ Hintergrund-Bild/Video via Beat-Marker zurückgesetzt')
      }
      dropOnceVideoBefore()
      return
    }
    if (videoRef) {
      const video = findGalleryVideo(videoGallery.value, videoRef)
      if (!video?.src) {
        console.warn('⚠️ Video des Markers nicht mehr hochgeladen:', videoRef.name)
        return
      }
      mediaToken++
      if (presetApplied || !bgImageBase) setMediaBase(captureBaseBackground(canvasManager.value))
      dropOnceVideoBefore()
      applyVideoAction(video, videoRef, previous)
      return
    }
    if (!ref) return
    const entry = findGalleryImage(imageGallery.value, ref)
    if (!entry?.img) {
      console.warn('⚠️ Hintergrund-Bild des Markers nicht mehr in der Galerie:', ref.name)
      return
    }
    mediaToken++
    // Mit Preset gilt der Preset-Hintergrund als neue Basis, sonst bleibt die
    // Basis vom ersten Bild-Marker dieses Durchlaufs erhalten.
    if (presetApplied || !bgImageBase) setMediaBase(captureBaseBackground(canvasManager.value))
    dropOnceVideoBefore()
    // Basis-Videos nur abhängen (kommen beim Zurücksetzen wieder), Marker-Videos freigeben.
    releaseVideoBackgrounds(canvasManager.value, bgImageBase)
    const defaults = previous || resolveBackgroundImageDefaults(null, ref.defaults)
    const target = setBackgroundImageWithDefaults(canvasManager.value, toRaw(entry.img), defaults, {
      timedAnimation: ref.timedAnimation ?? null,
    })
    // Gesetztes Hintergrund-Objekt mit dem Marker verknüpfen: Änderungen an
    // seiner Animation (Foto-Panel) übernimmt der Marker sofort.
    const cm = canvasManager.value
    const placed = target === 'workspace' ? cm?.workspaceBackground : cm?.background
    if (placed && typeof placed === 'object') markerBackgroundLinks.set(toRaw(placed), ref)
    console.log('🖼️ Hintergrund-Bild via Beat-Marker:', ref.name, `(${target})`)
  }

  // ══════════════════ Bearbeitungen sofort übernehmen ══════════════════
  // Panels melden Bearbeitungen (lib/markerTargetEdits). Ein vom Marker
  // ausgeblendetes Element wird dabei sichtbar, damit man die Änderung sieht;
  // die Animation eines Marker-Hintergrundbildes geht zurück in den Marker.

  /** Vom Marker gesetztes Hintergrund-Objekt → Bild-Verweis des Markers */
  const markerBackgroundLinks = new WeakMap<object, MarkerBackgroundImageRef>()

  /** Von einem Marker ausgeblendeten Text wieder zeigen (Deckkraft zurück). */
  const revealMarkerText = (id: TextObject['id']) => {
    if (!markerTextOriginalOpacity.has(id)) return
    const obj = findText(id)
    const original = markerTextOriginalOpacity.get(id) as number
    markerTextOriginalOpacity.delete(id)
    if (!obj) return
    historyRecorder.absorb(() => {
      obj.opacity = original > 0 ? original : 100
      if (obj.offCanvas) revealedTextIds()?.add(id)
    })
    canvasManager.value?.redrawCallback?.()
  }

  const handleTargetEdit = (edit: MarkerTargetEdit) => {
    switch (edit.kind) {
      case 'text':
        revealMarkerText(edit.id)
        break
      case 'image': {
        const mim = multiImageManager.value
        if (mim?.isMarkerHidden(edit.id)) {
          mim.setMarkerHidden(edit.id, false)
          mim.redrawCallback?.()
        }
        break
      }
      case 'background': {
        const link = markerBackgroundLinks.get(toRaw(edit.object))
        if (!link) break
        const anim = (edit.object as { timedAnimation?: ImageTimedAnimation | null }).timedAnimation
        if (hasImageAnimation(anim)) link.timedAnimation = cloneImageAnimation(anim)
        else delete link.timedAnimation
        break
      }
    }
  }

  /** Wiedergabe-Ende/Neustart: Hintergrund von vor den Bild-Markern zurück. */
  const restoreBackgroundImageMarkers = () =>
    historyRecorder.absorb(() => {
      mediaToken++
      if (bgImageBase) restoreBaseBackground(canvasManager.value, bgImageBase)
      bgImageBase = null
      dropOnceVideoBefore()
    })

  /**
   * Nur der Hintergrund-Teil eines Canvas-Presets: Die Vordergrund-Elemente
   * (Bilder, Videos, Texte, Lauftext) im Preset sind ein Stand vom Speichern.
   * Ein Marker würde damit gelöschte Elemente zurückholen und Änderungen an
   * Elementen überschreiben. Elemente steuert der Marker nur über seine
   * Verweise (Text, Bild, Form) mit deren aktuellen Einstellungen.
   */
  const withoutCanvasElements = <T extends BackgroundSnapshot | null | undefined>(
    snapshot: T,
  ): T => (snapshot && snapshot.elements ? { ...snapshot, elements: null } : snapshot)

  /**
   * Wendet die Hintergrund-Aktion eines ausgelösten Markers an (falls vorhanden).
   */
  const applyMarkerBackground = (action: MarkerAction | null | undefined) => {
    if (!action) return false
    // Preset bevorzugt frisch anhand des Keys auflösen (spiegelt aktuelle
    // Presets wider); sonst den im Marker gespeicherten Snapshot verwenden.
    let snapshot = action.background
    if (action.backgroundKey) {
      const resolved = resolveBackgroundPreset(action.backgroundKey)
      if (resolved?.snapshot) snapshot = resolved.snapshot as unknown as BackgroundSnapshot
    }
    // Ältere Marker haben die Elemente noch im Snapshot gespeichert.
    snapshot = withoutCanvasElements(snapshot)
    // Mit Hintergrund-Bild bzw. Video liefert das Preset nur Farbe,
    // Gradient, Audio-Reaktiv und Elemente – sein (asynchron geladenes) Bild
    // bzw. Video würde das Galerie-Bild sonst wieder überdecken.
    if (snapshot && (action.backgroundImage || action.video)) {
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
  const applyMarkerAction = (action: MarkerAction) =>
    historyRecorder.absorb(() => applyMarkerActionNow(action), {
      settleMs: MARKER_MEDIA_SETTLE_MS,
    })

  const applyMarkerActionNow = (action: MarkerAction | null | undefined) => {
    if (!action) return
    // Vorgaben des vorherigen Hintergrund-Bildes erfassen, bevor ein
    // Hintergrund-Preset dieses Markers den Hintergrund ändert.
    const previousBgImage = action.video
      ? resolveBackgroundMediaDefaults(canvasManager.value, action.video.defaults)
      : action.backgroundImage
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
            console.log('🎛️ Layer-Preset via Beat-Marker angewendet:', (preset as LayerPreset).name)
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
    applyImageAction(action)
  }

  /**
   * Sichtbarkeit der Marker-Elemente (Texte, Formen, Bilder) für eine
   * Wiedergabe-Position herstellen, ohne Animationen neu zu starten: Es gilt
   * jeweils der letzte Marker bis `time`, Elemente späterer Marker bleiben
   * ausgeblendet. Für das Fortsetzen nach einer Pause oder einen Sprung
   * während der Wiedergabe – die Elemente zeigen dabei ihre aktuellen
   * Einstellungen.
   */
  const syncMarkerVisibility = (time: number) =>
    historyRecorder.absorb(() => {
      const passed = [...beatMarkerStore.markers]
        .filter((m) => m.time <= time)
        .sort((a, b) => a.time - b.time)
      const last = passed[passed.length - 1]?.action as MarkerAction | undefined
      const lastText = [...passed].reverse().find((m) => {
        const tid = (m.action as MarkerAction | undefined)?.textId
        return tid !== undefined && tid !== null && tid !== ''
      })?.action as MarkerAction | undefined

      activateTextMarkersNow()
      if (lastText) applyTextAction(lastText, false)

      for (const id of referencedShapeIds()) shapeStore.setMarkerHidden(id, true)
      if (last) applyShapeAction(last)

      const mim = multiImageManager.value
      if (mim) {
        for (const id of referencedImageIds()) mim.setMarkerHidden(id, true)
        if (last) applyImageAction(last, false)
        else mim.redrawCallback?.()
      }
    })

  /**
   * Führt einen ausgelösten Marker aus. Ist der Crossfade aktiviert, wird der
   * aktuelle (alte) Frame kurz eingefroren, dann die Änderung angewendet und der
   * alte Frame über der neuen Szene ausgeblendet. Sonst wird sofort gewechselt.
   * @param allowTransition - false z.B. für den Start-Marker (0:00)
   */
  const runMarkerTrigger = (
    rawAction: BeatMarkerAction | null | undefined,
    allowTransition = true,
  ) => {
    if (!rawAction) return
    const action = rawAction as MarkerAction
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
  const setPendingMarkerTime = (seconds: number) => {
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
   * @param direction - +1 (vor) oder -1 (zurück)
   */
  const stepMarkerTime = (direction: number) => {
    const sign = direction < 0 ? -1 : 1
    setPendingMarkerTime(pendingMarkerTime.value + sign * markerTimeStep.value)
  }

  const getMarkerPosition = (time: number) => {
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
    newMarkerImageId.value = ''
    newMarkerBgImageId.value = ''
    newMarkerVideoId.value = ''
    newMarkerVideoLoop.value = true
    newMarkerBgImageAnimation.value = loadImageAnimation()
    newMarkerPlacedImageAnimation.value = loadImageAnimation()
    showMarkerPanel.value = true
    openMarkersPopover()
  }

  const startEditMarker = (marker: {
    id: number
    time: number
    label?: string
    action?: MarkerAction
  }) => {
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
    // Gelöschtes Bild: Auswahl leeren statt eine unbekannte ID anzuzeigen
    const imageId = marker.action?.imageId
    newMarkerImageId.value =
      imageId !== undefined &&
      imageId !== null &&
      placedImages().some(({ img }) => img.id === imageId)
        ? imageId
        : ''
    newMarkerBgImageId.value = marker.action?.backgroundImage
      ? ((findGalleryImage(imageGallery.value, marker.action.backgroundImage)?.id as
          | number
          | undefined) ?? '')
      : ''
    newMarkerVideoLoop.value = isMarkerVideoLoop(marker.action?.video)
    newMarkerPlacedImageAnimation.value = loadImageAnimation()
    newMarkerBgImageAnimation.value = cloneImageAnimation(
      marker.action?.backgroundImage?.timedAnimation,
    )
    newMarkerVideoId.value = marker.action?.video
      ? ((findGalleryVideo(videoGallery.value, marker.action.video)?.id as
          | number
          | string
          | undefined) ?? '')
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
        background = withoutCanvasElements(resolved.snapshot as unknown as BackgroundSnapshot)
        backgroundKey = resolved.key
        backgroundLabel = resolved.label
      }
    }

    // Zugewiesenen Text (aus dem Text-Verzeichnis) als eigenständige Aktion
    // speichern. Der Text erscheint zum Marker-Zeitpunkt auf dem Canvas.
    let textId: TextObject['id'] | null = null
    let textLabel = null
    if (newMarkerTextId.value !== '' && newMarkerTextId.value !== null) {
      textId = newMarkerTextId.value
      const txt = getMarkerTexts().find((tt) => tt.id === textId)
      if (txt) textLabel = txt.content ? txt.content : `#${txt.number}`
    }

    // Zugewiesene Form (Formen & Symbole) – erscheint zum Marker-Zeitpunkt.
    let shapeId: string | null = null
    let shapeLabel = null
    if (newMarkerShapeId.value !== '' && newMarkerShapeId.value !== null) {
      shapeId = resolveMarkerShapeSelection(newMarkerShapeId.value)
      const sh = getMarkerShapes().find((s) => s.id === shapeId)
      if (sh) shapeLabel = sh.extra ? `${sh.name} ${sh.extra}` : sh.name
    }

    // Platziertes Bild (oder jetzt platziertes Galerie-Bild) – erscheint zum
    // Marker-Zeitpunkt mit seinen Einstellungen und Animationen.
    const imageId = resolveMarkerImageSelection(newMarkerImageId.value)
    const imageLabel = imageId !== null ? markerImageLabel(imageId) : null

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
          ...(hasImageAnimation(newMarkerBgImageAnimation.value)
            ? { timedAnimation: cloneImageAnimation(newMarkerBgImageAnimation.value) }
            : {}),
        }
      }
    }

    // Video aus dem Video-Panel: nur Verweis (id + Name) plus Vorgaben des
    // aktuellen Hintergrunds (Bild oder Video) speichern.
    let video = null
    if (newMarkerVideoId.value !== '' && newMarkerVideoId.value !== null) {
      const entry = videoGallery.value.find((v) => v.id === newMarkerVideoId.value)
      if (entry) {
        video = {
          galleryId: entry.id,
          name: entry.name,
          defaults: captureBackgroundMediaDefaults(canvasManager.value),
          loop: newMarkerVideoLoop.value,
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
      imageId: imageId,
      imageLabel: imageLabel,
      backgroundImage: backgroundImage,
      video: video,
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
    newMarkerImageId.value = ''
    newMarkerBgImageId.value = ''
    newMarkerVideoId.value = ''
    newMarkerVideoLoop.value = true
    // Texte und Formen, die keinem Marker mehr zugewiesen sind, wieder einblenden.
    reconcileTextMarkers()
    reconcileShapeMarkers() // Läuft die Wiedergabe schon und liegt der Marker noch vor uns, erscheint
    // die Form erst zum Marker-Zeitpunkt (wie beim Start ab 0:00).
    if (shapeId && playerStore.isPlaying && pendingMarkerTime.value > playerStore.currentTime) {
      shapeStore.setMarkerHidden(shapeId, true)
    }
    reconcileImageMarkers()
    if (
      imageId !== null &&
      playerStore.isPlaying &&
      pendingMarkerTime.value > playerStore.currentTime
    ) {
      multiImageManager.value?.setMarkerHidden(imageId, true)
    }
  }

  const cancelAddMarker = () => {
    editingMarkerId.value = null
    showMarkerPanel.value = false
  }

  const seekToMarker = (time: number) => {
    playerStore.seekTo(time)
    beatMarkerStore.resetTriggers()
  }

  const removeMarker = (id: number) => {
    beatMarkerStore.removeMarker(id)
    // Text bzw. Form des gelöschten Markers ggf. wieder einblenden.
    reconcileTextMarkers()
    reconcileShapeMarkers()
    reconcileImageMarkers()
  }

  const clearAllMarkers = () => {
    if (confirm(t('player.confirmDeleteMarkers'))) {
      beatMarkerStore.clearAllMarkers()
      restoreTextMarkers()
      restoreShapeMarkers()
      restoreImageMarkers()
      restoreBackgroundImageMarkers()
    }
  }

  const getVisualizerName = (id: string) => {
    const presetId = parseLayerPresetRef(id)
    if (presetId) {
      const preset = layerPresetStore.findLayerPreset(presetId)
      if (preset) return preset.name
      // Gelöschtes Preset: Name aus dem Marker-Snapshot verwenden
      const marker = beatMarkerStore.markers.find((m) => m.action?.visualizer === id)
      return (marker?.action as MarkerAction | undefined)?.layerPreset?.name || id
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
  let lastFrameTime: number | null = null
  let lastFrameAt = -Infinity

  const handleFrame = (time: number) => {
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
          restoreImageMarkers()
          restoreBackgroundImageMarkers()
        } else if (playerStore.isPlaying && beatMarkerStore.markersEnabled) {
          // Sprung während der Wiedergabe: Stand der Marker bis hierher
          syncMarkerVisibility(newTime)
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
      if (!isPlaying) {
        // Marker greifen nur während der Wiedergabe ein: Bei Pause/Stopp ist
        // alles sichtbar und frei bearbeitbar (Hintergrund bleibt, wie er ist).
        restoreTextMarkers()
        restoreShapeMarkers()
        restoreImageMarkers()
        return
      }
      if (playerStore.currentTime >= 0.5) {
        // Fortsetzen mitten im Track: Elemente späterer Marker wieder
        // ausblenden, ohne laufende Animationen neu zu starten.
        if (beatMarkerStore.markersEnabled) syncMarkerVisibility(playerStore.currentTime)
        return
      }
      beatMarkerStore.resetTriggers()
      // Zugewiesene Texte ausblenden, damit sie erst zum jeweiligen
      // Marker-Zeitpunkt erscheinen.
      activateTextMarkers()
      activateShapeMarkers()
      activateImageMarkers()
      const triggered = beatMarkerStore.checkTrigger(playerStore.currentTime)
      if (triggered && triggered.action) {
        // Start-Marker (0:00): sofort anwenden, ohne Übergang (nichts zum Ausblenden)
        runMarkerTrigger(triggered.action, false)
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
        restoreImageMarkers()
        restoreBackgroundImageMarkers()
      }
    },
  )

  // Taste M (ohne Zusatztasten) setzt einen Marker. Umschalt+M = Stummschalten
  // (keyboardShortcuts), Strg/Cmd/Alt+M bleiben dem Browser/System überlassen.
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key?.toLowerCase() === 'm' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (
        !(e.target as Element | null)?.matches?.(
          'input, textarea, select, [contenteditable="true"]',
        )
      ) {
        e.preventDefault()
        if (playerStore.hasTracks) {
          addMarkerAtCurrentTime()
        }
      }
    }
  }

  let unsubscribeFrame: (() => void) | null = null
  let unsubscribeEdits: (() => void) | null = null

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    unsubscribeFrame = playerStore.onFrame(handleFrame)
    unsubscribeEdits = onMarkerTargetEdited(handleTargetEdit)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    unsubscribeFrame?.()
    unsubscribeFrame = null
    unsubscribeEdits?.()
    unsubscribeEdits = null
    // Von Markern ausgeblendete Texte und Formen beim Verlassen wiederherstellen.
    restoreTextMarkers()
    restoreShapeMarkers()
    restoreImageMarkers()
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
    newMarkerImageId,
    newMarkerBgImageId,
    newMarkerVideoId,
    newMarkerVideoLoop,
    newMarkerBgImageAnimation,
    newMarkerPlacedImageAnimation,
    getMarkerCanvasImage,
    getMarkerTextLabel,
    getMarkerImageLabel: markerImageLabel,
    newMarkerLabel,
    getMarkerTexts,
    getMarkerShapes,
    getMarkerShapeGallery,
    getMarkerCanvasImages,
    getMarkerImageGallery,
    getMarkerGalleryImages,
    getMarkerGalleryVideos,
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

/**
 * History-Segmente für Canvas-Objekte: Texte, Bilder, Videos.
 *
 * Grundsätze
 * - Objekte werden über ihre `id` identifiziert und beim Wiederherstellen
 *   IN-PLACE gepatcht. Auswahl, Panels, WeakMaps (Audio-Hüllkurven) und die
 *   Lösch-Closures halten Referenzen auf diese Objekte.
 * - Entfernte Objekte bleiben in einem Pool (id → Objekt) und werden bei
 *   Undo/Redo samt ihrem Bild-/Video-Element wiederverwendet.
 * - Laufzeitfelder (Animation, Filter-Caches, Slideshow-Bilder, DOM-Elemente)
 *   stehen nicht im Snapshot.
 */
import { mediaRegistry, loadImageElement } from '../mediaRegistry'
import { assignDeep, clone } from './storeSegments'
import type { SegmentAdapter } from '../historyRecorder'

type Loose = Record<string, unknown>
export type ObjectId = string | number

/** Objekt mit optionalen Foto-Einstellungen (Bild, Video, Hintergrund) */
export interface FotoSettingsTarget {
  fotoSettings?: Loose | null
}

interface SelectableObject {
  id: ObjectId
  type?: string
}

export interface HistoryTextObject extends Loose {
  id: ObjectId
  animation?: (Loose & { _state?: unknown }) | null
  offCanvas?: boolean
}

export interface HistoryImageObject extends FotoSettingsTarget {
  id: ObjectId
  type?: string
  imageObject: HTMLImageElement | null
  relX?: number
  relY?: number
  relWidth?: number
  relHeight?: number
  settings?: Loose | null
  animation?: { active?: boolean } | null
  isSlideshowImage?: boolean
}

export interface HistoryVideoObject extends FotoSettingsTarget {
  id: ObjectId
  videoElement: HTMLVideoElement | null
  relX?: number
  relY?: number
  relWidth?: number
  relHeight?: number
  playbackRate?: number
  startTime?: number
  endTime?: number
  loop?: boolean
  muted?: boolean
  settings?: Loose | null
}

/** Benötigter Ausschnitt des CanvasManagers (canvasManager/ ist noch JS) */
export interface HistoryCanvasManager {
  activeObject?: (SelectableObject & Loose) | null
  selectedObjects?: SelectableObject[]
  setActiveObject?(obj: null): void
  textManager?: { textObjects: HistoryTextObject[] } | null
  multiImageManager?: {
    images: HistoryImageObject[]
    selectedImage?: HistoryImageObject | null
    onImageSelected?: ((img: null) => void) | null
    onImageChanged?: (() => void) | null
  } | null
  videoManager?: {
    videos: HistoryVideoObject[]
    selectedVideo?: HistoryVideoObject | null
    isPlaying?: boolean
    onVideoSelected?: ((video: null) => void) | null
    onVideoChanged?: (() => void) | null
  } | null
}

export type GetHistoryCanvasManager = () => HistoryCanvasManager | null | undefined

interface ImageSnapshot {
  id: ObjectId
  type: string
  media: string | null
  relX?: number
  relY?: number
  relWidth?: number
  relHeight?: number
  settings: Loose | null
  fotoSettings: Loose | null
}

interface VideoSnapshot {
  id: ObjectId
  media: string | null
  relX?: number
  relY?: number
  relWidth?: number
  relHeight?: number
  playbackRate?: number
  startTime?: number
  endTime?: number
  settings: Loose | null
  fotoSettings: Loose | null
}

/**
 * Kopie von fotoSettings ohne interne Cache-Felder (`_cachedFilterKey` …),
 * die der Renderer pro Frame schreibt.
 */
export function cleanFotoSettings(fotoSettings: Loose | null | undefined): Loose | null {
  if (!fotoSettings) return null
  const out = clone(fotoSettings)
  for (const key of Object.keys(out)) {
    if (key.startsWith('_')) delete out[key]
  }
  return out
}

/** fotoSettings in-place übernehmen (Objekt-Identität von audioReactive bleibt). */
export function applyFotoSettings(
  target: FotoSettingsTarget,
  snapFotoSettings: Loose | null | undefined,
): void {
  if (!snapFotoSettings) return
  if (target.fotoSettings && typeof target.fotoSettings === 'object') {
    assignDeep(target.fotoSettings, snapFotoSettings)
  } else {
    target.fotoSettings = clone(snapFotoSettings)
  }
}

export function videoSourceOf(videoElement: HTMLVideoElement | null | undefined): string | null {
  if (!videoElement) return null
  return videoElement.getAttribute?.('src') || videoElement.currentSrc || videoElement.src || null
}

function isLiveVideo(videoElement: HTMLVideoElement | null | undefined): boolean {
  return Boolean(videoElement && videoSourceOf(videoElement))
}

/**
 * Erzeugt ein Video-Element neu (nur nötig, wenn das alte zerstört wurde,
 * z. B. durch Reset mit `src = ''`).
 */
export function recreateVideoElement(
  src: string,
  {
    loop = true,
    muted = true,
    playbackRate = 1,
  }: { loop?: boolean; muted?: boolean; playbackRate?: number } = {},
): HTMLVideoElement {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.playsInline = true
  video.loop = loop
  video.muted = muted
  video.playbackRate = playbackRate
  video.src = src
  mediaRegistry.remember(src, video)
  return video
}

/** Hebt die Auswahl auf, wenn das aktive Objekt nicht mehr existiert. */
function dropStaleSelection(
  cm: HistoryCanvasManager | null | undefined,
  type: string,
  liveIds: Set<ObjectId>,
): void {
  if (!cm) return
  const active = cm.activeObject
  if (active && active.type === type && !liveIds.has(active.id)) {
    if (typeof cm.setActiveObject === 'function') cm.setActiveObject(null)
    else cm.activeObject = null
  }
  if (Array.isArray(cm.selectedObjects) && cm.selectedObjects.length) {
    const kept = cm.selectedObjects.filter((o) => o.type !== type || liveIds.has(o.id))
    if (kept.length !== cm.selectedObjects.length) cm.selectedObjects = kept
  }
}

/** Stabiler Vergleich für gemischte IDs (Zahl oder String). */
function compareIds(a: ObjectId, b: ObjectId): number {
  const ta = typeof a
  const tb = typeof b
  if (ta !== tb) return ta < tb ? -1 : 1
  return a < b ? -1 : a > b ? 1 : 0
}

// ── Texte ───────────────────────────────────────────────────────────────────

// relWidth/relHeight werden bei Auswahl/Resize neu berechnet (nur Basis für
// Resize-Verhältnisse) → nicht vergleichen, sonst entstehen Phantom-Schritte.
const TEXT_RUNTIME_KEYS = ['relWidth', 'relHeight']

function captureText(textObj: HistoryTextObject): HistoryTextObject {
  const snap = clone(textObj)
  for (const key of TEXT_RUNTIME_KEYS) delete snap[key]
  if (snap.animation) delete snap.animation._state
  // Immer festschreiben: apply() übernimmt nur vorhandene Schlüssel – ein
  // fehlendes Flag würde „vom Canvas entfernt“ beim Undo nicht zurücksetzen.
  snap.offCanvas = !!textObj.offCanvas
  return snap
}

/**
 * opts.createText erzeugt ein neues Text-Objekt (Fallback, falls ein Objekt
 * weder live noch im Pool existiert).
 */
export function createTextsSegment(
  getCanvasManager: GetHistoryCanvasManager,
  { createText }: { createText?: (snap: HistoryTextObject) => HistoryTextObject } = {},
): SegmentAdapter<HistoryTextObject[] | null | undefined> {
  const pool = new Map<ObjectId, HistoryTextObject>()

  return {
    label: 'texts',
    order: 70,
    capture() {
      const tm = getCanvasManager()?.textManager
      if (!tm) return null
      // Sortiert nach ID: Die Auswahl eines Textes verschiebt ihn nach oben
      // (moveToTop) – reine Auswahl soll keinen Verlaufsschritt erzeugen.
      const texts = [...tm.textObjects]
      for (const t of texts) pool.set(t.id, t)
      return texts.sort((a, b) => compareIds(a.id, b.id)).map(captureText)
    },
    apply(snapshot) {
      const cm = getCanvasManager()
      const tm = cm?.textManager
      if (!tm || !Array.isArray(snapshot)) return

      const liveById = new Map(tm.textObjects.map((t) => [t.id, t]))
      const wanted = new Set(snapshot.map((s) => s.id))
      const restored: HistoryTextObject[] = []

      for (const snap of snapshot) {
        let obj = liveById.get(snap.id) ?? pool.get(snap.id)
        if (!obj) {
          obj = createText ? createText(snap) : { ...clone(snap) }
        }
        const runtimeState = obj.animation?._state
        for (const [key, value] of Object.entries(snap)) {
          const current = obj[key]
          if (value && typeof value === 'object' && !Array.isArray(value) && current) {
            assignDeep(current as Loose, value as Loose)
          } else {
            obj[key] = clone(value)
          }
        }
        if (runtimeState && obj.animation) obj.animation._state = runtimeState
        pool.set(obj.id, obj)
        if (!liveById.has(snap.id)) restored.push(obj)
      }

      // Bestehende Reihenfolge (Ebenen) beibehalten, Entferntes raus,
      // Wiederhergestelltes oben anfügen.
      const next = tm.textObjects.filter((t) => wanted.has(t.id)).concat(restored)
      tm.textObjects.splice(0, tm.textObjects.length, ...next)

      // Vom Canvas entfernte Texte (nur im Verzeichnis) nicht markiert lassen
      const onCanvas = new Set(snapshot.filter((snap) => !snap.offCanvas).map((snap) => snap.id))
      dropStaleSelection(cm, 'text', onCanvas)
    },
  }
}

// ── Bilder ──────────────────────────────────────────────────────────────────

function captureImage(img: HistoryImageObject): ImageSnapshot {
  const src = img.imageObject?.src || null
  return {
    id: img.id,
    type: img.type || 'image',
    media: src ? mediaRegistry.remember(src, img.imageObject) : null,
    relX: img.relX,
    relY: img.relY,
    relWidth: img.relWidth,
    relHeight: img.relHeight,
    settings: clone(img.settings ?? null),
    fotoSettings: cleanFotoSettings(img.fotoSettings),
  }
}

async function ensureImageElement(obj: HistoryImageObject, mediaKey: string | null) {
  const src = mediaRegistry.resolve(mediaKey)
  if (!src) return
  if (obj.imageObject && obj.imageObject.src === src) return
  try {
    obj.imageObject = await loadImageElement(src)
  } catch (error) {
    console.warn('⚠️ [History] Bild konnte nicht wiederhergestellt werden:', error)
  }
}

export function createImagesSegment(
  getCanvasManager: GetHistoryCanvasManager,
): SegmentAdapter<ImageSnapshot[] | null | undefined> {
  const pool = new Map<ObjectId, HistoryImageObject>()

  return {
    label: 'images',
    order: 50,
    capture() {
      const mgr = getCanvasManager()?.multiImageManager
      if (!mgr) return null
      // Slideshow-Bilder werden zeitgesteuert ein-/ausgeblendet → ignorieren
      return mgr.images
        .filter((img) => !img.isSlideshowImage)
        .map((img) => {
          pool.set(img.id, img)
          return captureImage(img)
        })
    },
    async apply(snapshot) {
      const cm = getCanvasManager()
      const mgr = cm?.multiImageManager
      if (!mgr || !Array.isArray(snapshot)) return

      const liveById = new Map(mgr.images.map((img) => [img.id, img]))
      const result: HistoryImageObject[] = []

      for (const snap of snapshot) {
        let obj = liveById.get(snap.id) ?? pool.get(snap.id)
        if (!obj) obj = { id: snap.id, type: snap.type, imageObject: null }
        await ensureImageElement(obj, snap.media)
        if (!obj.imageObject) continue
        obj.relX = snap.relX
        obj.relY = snap.relY
        obj.relWidth = snap.relWidth
        obj.relHeight = snap.relHeight
        if (snap.settings) {
          if (obj.settings) assignDeep(obj.settings, snap.settings)
          else obj.settings = clone(snap.settings)
        }
        applyFotoSettings(obj, snap.fotoSettings)
        // Eintritts-Animation eines wiederhergestellten Bildes nicht erneut abspielen
        if (obj.animation?.active) obj.animation.active = false
        pool.set(obj.id, obj)
        result.push(obj)
      }

      // Slideshow-Bilder (zeitgesteuert, nicht im Snapshot) bleiben erhalten –
      // wie beim Hinzufügen durch die Slideshow oben auf dem Stapel.
      result.push(...mgr.images.filter((img) => img.isSlideshowImage))

      mgr.images.splice(0, mgr.images.length, ...result)

      const liveIds = new Set(result.map((img) => img.id))
      if (mgr.selectedImage && !liveIds.has(mgr.selectedImage.id)) {
        mgr.selectedImage = null
        mgr.onImageSelected?.(null)
      }
      dropStaleSelection(cm, 'image', liveIds)
      mgr.onImageChanged?.()
    },
  }
}

// ── Videos ──────────────────────────────────────────────────────────────────

function captureVideo(video: HistoryVideoObject): VideoSnapshot {
  const src = videoSourceOf(video.videoElement)
  return {
    id: video.id,
    media: src ? mediaRegistry.remember(src, video.videoElement) : null,
    relX: video.relX,
    relY: video.relY,
    relWidth: video.relWidth,
    relHeight: video.relHeight,
    playbackRate: video.playbackRate,
    startTime: video.startTime,
    endTime: video.endTime,
    settings: clone(video.settings ?? null),
    fotoSettings: cleanFotoSettings(video.fotoSettings),
  }
}

export function createVideosSegment(
  getCanvasManager: GetHistoryCanvasManager,
): SegmentAdapter<VideoSnapshot[] | null | undefined> {
  const pool = new Map<ObjectId, HistoryVideoObject>()

  return {
    label: 'videos',
    order: 60,
    capture() {
      const mgr = getCanvasManager()?.videoManager
      if (!mgr) return null
      return mgr.videos.map((video) => {
        pool.set(video.id, video)
        return captureVideo(video)
      })
    },
    apply(snapshot) {
      const cm = getCanvasManager()
      const mgr = cm?.videoManager
      if (!mgr || !Array.isArray(snapshot)) return

      const liveById = new Map(mgr.videos.map((v) => [v.id, v]))
      const wanted = new Set(snapshot.map((s) => s.id))
      const result: HistoryVideoObject[] = []

      // Entfernte Videos nur anhalten – das Element bleibt für ein Redo erhalten
      for (const video of mgr.videos) {
        if (!wanted.has(video.id)) video.videoElement?.pause?.()
      }

      for (const snap of snapshot) {
        const obj = liveById.get(snap.id) ?? pool.get(snap.id)
        if (!obj) continue // ohne Element kein sinnvolles Wiederherstellen
        const wasLive = liveById.has(snap.id)

        if (!isLiveVideo(obj.videoElement)) {
          const src = mediaRegistry.resolve(snap.media)
          if (!src) continue
          obj.videoElement = recreateVideoElement(src, {
            loop: obj.loop,
            muted: obj.muted,
            playbackRate: snap.playbackRate,
          })
        }

        obj.relX = snap.relX
        obj.relY = snap.relY
        obj.relWidth = snap.relWidth
        obj.relHeight = snap.relHeight
        obj.playbackRate = snap.playbackRate
        obj.startTime = snap.startTime
        obj.endTime = snap.endTime
        if (obj.videoElement && typeof snap.playbackRate === 'number') {
          obj.videoElement.playbackRate = snap.playbackRate
        }
        if (snap.settings) {
          if (obj.settings) assignDeep(obj.settings, snap.settings)
          else obj.settings = clone(snap.settings)
        }
        applyFotoSettings(obj, snap.fotoSettings)
        if (!wasLive && mgr.isPlaying) obj.videoElement?.play?.().catch(() => {})
        pool.set(obj.id, obj)
        result.push(obj)
      }

      mgr.videos.splice(0, mgr.videos.length, ...result)

      const liveIds = new Set(result.map((v) => v.id))
      if (mgr.selectedVideo && !liveIds.has(mgr.selectedVideo.id)) {
        mgr.selectedVideo = null
        mgr.onVideoSelected?.(null)
      }
      dropStaleSelection(cm, 'video', liveIds)
      mgr.onVideoChanged?.()
    },
  }
}

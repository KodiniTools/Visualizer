/**
 * Vordergrund-Elemente (Bilder, Videos, Texte, Lauftext) für Canvas-Presets
 * und Beat-Marker erfassen und wiederherstellen.
 *
 * `getCm` liefert den AKTUELLEN CanvasManager (wird auch in asynchronen
 * Lade-Callbacks erneut abgefragt).
 */

import { resolveImageName } from '../canvasObjects/imageName'

type Loose = Record<string, unknown>

const deepClone = <T>(obj: T): NonNullable<T> | null =>
  obj ? JSON.parse(JSON.stringify(obj)) : null

/** Gemeinsame Felder von Bild/Video auf dem Canvas (relativ 0–1) */
interface PlacedObject {
  relX: number
  relY: number
  relWidth: number
  relHeight: number
  rotation?: number
  settings?: Loose | null
  fotoSettings?: Loose | null
}

interface CanvasImage extends PlacedObject {
  imageObject?: HTMLImageElement | null
  name?: string | null
  timedAnimation?: Loose | null
}

interface CanvasVideo extends PlacedObject {
  videoElement?: HTMLVideoElement | null
  loop?: boolean
  muted?: boolean
  playbackRate?: number
  startTime?: number
  endTime?: number
}

export interface CapturedImage {
  src: string | null
  relX: number
  relY: number
  relWidth: number
  relHeight: number
  rotation: number
  settings: Loose | null
  fotoSettings: Loose | null
  /** nur Bilder: Animationen wie bei Texten (canvasObjects/imageAnimation) */
  timedAnimation?: Loose | null
  /** nur Bilder: Dateiname, falls bekannt (ältere Presets haben keinen) */
  name?: string
}

export interface CapturedVideo extends CapturedImage {
  loop: boolean
  muted: boolean
  playbackRate: number
  startTime: number
  endTime: number
}

export interface CanvasElementsSnapshot {
  images?: Partial<CapturedImage>[]
  videos?: Partial<CapturedVideo>[]
  texts?: Loose[]
  ticker?: Loose | null
}

/** Benötigter Ausschnitt des CanvasManagers (canvasManager/ ist noch JS) */
export interface ElementsCanvasManager {
  multiImageManager?: {
    getAllImages?(): CanvasImage[]
    clear?(): void
    restoreImage?(imageData: Loose, index: number): void
    fotoManager?: { initializeImageSettings(imageData: Loose): void } | null
  } | null
  videoManager?: {
    getAllVideos?(): CanvasVideo[]
    clear?(): void
    addVideo?(video: HTMLVideoElement, options: Loose): Promise<CanvasVideo | null | undefined>
  } | null
  textManager?: { textObjects: Loose[] } | null
  setActiveObject?(obj: null): void
  redrawCallback?: (() => void) | null
  updateUICallback?: (() => void) | null
}

type MaybeCm = ElementsCanvasManager | null | undefined
type TickerStoreLike = { $state: object; $patch(patch: Loose): void }

const DEFAULT_IMAGE_SETTINGS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
  blur: 0,
  preset: null,
})

/**
 * Erfasst alle Vordergrund-Bilder (multiImageManager) als serialisierbare
 * Liste: Bildquelle, Position/Größe/Rotation, Filter- und Foto-Einstellungen
 * inkl. Bild-Audio-Reaktiv.
 */
function captureCanvasImages(cm: MaybeCm): CapturedImage[] {
  const mgr = cm?.multiImageManager
  if (!mgr?.getAllImages) return []
  return mgr
    .getAllImages()
    .map((img) => ({
      src: img.imageObject?.src || null,
      ...(img.name ? { name: img.name } : {}),
      relX: img.relX,
      relY: img.relY,
      relWidth: img.relWidth,
      relHeight: img.relHeight,
      rotation: img.rotation || 0,
      settings: deepClone(img.settings),
      fotoSettings: deepClone(img.fotoSettings),
      ...(img.timedAnimation ? { timedAnimation: deepClone(img.timedAnimation) } : {}),
    }))
    .filter((i) => i.src)
}

/**
 * Erfasst alle Vordergrund-Videos (videoManager). Hinweis: `src` ist eine
 * Blob-URL und nur innerhalb der laufenden Sitzung gültig.
 */
function captureCanvasVideos(cm: MaybeCm): CapturedVideo[] {
  const mgr = cm?.videoManager
  if (!mgr?.getAllVideos) return []
  return mgr
    .getAllVideos()
    .map((v) => ({
      src: v.videoElement?.src || null,
      relX: v.relX,
      relY: v.relY,
      relWidth: v.relWidth,
      relHeight: v.relHeight,
      rotation: v.rotation || 0,
      loop: v.loop ?? true,
      muted: v.muted ?? true,
      playbackRate: v.playbackRate ?? 1.0,
      startTime: v.startTime ?? 0,
      endTime: v.endTime ?? 0,
      settings: deepClone(v.settings),
      fotoSettings: deepClone(v.fotoSettings),
    }))
    .filter((v) => v.src)
}

/**
 * Erfasst alle Texte (textManager) als tiefe Kopie (inkl. Position, Stil,
 * Animation und Text-Audio-Reaktiv). Texte enthalten keine DOM-Referenzen.
 */
function captureCanvasTexts(cm: MaybeCm): Loose[] {
  const tm = cm?.textManager
  if (!tm?.textObjects) return []
  return deepClone(tm.textObjects) || []
}

/** Erfasst den Lauftext (Ticker) inkl. aller Einstellungen und Audio-Reaktiv. */
function captureTicker(tickerStore: Pick<TickerStoreLike, '$state'>): Loose | null {
  try {
    return deepClone(tickerStore.$state as Loose)
  } catch {
    return null
  }
}

/**
 * Erfasst alle Vordergrund-Elemente (Bilder, Videos, Texte, Lauftext) im
 * Moment des Speicherns – für Canvas-Presets und Beat-Marker.
 */
export function captureCanvasElements(
  cm: MaybeCm,
  tickerStore: Pick<TickerStoreLike, '$state'>,
): Required<CanvasElementsSnapshot> {
  return {
    images: captureCanvasImages(cm),
    videos: captureCanvasVideos(cm),
    texts: captureCanvasTexts(cm),
    ticker: captureTicker(tickerStore),
  }
}

/** Lädt ein Bild (mit CORS-Fallback für Galerie-/Remote-Bilder). */
function loadImageElement(src: string, onload: (img: HTMLImageElement) => void) {
  const attempt = (useCors: boolean) => {
    const img = new Image()
    if (useCors) img.crossOrigin = 'anonymous'
    img.onload = () => onload(img)
    img.onerror = () => {
      if (useCors) attempt(false)
      else console.error('❌ Canvas-Preset: Bild konnte nicht geladen werden:', src)
    }
    img.src = src
  }
  attempt(!String(src).startsWith('data:'))
}

/** Entfernt alle Vordergrund-Elemente (Bilder, Videos, Texte) vom Canvas. */
function clearCanvasElements(cm: MaybeCm) {
  if (!cm) return
  cm.multiImageManager?.clear?.()
  cm.videoManager?.clear?.()
  if (cm.textManager) cm.textManager.textObjects = []
  cm.setActiveObject?.(null)
}

function restoreCanvasImages(cm: MaybeCm, list: unknown) {
  const mgr = cm?.multiImageManager
  if (!mgr?.restoreImage || !Array.isArray(list)) return
  ;(list as (Partial<CapturedImage> | null)[]).forEach((data, index) => {
    if (!data?.src) return
    loadImageElement(data.src, (img) => {
      const imageData: Loose = {
        id: Date.now() + Math.random(),
        type: 'image',
        imageObject: img,
        name: resolveImageName(data.name, img),
        relX: data.relX ?? 0.33,
        relY: data.relY ?? 0.33,
        relWidth: data.relWidth ?? 0.33,
        relHeight: data.relHeight ?? 0.33,
        rotation: data.rotation || 0,
        settings: deepClone(data.settings) || { ...DEFAULT_IMAGE_SETTINGS },
      }
      if (data.timedAnimation) imageData.timedAnimation = deepClone(data.timedAnimation)
      if (data.fotoSettings) {
        imageData.fotoSettings = deepClone(data.fotoSettings)
      } else if (mgr.fotoManager) {
        mgr.fotoManager.initializeImageSettings(imageData)
      }
      // Ursprüngliche Ebenen-Reihenfolge möglichst erhalten (Index geklemmt).
      mgr.restoreImage?.(imageData, index)
    })
  })
}

function restoreCanvasVideos(getCm: () => MaybeCm, list: unknown) {
  const mgr = getCm()?.videoManager
  if (!mgr?.addVideo || !Array.isArray(list)) return
  const addVideo = mgr.addVideo.bind(mgr)
  for (const data of list as (Partial<CapturedVideo> | null)[]) {
    if (!data?.src) continue
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.muted = data.muted ?? true
    video.loop = data.loop ?? true
    video.playsInline = true
    video.onloadedmetadata = async () => {
      try {
        const vid = await addVideo(video, {
          relX: data.relX,
          relY: data.relY,
          relWidth: data.relWidth,
          relHeight: data.relHeight,
          loop: data.loop,
          muted: data.muted,
          playbackRate: data.playbackRate,
          startTime: data.startTime,
          endTime: data.endTime,
        })
        if (vid) {
          if (data.rotation) vid.rotation = data.rotation
          if (data.settings) vid.settings = deepClone(data.settings)
          if (data.fotoSettings) vid.fotoSettings = deepClone(data.fotoSettings)
        }
        getCm()?.redrawCallback?.()
      } catch (e) {
        console.error('❌ Canvas-Preset: Video konnte nicht wiederhergestellt werden:', e)
      }
    }
    video.onerror = () => {
      console.error('❌ Canvas-Preset: Video konnte nicht geladen werden:', data.src)
    }
    video.src = data.src
    video.load()
  }
}

function restoreCanvasTexts(cm: MaybeCm, list: unknown) {
  const tm = cm?.textManager
  if (!tm || !Array.isArray(list)) return
  const texts = (deepClone(list) || []) as Loose[]
  // Animations-Zustand zurücksetzen, damit Animationen frisch abgespielt werden.
  texts.forEach((t) => {
    if (t.animation) {
      ;(t.animation as Loose)._state = { startTime: null, isPlaying: false, currentIndex: 0 }
    }
  })
  tm.textObjects = texts
}

/** Stellt den Lauftext (Ticker) inkl. Ein/Aus-Zustand und Einstellungen wieder her. */
function restoreTicker(
  tickerStore: Pick<TickerStoreLike, '$patch'>,
  data: Loose | null | undefined,
) {
  if (!data) return
  try {
    tickerStore.$patch(data)
  } catch (e) {
    console.warn('⚠️ Canvas-Preset: Lauftext konnte nicht wiederhergestellt werden:', e)
  }
}

/**
 * Stellt alle Canvas-Elemente aus einem Preset wieder her. Vorhandene
 * Vordergrund-Elemente werden zuvor entfernt (die Szene wird ersetzt).
 */
export function restoreCanvasElements(
  getCm: () => MaybeCm,
  elements: CanvasElementsSnapshot | null | undefined,
  tickerStore: Pick<TickerStoreLike, '$patch'>,
): void {
  if (!elements) return
  clearCanvasElements(getCm())
  restoreCanvasImages(getCm(), elements.images)
  restoreCanvasVideos(getCm, elements.videos)
  restoreCanvasTexts(getCm(), elements.texts)
  restoreTicker(tickerStore, elements.ticker)
  getCm()?.redrawCallback?.()
  getCm()?.updateUICallback?.()
}

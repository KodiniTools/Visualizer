import { slideshowStableKey } from './slideshow/slideshowImageKey'
import { diffAdjustments } from '../../lib/slideshowAdjustmentsPersistence'
import type { SlideshowManager } from '../../lib/slideshowManager'
import type { SlideshowSourceImage } from '../../lib/slideshowSources'
import type { RelBounds } from '../../lib/slideshowTransitions'
import type { useSlideshowImageAdjustmentsStore } from '../../stores/slideshowImageAdjustmentsStore'
import type { useSlideshowImageSettingsStore } from '../../stores/slideshowImageSettingsStore'

type AdjustmentsStore = ReturnType<typeof useSlideshowImageAdjustmentsStore>
type ImageSettingsStore = ReturnType<typeof useSlideshowImageSettingsStore>

/** Bild-Eintrag der Slideshow (Panel-Liste oder Preset-Slot) */
export type SlideshowImageEntry = Partial<SlideshowSourceImage>

/** Abhängigkeiten von createSlideshowAdjustmentsApi */
export interface SlideshowAdjustmentsApiDeps {
  getManager: () => SlideshowManager | null | undefined
  resolveImageObject: (img: SlideshowImageEntry) => HTMLImageElement | null | undefined
  withImageObject: (img: SlideshowImageEntry, fn: (obj: HTMLImageElement) => void) => void
  adjustmentsStore: AdjustmentsStore
  imageSettingsStore: ImageSettingsStore
  getDefaultSettings: () => Record<string, unknown> | undefined
}

/** Mittelpunkt (relativ 0–1) */
export interface SlideshowImagePosition {
  x?: number
  y?: number
}

/** Größe (relativ 0–1) + automatische Einpassung */
export interface SlideshowImageSize {
  width: number
  height: number
  defaultWidth: number
  defaultHeight: number
}

/** Neue Größe aus dem Bild-Editor */
export interface SlideshowImageSizeInput {
  width?: number
  height?: number
  keepAspect?: boolean
}

/**
 * Zugriff des Slideshow-Panels auf gemerkte Bild-Anpassungen, -Größen und
 * -Positionen (Presets speichern/laden, Bild-Editor). Liest zuerst den
 * Sitzungsspeicher der Slideshow, sonst die dauerhaft gemerkten Werte.
 *
 * @param {object} deps
 * @param {() => object|null} deps.getManager - SlideshowManager (wird bei Bedarf erzeugt)
 * @param {(img: object) => object|null} deps.resolveImageObject
 * @param {(img: object, fn: (obj: object) => void) => void} deps.withImageObject -
 *   führt fn mit dem (ggf. erst geladenen) Image-Objekt aus
 * @param {object} deps.adjustmentsStore - useSlideshowImageAdjustmentsStore()
 * @param {object} deps.imageSettingsStore - useSlideshowImageSettingsStore()
 * @param {() => object|undefined} deps.getDefaultSettings - Standard-Fotoeinstellungen
 */
export function createSlideshowAdjustmentsApi({
  getManager,
  resolveImageObject,
  withImageObject,
  adjustmentsStore,
  imageSettingsStore,
  getDefaultSettings,
}: SlideshowAdjustmentsApiDeps) {
  return {
    get(img: SlideshowImageEntry) {
      // Sitzungsspeicher der Slideshow, sonst dauerhaft gemerkte Anpassungen
      const live = getManager()?.getImageAdjustments(resolveImageObject(img))
      return live ?? adjustmentsStore.getAdjustments(slideshowStableKey(img))?.adjustments ?? null
    },
    set(img: SlideshowImageEntry, settings: object | null, audioMode?: string) {
      withImageObject(img, (obj) => {
        getManager()?.setImageAdjustments(obj, settings, audioMode)
        // Aus einem Preset übernommene Anpassungen ebenfalls dauerhaft merken
        adjustmentsStore.setAdjustments(
          slideshowStableKey({ ...img, imageObject: obj }),
          diffAdjustments(settings, getDefaultSettings()),
          audioMode,
        )
      })
    },
    getBounds(img: SlideshowImageEntry) {
      // Sitzungsspeicher der Slideshow, sonst dauerhaft gemerkte Größe/Position
      const live = getManager()?.getImageBounds(resolveImageObject(img))
      return live ?? imageSettingsStore.getImageSettings(slideshowStableKey(img))?.bounds ?? null
    },
    // Mittelpunkt (relativ 0–1) des Bildes auf der Canvas; null = nicht frei
    // positionierbar (Slideshow nicht aktiv oder Canvas-/Workspace-Hintergrund)
    getPosition(img: SlideshowImageEntry): { x: number; y: number } | null {
      const manager = getManager()
      const obj = resolveImageObject(img)
      if (!manager?.isActive || !obj || manager.isFittedToWorkspace()) return null
      const b = manager.getEffectiveImageBounds(obj)
      return b ? { x: b.relX + b.relWidth / 2, y: b.relY + b.relHeight / 2 } : null
    },
    setPosition(img: SlideshowImageEntry, { x, y }: SlideshowImagePosition = {}) {
      const obj = resolveImageObject(img)
      if (!obj) return
      getManager()?.setImagePosition(obj, { centerX: x, centerY: y })
    },
    // Größe (relativ 0–1) des Bildes + automatische Einpassung als Standard;
    // null = nicht frei skalierbar (wie getPosition)
    getSize(img: SlideshowImageEntry): SlideshowImageSize | null {
      const manager = getManager()
      const obj = resolveImageObject(img)
      if (!manager?.isActive || !obj || manager.isFittedToWorkspace()) return null
      const b = manager.getEffectiveImageBounds(obj)
      const fit = manager.getFittedImageBounds(obj)
      if (!b || !fit) return null
      return {
        width: b.relWidth,
        height: b.relHeight,
        defaultWidth: fit.relWidth,
        defaultHeight: fit.relHeight,
      }
    },
    setSize(img: SlideshowImageEntry, { width, height, keepAspect }: SlideshowImageSizeInput = {}) {
      const obj = resolveImageObject(img)
      if (!obj) return
      getManager()?.setImageSize(obj, { width, height, keepAspect })
    },
    setBounds(img: SlideshowImageEntry, bounds: Partial<RelBounds> | null | undefined) {
      withImageObject(img, (obj) => {
        getManager()?.setImageBounds(obj, bounds)
        // Aus einem Preset übernommene Größe/Position ebenfalls dauerhaft merken
        imageSettingsStore.updateImageSettings(slideshowStableKey({ ...img, imageObject: obj }), {
          bounds: bounds ?? null,
        })
      })
    },
  }
}

/**
 * Bündelt das dauerhafte Speichern eigener Bild-Größen/-Positionen: beim Ziehen
 * ändern sie sich bei jeder Mausbewegung, geschrieben wird erst nach `delay` ms
 * Ruhe (oder sofort über flush()).
 * @param {object} imageSettingsStore - useSlideshowImageSettingsStore()
 * @param {number} [delay]
 */
export function createBoundsPersistQueue(imageSettingsStore: ImageSettingsStore, delay = 300) {
  const pending = new Map<string, unknown>()
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (timer) clearTimeout(timer)
    timer = null
    for (const [key, bounds] of pending) {
      imageSettingsStore.updateImageSettings(key, { bounds: bounds ?? null })
    }
    pending.clear()
  }

  function queue(key: string | null | undefined, bounds: unknown) {
    if (!key) return
    pending.set(key, bounds)
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  /** Verwirft ausstehende Werte (z. B. beim Zurücksetzen aller Anpassungen). */
  function clear() {
    pending.clear()
  }

  return { queue, flush, clear }
}

export type SlideshowAdjustmentsApi = ReturnType<typeof createSlideshowAdjustmentsApi>
export type BoundsPersistQueue = ReturnType<typeof createBoundsPersistQueue>

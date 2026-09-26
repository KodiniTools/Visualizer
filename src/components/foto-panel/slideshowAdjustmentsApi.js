import { slideshowStableKey } from './slideshow/slideshowImageKey.js'
import { diffAdjustments } from '../../lib/slideshowAdjustmentsPersistence.js'

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
}) {
  return {
    get(img) {
      // Sitzungsspeicher der Slideshow, sonst dauerhaft gemerkte Anpassungen
      const live = getManager()?.getImageAdjustments(resolveImageObject(img))
      return live ?? adjustmentsStore.getAdjustments(slideshowStableKey(img))?.adjustments ?? null
    },
    set(img, settings, audioMode) {
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
    getBounds(img) {
      // Sitzungsspeicher der Slideshow, sonst dauerhaft gemerkte Größe/Position
      const live = getManager()?.getImageBounds(resolveImageObject(img))
      return live ?? imageSettingsStore.getImageSettings(slideshowStableKey(img))?.bounds ?? null
    },
    // Mittelpunkt (relativ 0–1) des Bildes auf der Canvas; null = nicht frei
    // positionierbar (Slideshow nicht aktiv oder Canvas-/Workspace-Hintergrund)
    getPosition(img) {
      const manager = getManager()
      const obj = resolveImageObject(img)
      if (!manager?.isActive || !obj || manager.isFittedToWorkspace()) return null
      const b = manager.getEffectiveImageBounds(obj)
      return b ? { x: b.relX + b.relWidth / 2, y: b.relY + b.relHeight / 2 } : null
    },
    setPosition(img, { x, y } = {}) {
      const obj = resolveImageObject(img)
      if (!obj) return
      getManager()?.setImagePosition(obj, { centerX: x, centerY: y })
    },
    // Größe (relativ 0–1) des Bildes + automatische Einpassung als Standard;
    // null = nicht frei skalierbar (wie getPosition)
    getSize(img) {
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
    setSize(img, { width, height, keepAspect } = {}) {
      const obj = resolveImageObject(img)
      if (!obj) return
      getManager()?.setImageSize(obj, { width, height, keepAspect })
    },
    setBounds(img, bounds) {
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
export function createBoundsPersistQueue(imageSettingsStore, delay = 300) {
  const pending = new Map()
  let timer = null

  function flush() {
    clearTimeout(timer)
    timer = null
    for (const [key, bounds] of pending) {
      imageSettingsStore.updateImageSettings(key, { bounds: bounds ?? null })
    }
    pending.clear()
  }

  function queue(key, bounds) {
    if (!key) return
    pending.set(key, bounds)
    clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  /** Verwirft ausstehende Werte (z. B. beim Zurücksetzen aller Anpassungen). */
  function clear() {
    pending.clear()
  }

  return { queue, flush, clear }
}

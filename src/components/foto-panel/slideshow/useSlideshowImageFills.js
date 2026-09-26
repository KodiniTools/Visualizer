/**
 * Zustand der eigenen Flächenbilder (Canvas/Workspace) im Slideshow-Panel:
 * Einstellung (dauerhaft gemerkt), geladenes Bild-Objekt, Auswahl aus
 * Upload-/Stock-Galerie und Weitergabe an die Slideshow.
 */
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import {
  hasSlideshowImageRef,
  loadStoredSlideshowImageFill,
  normalizeSlideshowImageFill,
  storeSlideshowImageFill,
} from '../../../lib/slideshowImageFill.js'
import { normalizeStockRef } from '../../../lib/slideshowImageRefs.js'

export const IMAGE_FILL_TARGETS = Object.freeze(['canvas', 'workspace'])

function refKey(fill) {
  if (fill?.stock) return `stock:${fill.stock.id}`
  if (fill?.upload) return `upload:${fill.upload.key}`
  return ''
}

/**
 * @param {object} deps
 * @param {(target:string, fill:object, image:HTMLImageElement|null) => void} deps.onChange
 * @param {(key:string) => Promise<{imageObject:HTMLImageElement,name:string}|null>} deps.loadUpload
 * @param {(entry:object) => Promise<{key:string,name:string}>} deps.persistUpload
 * @param {(stock:object) => Promise<HTMLImageElement>} deps.loadStock
 * @param {(name:string) => void} [deps.onMissing] - Bild nicht (mehr) ladbar
 * @param {(error:unknown) => void} [deps.onError] - Auswahl fehlgeschlagen
 */
export function useSlideshowImageFills(deps) {
  const fills = {
    canvas: ref(loadStoredSlideshowImageFill('canvas')),
    workspace: ref(loadStoredSlideshowImageFill('workspace')),
  }
  const images = { canvas: shallowRef(null), workspace: shallowRef(null) }
  // Zu welchem Verweis das geladene Bild gehört (vermeidet unnötiges Neuladen)
  const loadedFor = { canvas: '', workspace: '' }
  const tokens = { canvas: 0, workspace: 0 }
  const loading = reactive({ canvas: false, workspace: false })

  function emitChange(target) {
    deps.onChange(target, { ...fills[target].value }, images[target].value)
  }

  async function resolve(fill) {
    if (fill.stock) return deps.loadStock(fill.stock)
    if (fill.upload) return (await deps.loadUpload(fill.upload.key))?.imageObject ?? null
    return null
  }

  /** Lädt das Bild zum aktuellen Verweis (nur wenn eingeschaltet). */
  async function load(target) {
    const fill = fills[target].value
    const key = refKey(fill)
    if (!fill.enabled || !key) {
      emitChange(target)
      return
    }
    if (loadedFor[target] === key && images[target].value) {
      emitChange(target)
      return
    }
    const token = ++tokens[target]
    loading[target] = true
    let image = null
    try {
      image = await resolve(fill)
    } catch (e) {
      console.warn('[SlideshowImageFill] Bild nicht ladbar:', e)
    }
    if (token !== tokens[target]) return // inzwischen anderes Bild gewählt
    loading[target] = false
    images[target].value = image || null
    loadedFor[target] = image ? key : ''
    if (!image) deps.onMissing?.(fill.stock?.name || fill.upload?.name || '')
    emitChange(target)
  }

  for (const target of IMAGE_FILL_TARGETS) {
    watch(fills[target], (fill) => {
      storeSlideshowImageFill(fill, target)
      load(target)
    })
  }

  /** Teilweise ändern (enabled, fit, audio …). */
  function update(target, partial) {
    fills[target].value = normalizeSlideshowImageFill(
      { ...fills[target].value, ...partial },
      fills[target].value,
    )
  }

  /**
   * Bild aus der Galerie wählen. Hochgeladene Bilder werden dauerhaft
   * gespeichert (IndexedDB), Stock-Bilder per Verweis gemerkt.
   * @param {'canvas'|'workspace'} target
   * @param {{ source:'upload'|'stock', name?:string, img?:HTMLImageElement, stockImage?:object }} candidate
   */
  async function select(target, candidate) {
    try {
      if (candidate?.source === 'stock') {
        const stock = normalizeStockRef(candidate.stockImage)
        if (!stock) throw new Error('Ungültiges Stock-Bild')
        update(target, { enabled: true, stock, upload: null })
        return
      }
      const image = candidate?.img || candidate?.imageObject
      if (!image) throw new Error('Kein Bild')
      const saved = await deps.persistUpload({ name: candidate.name, imageObject: image })
      if (!saved?.key) throw new Error('Bild konnte nicht gespeichert werden')
      // Bild direkt übernehmen (kein Neuladen aus IndexedDB nötig)
      images[target].value = image
      loadedFor[target] = `upload:${saved.key}`
      update(target, { enabled: true, stock: null, upload: saved })
    } catch (e) {
      console.warn('[SlideshowImageFill] Auswahl fehlgeschlagen:', e)
      deps.onError?.(e)
    }
  }

  /** Bild entfernen (Einstellungen wie Anpassen/Audio bleiben). */
  function clear(target) {
    tokens[target]++
    images[target].value = null
    loadedFor[target] = ''
    loading[target] = false
    update(target, { stock: null, upload: null })
  }

  /** Einstellung aus einem Preset übernehmen (lädt das Bild nach). */
  function apply(target, fill) {
    fills[target].value = normalizeSlideshowImageFill(fill)
  }

  /** Vorschau des gewählten Bildes (Stock-Thumbnail oder geladenes Bild). */
  function thumbOf(target) {
    const fill = fills[target].value
    return fill.stock?.thumbnail || images[target].value?.src || ''
  }

  const hasImage = computed(() => ({
    canvas: hasSlideshowImageRef(fills.canvas.value),
    workspace: hasSlideshowImageRef(fills.workspace.value),
  }))

  /** Für Start/Live-Payload. */
  function payload() {
    return {
      backgroundImageFill: { ...fills.canvas.value },
      workspaceImageFill: { ...fills.workspace.value },
      backgroundImageObject: images.canvas.value,
      workspaceImageObject: images.workspace.value,
    }
  }

  // Gemerkte Bilder beim Öffnen laden
  for (const target of IMAGE_FILL_TARGETS) {
    if (fills[target].value.enabled && hasSlideshowImageRef(fills[target].value)) load(target)
  }

  return { fills, images, loading, hasImage, update, select, clear, apply, thumbOf, payload }
}

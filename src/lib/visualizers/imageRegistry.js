/**
 * Registry of images available to image-based ("portrait") GPU presets.
 *
 * Images come from two places: files the user picks in the visualizer panel
 * (kept as ImageBitmaps + object URLs) and images already placed on the
 * canvas (registered on demand with a `canvas:` prefixed id, sharing the
 * canvas's HTMLImageElement). The registry is realm-local; the worker gets
 * its own ImageBitmap copy from the render loop.
 *
 * @module visualizers/imageRegistry
 */

import { ref } from 'vue'

/** @typedef {{id: string, name: string, source: ImageBitmap|HTMLImageElement, url?: string, kind: 'upload'|'canvas'|'gallery'}} VisualizerImage */

const images = new Map()
/** Reactive list of registered images (for pickers). */
export const visualizerImages = ref([])
let counter = 1

function publish() {
  visualizerImages.value = [...images.values()].map(({ id, name, kind }) => ({ id, name, kind }))
}

/**
 * @param {{name: string, source: ImageBitmap|HTMLImageElement, url?: string, kind?: 'upload'|'canvas', id?: string}} entry
 * @returns {string} the image id
 */
export function registerVisualizerImage(entry) {
  if (!entry || !entry.source) throw new Error('registerVisualizerImage: source fehlt')
  const id = entry.id || `img_${Date.now()}_${counter++}`
  images.set(id, {
    id,
    name: entry.name || id,
    source: entry.source,
    url: entry.url,
    kind: entry.kind || 'upload',
  })
  publish()
  return id
}

/** @param {string|null|undefined} id */
export function getVisualizerImage(id) {
  if (!id) return null
  return images.get(id) || null
}

/** @param {string|null|undefined} id */
export function getVisualizerImageSource(id) {
  return getVisualizerImage(id)?.source || null
}

/** @param {string} id */
export function removeVisualizerImage(id) {
  const entry = images.get(id)
  if (!entry) return false
  images.delete(id)
  if (entry.url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
    try {
      URL.revokeObjectURL(entry.url)
    } catch {
      /* bewusst ignoriert */
    }
  }
  if (entry.kind === 'upload' && entry.source && typeof entry.source.close === 'function') {
    try {
      entry.source.close()
    } catch {
      /* bewusst ignoriert */
    }
  }
  publish()
  return true
}

/** Clear everything (tests / teardown). */
export function clearVisualizerImages() {
  for (const id of [...images.keys()]) removeVisualizerImage(id)
}

/**
 * Register (or refresh) a canvas image so presets can use it. Idempotent per
 * canvas image id.
 * @param {{id: string|number, imageObject: HTMLImageElement, name?: string}} canvasImage
 * @returns {string|null}
 */
export function registerCanvasImage(canvasImage) {
  if (!canvasImage || !canvasImage.imageObject) return null
  const id = `canvas:${canvasImage.id}`
  const existing = images.get(id)
  if (existing && existing.source === canvasImage.imageObject) return id
  return registerVisualizerImage({
    id,
    name: canvasImage.name || canvasImage.imageObject?.alt || `Leinwand-Bild`,
    source: canvasImage.imageObject,
    kind: 'canvas',
  })
}

/**
 * Register (or refresh) a gallery image ("Eigene Bilder"). Idempotent per
 * gallery entry id.
 * @param {{id: string|number, img: HTMLImageElement, name?: string}} galleryImage
 * @returns {string|null}
 */
export function registerGalleryImage(galleryImage) {
  if (!galleryImage || !galleryImage.img) return null
  const id = `gallery:${galleryImage.id}`
  const existing = images.get(id)
  if (existing && existing.source === galleryImage.img) return id
  return registerVisualizerImage({
    id,
    name: galleryImage.name || 'Galerie-Bild',
    source: galleryImage.img,
    kind: 'gallery',
  })
}

/**
 * Resolve the image a portrait preset should use: the explicitly chosen one
 * when it exists, otherwise the first image on the canvas, otherwise the
 * selected gallery image, otherwise the first gallery image. Registers the
 * fallback on the fly so the id is stable. Returns null when nothing exists.
 *
 * @param {string|null|undefined} preferredId
 * @param {{canvasImages?: Array, selectedGalleryImage?: object|null, galleryImages?: Array}} [sources]
 * @returns {string|null}
 */
export function resolveEffectiveImageId(preferredId, sources = {}) {
  if (preferredId && images.has(preferredId)) return preferredId
  const canvas = sources.canvasImages || []
  for (const c of canvas) {
    const id = registerCanvasImage(c)
    if (id) return id
  }
  if (sources.selectedGalleryImage) {
    const id = registerGalleryImage(sources.selectedGalleryImage)
    if (id) return id
  }
  for (const g of sources.galleryImages || []) {
    const id = registerGalleryImage(g)
    if (id) return id
  }
  return null
}

/**
 * Register a picked file. Resolves with the image id.
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export async function registerImageFile(file) {
  if (!file) throw new Error('registerImageFile: keine Datei')
  const bitmap = await createImageBitmap(file)
  const url =
    typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : undefined
  return registerVisualizerImage({ name: file.name || 'Bild', source: bitmap, url, kind: 'upload' })
}

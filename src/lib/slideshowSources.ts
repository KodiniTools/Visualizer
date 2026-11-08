/**
 * Bildquellen der Slideshow: hochgeladene Bilder + Stock-Bilder.
 *
 * Einträge haben die Form
 *   { id, name, source: 'upload' | 'stock', imageObject?, stockImage?, thumbnail? }
 * – bei Stock-Bildern kann `imageObject` fehlen, bis das Bild geladen ist.
 */
import type { StockImageRef, UploadImageRef } from './slideshowImageRefs'

/** Stock-Bild (Katalog-Eintrag) */
export interface StockImageInfo {
  id: string
  name?: string
  file?: string
  thumbnail?: string
}

/** Bild-Eintrag in der Slideshow-Auswahl */
export interface SlideshowSourceImage {
  id: string | number
  name?: string
  source: string
  imageObject?: HTMLImageElement | null
  img?: HTMLImageElement | null
  stockImage?: StockImageInfo
  thumbnail?: string
}

/** Upload aus der Galerie */
export interface SlideshowUpload {
  id: string | number
  name?: string
  img?: HTMLImageElement | null
}

/** Gespeicherter Preset-Slot */
export interface PresetImageSlot {
  stock?: StockImageRef | null
  upload?: UploadImageRef | null
}

/** Aus IndexedDB geladenes Preset-Bild */
export interface StoredPresetImage {
  imageObject?: HTMLImageElement | null
  galleryId?: string | number | null
  name?: string
}

export type GetLoadedStock = (id: string) => HTMLImageElement | null | undefined

export interface RestorePresetImagesDeps {
  getLoadedStock?: GetLoadedStock
  loadUpload?: (key: string) => Promise<StoredPresetImage | null | undefined>
}

const noStock: GetLoadedStock = () => null

/** Bild-Eintrag mit zugehörigem Slot (Slot kann leer sein) */
export interface PresetImagePair {
  img: SlideshowSourceImage | null | undefined
  slot: PresetImageSlot | null | undefined
}

/**
 * Dateiname ohne Pfad/Query, klein geschrieben (für die Duplikaterkennung).
 * @param {string|undefined} value
 * @returns {string}
 */
export function fileBaseName(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const clean = value.split(/[?#]/)[0] as string
  return (clean.split('/').pop() || '').trim().toLowerCase()
}

/**
 * Führt ausgewählte hochgeladene und Stock-Bilder zusammen. Dasselbe Motiv in
 * beiden Galerien (gleicher Dateiname) wird nur einmal übernommen – das
 * hochgeladene Bild hat Vorrang.
 * @param {Array<{id:string, name:string, img:HTMLImageElement}>} uploads
 * @param {Array<{id:string, name:string, file:string, thumbnail?:string}>} stocks
 * @param {(id:string) => HTMLImageElement|null} [getLoadedStock]
 * @returns {Array<object>}
 */
export function buildSlideshowSourceImages(
  uploads: (SlideshowUpload | null | undefined)[] = [],
  stocks: (StockImageInfo | null | undefined)[] = [],
  getLoadedStock: GetLoadedStock = noStock,
): SlideshowSourceImage[] {
  const result: SlideshowSourceImage[] = []
  const seen = new Set<string>()

  for (const u of uploads) {
    if (!u) continue
    const key = fileBaseName(u.name)
    if (key) seen.add(key)
    result.push({ id: u.id, name: u.name, source: 'upload', imageObject: u.img })
  }

  for (const st of stocks) {
    if (!st?.id) continue
    const key = fileBaseName(st.file) || fileBaseName(st.name)
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    result.push({
      id: `stock:${st.id}`,
      name: st.name,
      source: 'stock',
      stockImage: st,
      thumbnail: st.thumbnail || st.file,
      imageObject: getLoadedStock(st.id) || undefined,
    })
  }
  return result
}

/**
 * Image-Objekt eines Slideshow-Eintrags (ggf. aus dem Stock-Cache).
 * @param {object} entry
 * @param {(id:string) => HTMLImageElement|null} [getLoadedStock]
 * @returns {HTMLImageElement|null}
 */
export function resolveSlideshowImageObject(
  entry: SlideshowSourceImage | null | undefined,
  getLoadedStock: GetLoadedStock = noStock,
): HTMLImageElement | null {
  if (!entry) return null
  return (
    entry.imageObject ||
    entry.img ||
    (entry.stockImage?.id ? getLoadedStock(entry.stockImage.id) : null) ||
    null
  )
}

/**
 * Lädt fehlende Stock-Bilder nach. Nicht ladbare Bilder werden ausgelassen.
 * @param {Array<object>} entries
 * @param {(stockImage:object) => Promise<HTMLImageElement>} loadStock
 * @param {(id:string) => HTMLImageElement|null} [getLoadedStock]
 * @returns {Promise<{ images: Array<object>, failed: string[] }>}
 */
export async function ensureSlideshowImagesLoaded(
  entries: SlideshowSourceImage[],
  loadStock: (stock: StockImageInfo) => Promise<HTMLImageElement>,
  getLoadedStock: GetLoadedStock = noStock,
): Promise<{ images: SlideshowSourceImage[]; failed: (string | undefined)[] }> {
  const failed: (string | undefined)[] = []
  const images = await Promise.all(
    entries.map(async (entry) => {
      const existing = resolveSlideshowImageObject(entry, getLoadedStock)
      if (existing) return { ...entry, imageObject: existing }
      if (!entry.stockImage) {
        failed.push(entry.name)
        return null
      }
      try {
        const img = await loadStock(entry.stockImage)
        return { ...entry, imageObject: img }
      } catch (e) {
        console.warn('[Slideshow] Stock-Bild konnte nicht geladen werden:', entry.name, e)
        failed.push(entry.name)
        return null
      }
    }),
  )
  return { images: images.filter(Boolean) as SlideshowSourceImage[], failed }
}

/**
 * Slideshow-Eintrag aus einem gespeicherten Stock-Verweis (Preset).
 * @param {{ id:string, name?:string, file:string, thumbnail?:string }} ref
 * @param {(id:string) => HTMLImageElement|null} [getLoadedStock]
 * @returns {object}
 */
export function stockEntryFromRef(
  ref: StockImageRef,
  getLoadedStock: GetLoadedStock = noStock,
): SlideshowSourceImage & { stockImage: StockImageInfo } {
  const stockImage = {
    id: ref.id,
    name: ref.name || ref.id,
    file: ref.file,
    thumbnail: ref.thumbnail || ref.file,
  }
  return {
    id: `stock:${ref.id}`,
    name: stockImage.name,
    source: 'stock',
    stockImage,
    thumbnail: stockImage.thumbnail,
    imageObject: getLoadedStock(ref.id) || undefined,
  }
}

/**
 * Stellt die Bildliste eines Presets aus dauerhaft gespeicherten Verweisen wieder
 * her: Stock-Bilder aus dem Galerie-Pfad, hochgeladene Bilder aus IndexedDB
 * (`loadUpload`). Positionen ohne (ladbaren) Verweis werden der Reihe nach mit
 * den aktuell ausgewählten hochgeladenen Bildern belegt; fehlen solche, entfällt
 * die Position.
 * @param {Array<object>} slots - Preset-Slots
 * @param {Array<object>} currentImages - aktuelle Auswahl (Slideshow-Einträge)
 * @param {{ getLoadedStock?: Function, loadUpload?: (key:string) => Promise<{imageObject:HTMLImageElement, name:string, galleryId?:number}|null> }} [deps]
 * @returns {Promise<{ pairs: Array<{ img:object, slot:object }>, missing: string[] }|null>}
 *   null, wenn das Preset keine Bild-Verweise hat
 */
export async function restorePresetImages(
  slots: unknown,
  currentImages: (SlideshowSourceImage | null | undefined)[] = [],
  deps: RestorePresetImagesDeps = {},
): Promise<{
  pairs: PresetImagePair[]
  missing: string[]
} | null> {
  const { getLoadedStock = noStock, loadUpload = async () => null } = deps
  if (!Array.isArray(slots)) return null
  // Slots stammen aus gespeicherten Presets (Form wie PresetImageSlot)
  const list = slots as (PresetImageSlot | null | undefined)[]
  if (!list.some((slot) => slot?.stock || slot?.upload)) return null

  // Gespeicherte Uploads parallel laden
  const loadedUploads = await Promise.all(
    list.map(async (slot) => {
      if (!slot?.upload?.key) return null
      try {
        return await loadUpload(slot.upload.key)
      } catch (e) {
        console.warn('[Slideshow] Gespeichertes Bild nicht ladbar:', slot.upload.name, e)
        return null
      }
    }),
  )

  const uploads = currentImages.filter((img) => img?.source !== 'stock')
  const pairs: PresetImagePair[] = []
  const missing: string[] = []
  list.forEach((slot, i) => {
    if (slot?.stock) {
      pairs.push({ img: stockEntryFromRef(slot.stock, getLoadedStock), slot })
      return
    }
    const stored = loadedUploads[i]
    if (stored?.imageObject) {
      // nur Slots mit upload.key wurden geladen
      const upload = (slot as PresetImageSlot).upload as UploadImageRef
      pairs.push({
        img: {
          // Galerie-ID, wenn das Bild in der Upload-Galerie liegt
          id: stored.galleryId ?? `preset:${upload.key}`,
          name: upload.name || stored.name,
          source: 'upload',
          imageObject: stored.imageObject,
        },
        slot,
      })
      return
    }
    if (slot?.upload) missing.push(slot.upload.name || slot.upload.key)
    if (uploads.length > 0) pairs.push({ img: uploads.shift(), slot })
  })
  return { pairs, missing }
}

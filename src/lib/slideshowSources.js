/**
 * Bildquellen der Slideshow: hochgeladene Bilder + Stock-Bilder.
 *
 * Einträge haben die Form
 *   { id, name, source: 'upload' | 'stock', imageObject?, stockImage?, thumbnail? }
 * – bei Stock-Bildern kann `imageObject` fehlen, bis das Bild geladen ist.
 */

/**
 * Dateiname ohne Pfad/Query, klein geschrieben (für die Duplikaterkennung).
 * @param {string|undefined} value
 * @returns {string}
 */
export function fileBaseName(value) {
  if (typeof value !== 'string' || !value) return ''
  const clean = value.split(/[?#]/)[0]
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
export function buildSlideshowSourceImages(uploads = [], stocks = [], getLoadedStock = () => null) {
  const result = []
  const seen = new Set()

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
export function resolveSlideshowImageObject(entry, getLoadedStock = () => null) {
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
export async function ensureSlideshowImagesLoaded(entries, loadStock, getLoadedStock = () => null) {
  const failed = []
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
  return { images: images.filter(Boolean), failed }
}

/**
 * Slideshow-Eintrag aus einem gespeicherten Stock-Verweis (Preset).
 * @param {{ id:string, name?:string, file:string, thumbnail?:string }} ref
 * @param {(id:string) => HTMLImageElement|null} [getLoadedStock]
 * @returns {object}
 */
export function stockEntryFromRef(ref, getLoadedStock = () => null) {
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
 * Stellt die Bildliste eines Presets aus dauerhaft gespeicherten Stock-Verweisen
 * wieder her. Positionen ohne Stock-Verweis (hochgeladene Bilder – deren Dateien
 * werden nicht gespeichert) werden der Reihe nach mit den aktuell ausgewählten
 * hochgeladenen Bildern belegt; fehlen solche, entfällt die Position.
 * @param {Array<object>} slots - Preset-Slots
 * @param {Array<object>} currentImages - aktuelle Auswahl (Slideshow-Einträge)
 * @param {(id:string) => HTMLImageElement|null} [getLoadedStock]
 * @returns {Array<{ img:object, slot:object }>|null} null, wenn das Preset keine Stock-Verweise hat
 */
export function restorePresetImages(slots, currentImages = [], getLoadedStock = () => null) {
  if (!Array.isArray(slots) || !slots.some((slot) => slot?.stock)) return null
  const uploads = currentImages.filter((img) => img?.source !== 'stock')
  const pairs = []
  for (const slot of slots) {
    if (slot?.stock) {
      pairs.push({ img: stockEntryFromRef(slot.stock, getLoadedStock), slot })
    } else if (uploads.length > 0) {
      pairs.push({ img: uploads.shift(), slot })
    }
  }
  return pairs
}

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

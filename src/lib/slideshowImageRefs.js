/**
 * Bereinigung dauerhaft gespeicherter Bild-Verweise der Slideshow
 * (Stock-Bilder per Galerie-Pfad, hochgeladene Bilder per IndexedDB-Schlüssel).
 * Eigenes Modul, damit Store und Flächenbild ohne Import-Zyklus darauf zugreifen.
 */

// Stock-Pfade: nur relative Pfade innerhalb der Galerie (kein Schema, kein „..“)
const STOCK_PATH_RE = /^(\.\/)?gallery\/[\w\-./ %äöüÄÖÜß]+$/
const STOCK_ID_RE = /^[\w.-]{1,120}$/

function isStockPath(value) {
  return typeof value === 'string' && STOCK_PATH_RE.test(value) && !value.includes('..')
}

/**
 * Bereinigt einen dauerhaft gespeicherten Stock-Bild-Verweis.
 * @param {unknown} raw
 * @returns {{ id:string, name:string, file:string, thumbnail:string }|null}
 */
export function normalizeStockRef(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.id !== 'string' || !STOCK_ID_RE.test(raw.id)) return null
  if (!isStockPath(raw.file)) return null
  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 100) : raw.id
  return {
    id: raw.id,
    name,
    file: raw.file,
    thumbnail: isStockPath(raw.thumbnail) ? raw.thumbnail : raw.file,
  }
}

const UPLOAD_KEY_RE = /^([0-9a-f]{64}|fnv-[0-9a-f]{1,8}-\d{1,12})$/

/**
 * Bereinigt einen Verweis auf ein dauerhaft gespeichertes hochgeladenes Bild
 * (Schlüssel in IndexedDB, siehe presetImageRepository).
 * @param {unknown} raw
 * @returns {{ key:string, name:string }|null}
 */
export function normalizeUploadRef(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.key !== 'string' || !UPLOAD_KEY_RE.test(raw.key)) return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 200) : ''
  return { key: raw.key, name }
}

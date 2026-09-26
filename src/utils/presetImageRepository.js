/**
 * Preset Image Repository – dauerhafte Ablage hochgeladener Bilder für
 * Slideshow-Presets in IndexedDB (localStorage ist für Bilddateien zu klein).
 *
 * Schlüssel = SHA-256 des Dateiinhalts: dasselbe Bild wird nur einmal
 * gespeichert, auch wenn es in mehreren Presets vorkommt.
 */

const DB_NAME = 'visualizer-slideshow-images'
const STORE_NAME = 'images'
const DB_VERSION = 1

// Geladene Bilder pro Schlüssel (für die Sitzung) – dasselbe Image-Objekt bei
// wiederholtem Laden, damit gemerkte Bild-Anpassungen gültig bleiben
const imageCache = new Map()

function getIndexedDB() {
  return typeof indexedDB !== 'undefined' ? indexedDB : null
}

function openDB() {
  const idb = getIndexedDB()
  if (!idb) return Promise.reject(new Error('IndexedDB nicht verfügbar'))
  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Führt fn(store) in einer Transaktion aus und löst mit dem Ergebnis auf. */
async function withStore(mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    let result
    try {
      result = fn(tx.objectStore(STORE_NAME))
    } catch (e) {
      db.close()
      reject(e)
      return
    }
    tx.oncomplete = () => {
      db.close()
      resolve(result && 'result' in result ? result.result : result)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error || new Error('Transaktion abgebrochen'))
    }
  })
}

/** Blob-Inhalt lesen (Fallback für Umgebungen ohne Blob.arrayBuffer). */
function readArrayBuffer(blob) {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function hashBlob(blob) {
  const buffer = await readArrayBuffer(blob)
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback ohne WebCrypto: FNV-1a über den Inhalt + Größe
  const bytes = new Uint8Array(buffer)
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `fnv-${h.toString(16)}-${bytes.length}`
}

/**
 * Liest den Inhalt eines geladenen Bildes als Blob (data:- oder blob:-URL).
 * @param {HTMLImageElement} imageObject
 * @returns {Promise<Blob>}
 */
export async function blobFromImage(imageObject) {
  const src = imageObject?.src
  if (!src) throw new Error('Bild hat keine Quelle')
  const response = await fetch(src)
  if (!response.ok && response.status !== 0)
    throw new Error(`Bild nicht lesbar (${response.status})`)
  return response.blob()
}

/**
 * Speichert ein Bild dauerhaft und liefert seinen Schlüssel.
 * @param {Blob} blob
 * @param {string} name - Dateiname (Anzeige)
 * @returns {Promise<string>} Schlüssel
 */
export async function saveImageBlob(blob, name) {
  const key = await hashBlob(blob)
  await withStore('readwrite', (store) =>
    store.put({ key, blob, name: String(name || ''), type: blob.type, savedAt: Date.now() }),
  )
  return key
}

/**
 * Lädt ein gespeichertes Bild als Image-Objekt (pro Sitzung zwischengespeichert).
 * @param {string} key
 * @returns {Promise<{ imageObject: HTMLImageElement, name: string }|null>} null, wenn nicht vorhanden
 */
export async function loadImage(key) {
  if (imageCache.has(key)) return imageCache.get(key)
  const promise = (async () => {
    const record = await withStore('readonly', (store) => store.get(key))
    if (!record?.blob) return null
    const dataUrl = await blobToDataUrl(record.blob)
    const imageObject = await createImage(dataUrl)
    return { imageObject, name: record.name }
  })()
  imageCache.set(key, promise)
  try {
    const result = await promise
    if (!result) imageCache.delete(key)
    return result
  } catch (e) {
    imageCache.delete(key)
    throw e
  }
}

/**
 * Löscht alle gespeicherten Bilder, deren Schlüssel nicht in `keepKeys` steht.
 * @param {Iterable<string>} keepKeys - noch von Presets verwendete Schlüssel
 * @returns {Promise<number>} Anzahl gelöschter Bilder
 */
export async function pruneImages(keepKeys) {
  const keep = new Set(keepKeys)
  const keys = await withStore('readonly', (store) => store.getAllKeys())
  const remove = (keys || []).filter((k) => !keep.has(k))
  if (remove.length === 0) return 0
  await withStore('readwrite', (store) => {
    for (const k of remove) store.delete(k)
  })
  for (const k of remove) imageCache.delete(k)
  return remove.length
}

/** Nur für Tests: Sitzungs-Cache leeren. */
export function _clearImageCache() {
  imageCache.clear()
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function createImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gespeichertes Bild konnte nicht geladen werden'))
    img.src = src
  })
}

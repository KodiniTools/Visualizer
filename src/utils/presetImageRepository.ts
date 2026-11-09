/**
 * Preset Image Repository – dauerhafte Ablage hochgeladener Bilder für
 * Slideshow-Presets in IndexedDB (localStorage ist für Bilddateien zu klein).
 *
 * Schlüssel = SHA-256 des Dateiinhalts: dasselbe Bild wird nur einmal
 * gespeichert, auch wenn es in mehreren Presets vorkommt.
 */

const DB_NAME = 'visualizer-slideshow-images'
const STORE_NAME = 'images'
// v2: Index auf savedAt (Schutzfrist beim automatischen Aufräumen)
const DB_VERSION = 2
const SAVED_AT_INDEX = 'savedAt'

// Geladene Bilder pro Schlüssel (für die Sitzung) – dasselbe Image-Objekt bei
// wiederholtem Laden, damit gemerkte Bild-Anpassungen gültig bleiben
export interface LoadedImage {
  imageObject: HTMLImageElement
  name: string
}

/** Gespeicherter Datensatz in IndexedDB */
interface ImageRecord {
  key: string
  blob: Blob
  name: string
  type: string
  size: number
  savedAt: number
}

export interface ImageStorageStats {
  count: number
  bytes: number
}

const imageCache = new Map<string, Promise<LoadedImage | null>>()

function getIndexedDB(): IDBFactory | null {
  return typeof indexedDB !== 'undefined' ? indexedDB : null
}

function openDB(): Promise<IDBDatabase> {
  const idb = getIndexedDB()
  if (!idb) return Promise.reject(new Error('IndexedDB nicht verfügbar'))
  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      // Während onupgradeneeded ist request.transaction die Upgrade-Transaktion
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? (request.transaction as IDBTransaction).objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      if (!store.indexNames.contains(SAVED_AT_INDEX)) {
        store.createIndex(SAVED_AT_INDEX, 'savedAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Führt fn(store) in einer Transaktion aus und löst mit dem Ergebnis auf. */
async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => T,
): Promise<T extends IDBRequest<infer R> ? R : T> {
  type Result = T extends IDBRequest<infer R> ? R : T
  const db = await openDB()
  return new Promise<Result>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    let result: T
    try {
      result = fn(tx.objectStore(STORE_NAME))
    } catch (e) {
      db.close()
      reject(e)
      return
    }
    tx.oncomplete = () => {
      db.close()
      // IDBRequest → dessen Ergebnis, sonst der Rückgabewert von fn selbst
      resolve(
        (result && typeof result === 'object' && 'result' in result
          ? (result as unknown as IDBRequest).result
          : result) as Result,
      )
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
function readArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await readArrayBuffer(blob)
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback ohne WebCrypto: FNV-1a über den Inhalt + Größe
  const bytes = new Uint8Array(buffer)
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i] as number
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `fnv-${h.toString(16)}-${bytes.length}`
}

/**
 * Liest den Inhalt eines geladenen Bildes als Blob (data:- oder blob:-URL).
 * @param {HTMLImageElement} imageObject
 * @returns {Promise<Blob>}
 */
export async function blobFromImage(
  imageObject: HTMLImageElement | null | undefined,
): Promise<Blob> {
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
export async function saveImageBlob(blob: Blob, name?: unknown): Promise<string> {
  const key = await hashBlob(blob)
  await withStore('readwrite', (store) =>
    store.put({
      key,
      blob,
      name: String(name || ''),
      type: blob.type,
      size: blob.size,
      savedAt: Date.now(),
    } satisfies ImageRecord),
  )
  return key
}

/**
 * Lädt ein gespeichertes Bild als Image-Objekt (pro Sitzung zwischengespeichert).
 * @param {string} key
 * @returns {Promise<{ imageObject: HTMLImageElement, name: string }|null>} null, wenn nicht vorhanden
 */
export async function loadImage(key: string): Promise<LoadedImage | null> {
  const cached = imageCache.get(key)
  if (cached) return cached
  const promise = (async (): Promise<LoadedImage | null> => {
    const record = (await withStore('readonly', (store) => store.get(key))) as
      | ImageRecord
      | undefined
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
 * @param {{ minAgeMs?: number }} [options] - Bilder, die jünger sind, bleiben
 *   erhalten (Schutz für gerade laufendes Speichern, auch in anderen Tabs)
 * @returns {Promise<number>} Anzahl gelöschter Bilder
 */
export async function pruneImages(
  keepKeys: Iterable<string>,
  { minAgeMs = 0 }: { minAgeMs?: number } = {},
): Promise<number> {
  const keep = new Set(keepKeys)
  const cutoff = Date.now() - minAgeMs
  // Nur Schlüssel + Speicherdatum lesen (Key-Cursor über den Index, ohne Blobs)
  const candidates = await withStore('readonly', (store) => {
    const found: IDBValidKey[] = []
    const request = store.index(SAVED_AT_INDEX).openKeyCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      const savedAt = Number(cursor.key)
      if (!keep.has(cursor.primaryKey as string) && !(savedAt > cutoff))
        found.push(cursor.primaryKey)
      cursor.continue()
    }
    return found
  })
  const remove = candidates || []
  if (remove.length === 0) return 0
  await withStore('readwrite', (store) => {
    for (const k of remove) store.delete(k)
  })
  for (const k of remove) imageCache.delete(k as string)
  return remove.length
}

/**
 * Anzahl und Gesamtgröße der gespeicherten Preset-Bilder.
 * @returns {Promise<{ count:number, bytes:number }>}
 */
export async function getImageStorageStats(): Promise<ImageStorageStats> {
  return withStore('readonly', (store) => {
    const stats: ImageStorageStats = { count: 0, bytes: 0 }
    const request = store.openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      const record = cursor.value as Partial<ImageRecord> | undefined
      stats.count++
      stats.bytes += Number(record?.size ?? record?.blob?.size ?? 0) || 0
      cursor.continue()
    }
    return stats
  })
}

/**
 * Belegter/verfügbarer Speicher des Browsers (falls unterstützt).
 * @returns {Promise<{ usage:number, quota:number }|null>}
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const est = await globalThis.navigator?.storage?.estimate?.()
    return est ? { usage: est.usage ?? 0, quota: est.quota ?? 0 } : null
  } catch {
    return null
  }
}

/** true, wenn der Fehler auf vollen Speicher hindeutet. */
export function isQuotaError(error: unknown): boolean {
  const err = error as { name?: string; message?: unknown; inner?: { name?: string } } | null
  const name = err?.name || err?.inner?.name || ''
  return name === 'QuotaExceededError' || /quota/i.test(String(err?.message || ''))
}

/** Nur für Tests: Sitzungs-Cache leeren. */
export function _clearImageCache() {
  imageCache.clear()
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gespeichertes Bild konnte nicht geladen werden'))
    img.src = src
  })
}

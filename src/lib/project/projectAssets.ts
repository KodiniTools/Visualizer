/**
 * 🧳 Medien eines Projekt-Zustands auslagern und wiederherstellen
 *
 * Der Projekt-Zustand ist JSON. Bilder, Videos und Audio stecken darin als
 * Data-URLs (Bilder) oder Blob-URLs (Videos, Audio). Blob-URLs gelten nur in
 * der aktuellen Sitzung, Data-URLs sind groß. Beim Speichern wird deshalb jede
 * solche URL durch einen Platzhalter "vzasset:<n>" ersetzt und die Datei
 * einmal abgelegt (gleiche URL → gleiche Datei). Beim Laden entsteht je Datei
 * wieder eine URL derselben Art.
 */

export const ASSET_PREFIX = 'vzasset:'

const DATA_URL = /^data:([\w.+-]+\/[\w.+-]+)?(;[\w=.+-]+)*,/i
const BLOB_URL = /^blob:/i

export type AssetScheme = 'data' | 'blob'

/** Beschreibung einer ausgelagerten Datei (Reihenfolge = Asset-Nummer) */
export interface AssetInfo {
  scheme: AssetScheme
}

/** Liefert die Datei hinter einer URL (Standard: fetch). */
export type BlobLoader = (url: string) => Promise<Blob>

/** Ist der String eine Medien-URL, die ausgelagert werden muss? */
export function mediaScheme(value: unknown): AssetScheme | null {
  if (typeof value !== 'string') return null
  if (BLOB_URL.test(value)) return 'blob'
  if (DATA_URL.test(value)) return 'data'
  return null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Kopiert einen JSON-Wert und ersetzt dabei jeden String über `map`.
 * Nicht-JSON-Werte (Funktionen, DOM-Elemente) fallen weg wie bei JSON.stringify.
 */
export function mapStrings(value: unknown, map: (s: string) => string): unknown {
  if (typeof value === 'string') return map(value)
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, map) ?? null)
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      const mapped = mapStrings(item, map)
      if (mapped !== undefined) out[key] = mapped
    }
    return out
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean' || value === null) return value
  return undefined
}

/** Alle Strings eines JSON-Werts (z. B. zum Sammeln von Medien-Schlüsseln). */
export function collectStrings(value: unknown, into: Set<string> = new Set()): Set<string> {
  mapStrings(value, (s) => {
    into.add(s)
    return s
  })
  return into
}

/** Dekodiert eine Data-URL ohne Netzwerk (fetch auf data: ist nicht überall erlaubt). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const header = dataUrl.slice(5, comma)
  const body = dataUrl.slice(comma + 1)
  const parts = header.split(';')
  const mime = parts[0] || 'text/plain'
  if (parts.includes('base64')) {
    const binary = atob(body)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }
  return new Blob([decodeURIComponent(body)], { type: mime })
}

/** Liest eine Datei als Data-URL. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('FileReader-Fehler'))
    reader.readAsDataURL(blob)
  })
}

const defaultLoader: BlobLoader = async (url) => {
  if (mediaScheme(url) === 'data') return dataUrlToBlob(url)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.blob()
}

export interface ExtractResult {
  /** Zustand mit Platzhaltern statt Medien-URLs */
  state: unknown
  blobs: Blob[]
  assets: AssetInfo[]
  /** URLs, deren Datei nicht mehr lesbar war (bleiben unverändert) */
  missing: string[]
}

/**
 * Ersetzt alle Medien-URLs im Zustand durch Platzhalter und sammelt die Dateien.
 * @param knownBlobs - bereits vorhandene Dateien je URL (spart das Nachladen)
 */
export async function extractAssets(
  state: unknown,
  {
    loadBlob = defaultLoader,
    knownBlobs,
  }: { loadBlob?: BlobLoader; knownBlobs?: ReadonlyMap<string, Blob> } = {},
): Promise<ExtractResult> {
  const urls = [...collectStrings(state)].filter((s) => mediaScheme(s) !== null)
  const placeholderByUrl = new Map<string, string>()
  const blobs: Blob[] = []
  const assets: AssetInfo[] = []
  const missing: string[] = []

  for (const url of urls) {
    let blob: Blob
    try {
      blob = knownBlobs?.get(url) ?? (await loadBlob(url))
    } catch (error) {
      console.warn('⚠️ [Projekt] Datei nicht lesbar, bleibt draußen:', url.slice(0, 60), error)
      missing.push(url)
      continue
    }
    placeholderByUrl.set(url, `${ASSET_PREFIX}${blobs.length}`)
    blobs.push(blob)
    assets.push({ scheme: mediaScheme(url) as AssetScheme })
  }

  return {
    state: mapStrings(state, (s) => placeholderByUrl.get(s) ?? s),
    blobs,
    assets,
    missing,
  }
}

export interface RestoreOptions {
  createObjectURL?: (blob: Blob) => string
  toDataUrl?: (blob: Blob) => Promise<string>
}

/**
 * Setzt für jeden Platzhalter eine frische URL ein.
 * @returns Zustand und die erzeugten Blob-URLs (zum späteren Freigeben)
 */
export async function restoreAssets(
  state: unknown,
  blobs: readonly Blob[],
  assets: readonly AssetInfo[],
  {
    createObjectURL = (blob) => URL.createObjectURL(blob),
    toDataUrl = blobToDataUrl,
  }: RestoreOptions = {},
): Promise<{ state: unknown; objectUrls: string[]; urlByAsset: string[] }> {
  const used = new Set(
    [...collectStrings(state)].filter((s) => s.startsWith(ASSET_PREFIX)).map((s) => s),
  )
  const urlByAsset: string[] = []
  const objectUrls: string[] = []
  for (let i = 0; i < blobs.length; i++) {
    if (!used.has(`${ASSET_PREFIX}${i}`)) continue
    const blob = blobs[i] as Blob
    if (assets[i]?.scheme === 'data') {
      urlByAsset[i] = await toDataUrl(blob)
    } else {
      const url = createObjectURL(blob)
      objectUrls.push(url)
      urlByAsset[i] = url
    }
  }
  const restored = mapStrings(state, (s) => {
    if (!s.startsWith(ASSET_PREFIX)) return s
    const index = Number(s.slice(ASSET_PREFIX.length))
    return Number.isInteger(index) && urlByAsset[index] !== undefined ? urlByAsset[index] : s
  })
  return { state: restored, objectUrls, urlByAsset }
}

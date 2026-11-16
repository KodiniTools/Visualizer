/**
 * 📦 Projektdatei (.vzproj) – Containerformat
 *
 * Aufbau (alle Zahlen Little Endian):
 *   [0..7]   Magic "VZPROJ01"
 *   [8..11]  Länge L des Manifests in Bytes (uint32)
 *   [12..]   Manifest als UTF-8-JSON (L Bytes)
 *   danach   Dateien (Bilder, Videos, Audio) direkt hintereinander
 *
 * Das Manifest nennt je Datei Offset (ab Ende des Manifests) und Größe.
 * Gelesen wird per Blob.slice: auch mehrere GB große Videos werden dabei
 * nicht in den Arbeitsspeicher geladen. Beim Schreiben setzt `new Blob([...])`
 * die Teile nur zusammen, ohne sie zu kopieren.
 */

export const PROJECT_MAGIC = 'VZPROJ01'
export const PROJECT_EXTENSION = 'vzproj'
export const PROJECT_MIME = 'application/x-visualizer-project'
const HEADER_BYTES = PROJECT_MAGIC.length + 4

/** Eintrag einer eingebetteten Datei im Manifest */
export interface ArchiveAssetEntry {
  /** Byte-Offset ab Ende des Manifests */
  offset: number
  size: number
  mime: string
}

/** Pflichtfelder des Manifests; der Rest gehört dem Aufrufer. */
export interface ArchiveManifest {
  assets: ArchiveAssetEntry[]
  [key: string]: unknown
}

export class ProjectArchiveError extends Error {
  constructor(
    message: string,
    readonly code: 'not-a-project' | 'corrupt',
  ) {
    super(message)
    this.name = 'ProjectArchiveError'
  }
}

/**
 * Packt Manifest und Dateien in eine Projektdatei.
 * @param meta - beliebige JSON-Daten (ohne `assets`, das wird gesetzt)
 * @param blobs - Dateien in der Reihenfolge ihrer Asset-Nummer
 */
export function packProject(meta: Record<string, unknown>, blobs: readonly Blob[]): Blob {
  let offset = 0
  const assets: ArchiveAssetEntry[] = blobs.map((blob) => {
    const entry = { offset, size: blob.size, mime: blob.type || 'application/octet-stream' }
    offset += blob.size
    return entry
  })
  const json = new TextEncoder().encode(JSON.stringify({ ...meta, assets }))
  const header = new Uint8Array(HEADER_BYTES)
  header.set(new TextEncoder().encode(PROJECT_MAGIC), 0)
  new DataView(header.buffer).setUint32(PROJECT_MAGIC.length, json.byteLength, true)
  return new Blob([header, json, ...blobs], { type: PROJECT_MIME })
}

/** Liest Blob-Bytes (Blob.arrayBuffer fehlt in manchen Testumgebungen). */
function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Response(blob).arrayBuffer()
}

/**
 * Liest eine Projektdatei. Die Dateien kommen als Blob-Ausschnitte zurück
 * (ohne sie zu laden).
 * @throws {ProjectArchiveError} bei fremden oder beschädigten Dateien
 */
export async function unpackProject(
  file: Blob,
): Promise<{ manifest: ArchiveManifest; blobs: Blob[] }> {
  if (file.size < HEADER_BYTES) {
    throw new ProjectArchiveError('Keine Projektdatei', 'not-a-project')
  }
  const header = new Uint8Array(await readBytes(file.slice(0, HEADER_BYTES)))
  const magic = new TextDecoder().decode(header.subarray(0, PROJECT_MAGIC.length))
  if (magic !== PROJECT_MAGIC) {
    throw new ProjectArchiveError('Keine Projektdatei', 'not-a-project')
  }
  const jsonLength = new DataView(header.buffer).getUint32(PROJECT_MAGIC.length, true)
  const dataStart = HEADER_BYTES + jsonLength
  if (dataStart > file.size) throw new ProjectArchiveError('Manifest unvollständig', 'corrupt')

  let manifest: ArchiveManifest
  try {
    const text = new TextDecoder().decode(await readBytes(file.slice(HEADER_BYTES, dataStart)))
    manifest = JSON.parse(text)
  } catch {
    throw new ProjectArchiveError('Manifest unlesbar', 'corrupt')
  }
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.assets)) {
    throw new ProjectArchiveError('Manifest ohne Dateiliste', 'corrupt')
  }

  const blobs = manifest.assets.map((entry, index) => {
    const { offset, size, mime } = entry ?? ({} as ArchiveAssetEntry)
    const valid =
      Number.isSafeInteger(offset) &&
      Number.isSafeInteger(size) &&
      offset >= 0 &&
      size >= 0 &&
      dataStart + offset + size <= file.size
    if (!valid) throw new ProjectArchiveError(`Datei ${index} unvollständig`, 'corrupt')
    const start = dataStart + offset
    return file.slice(start, start + size, typeof mime === 'string' ? mime : '')
  })
  return { manifest, blobs }
}

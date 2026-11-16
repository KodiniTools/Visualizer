/**
 * 💾 Projekt speichern und laden
 *
 * Ein Projekt besteht aus
 *  - `segments`: Zustand aller Undo-Segmente (Canvas-Bilder, -Videos, Texte,
 *    Formen, Hintergrund, Kacheln, Visualizer, Beat-Marker, Ticker, …),
 *  - `media`: die Quellen der darin genutzten mediaRegistry-Schlüssel,
 *  - `parts`: Teile außerhalb des Verlaufs (Galerien, Playlist).
 * Alle Medien-URLs darin werden als Dateien in die Projektdatei gepackt
 * (siehe projectAssets, projectArchive).
 */
import { packProject, unpackProject, ProjectArchiveError } from './projectArchive'
import {
  extractAssets,
  restoreAssets,
  collectStrings,
  mapStrings,
  type AssetInfo,
  type BlobLoader,
  type RestoreOptions,
} from './projectAssets'

export const PROJECT_FORMAT = 'kodini-visualizer-project'
export const PROJECT_VERSION = 1

const MEDIA_KEY = /^media:\d+$/
const UNKNOWN_MEDIA_KEY = 'media:0'

/** Zustand eines Projekts (ohne Dateien) */
export interface ProjectState {
  segments: Record<string, unknown>
  media: Record<string, string>
  parts: Record<string, unknown>
}

/** Manifest der Projektdatei (neben `assets` aus projectArchive) */
export interface ProjectManifest {
  format: typeof PROJECT_FORMAT
  version: number
  name: string
  savedAt: string
  assetInfo: AssetInfo[]
  state: ProjectState
}

/** Benötigte Ausschnitte von Recorder, Teile-Registry und mediaRegistry */
export interface ProjectDeps {
  recorder: {
    captureAll(): Record<string, unknown>
    applyAll(snapshots: Record<string, unknown>): Promise<string[]>
    rebase(): void
  }
  parts: {
    captureAll(): Record<string, unknown>
    applyAll(snapshots: Record<string, unknown>): Promise<string[]>
    knownBlobs(): Map<string, Blob>
  }
  media: {
    resolve(key: unknown): string | null
    intern(src: unknown): string | null
  }
  /** Verlauf leeren (ein geladenes Projekt beginnt ohne Undo-Schritte) */
  clearHistory?: () => void
}

export class ProjectFormatError extends Error {
  constructor(
    message: string,
    readonly code: 'not-a-project' | 'corrupt' | 'newer-version',
  ) {
    super(message)
    this.name = 'ProjectFormatError'
  }
}

/** Erfasst den aktuellen Zustand (ohne Dateien). */
export function captureProjectState(deps: ProjectDeps): ProjectState {
  const segments = deps.recorder.captureAll()
  const media: Record<string, string> = {}
  for (const value of collectStrings(segments)) {
    if (!MEDIA_KEY.test(value)) continue
    const src = deps.media.resolve(value)
    if (src) media[value] = src
  }
  return { segments, media, parts: deps.parts.captureAll() }
}

/**
 * Baut die Projektdatei.
 * @returns Datei und die URLs, deren Medien nicht mehr lesbar waren
 */
export async function buildProjectFile(
  deps: ProjectDeps,
  { name, now = new Date(), loadBlob }: { name: string; now?: Date; loadBlob?: BlobLoader },
): Promise<{ file: Blob; missing: string[] }> {
  const state = captureProjectState(deps)
  const extracted = await extractAssets(state, { loadBlob, knownBlobs: deps.parts.knownBlobs() })
  // Nicht mehr lesbare Medien gar nicht erst als Quelle speichern: Die
  // zugehörigen Schlüssel lösen beim Laden zu nichts auf (statt zu einer
  // toten Blob-URL).
  const missing = new Set(extracted.missing)
  const media = (extracted.state as ProjectState).media
  for (const [key, src] of Object.entries(media)) if (missing.has(src)) delete media[key]
  const meta: Omit<ProjectManifest, 'state'> & { state: unknown } = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    name,
    savedAt: now.toISOString(),
    assetInfo: extracted.assets,
    state: extracted.state,
  }
  return { file: packProject(meta, extracted.blobs), missing: extracted.missing }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Liest nur das Manifest (Name, Datum) – z. B. für eine Projektliste. */
export async function readProjectInfo(file: Blob): Promise<{ name: string; savedAt: string }> {
  const { manifest } = await openArchive(file)
  return { name: manifest.name, savedAt: manifest.savedAt }
}

async function openArchive(file: Blob) {
  let unpacked
  try {
    unpacked = await unpackProject(file)
  } catch (error) {
    if (error instanceof ProjectArchiveError)
      throw new ProjectFormatError(error.message, error.code)
    throw error
  }
  const manifest = unpacked.manifest as unknown as ProjectManifest
  if (manifest.format !== PROJECT_FORMAT) {
    throw new ProjectFormatError('Keine Visualizer-Projektdatei', 'not-a-project')
  }
  if (typeof manifest.version !== 'number' || manifest.version > PROJECT_VERSION) {
    throw new ProjectFormatError('Projekt aus neuerer Version', 'newer-version')
  }
  const state = manifest.state
  if (!isRecord(state) || !isRecord(state.segments) || !isRecord(state.parts)) {
    throw new ProjectFormatError('Projektzustand fehlt', 'corrupt')
  }
  if (!isRecord(state.media)) state.media = {}
  if (!Array.isArray(manifest.assetInfo)) manifest.assetInfo = []
  if (typeof manifest.name !== 'string') manifest.name = ''
  return { manifest, blobs: unpacked.blobs }
}

/**
 * Lädt eine Projektdatei in die App.
 * @throws {ProjectFormatError}
 */
export async function loadProjectFile(
  deps: ProjectDeps,
  file: Blob,
  restoreOptions: RestoreOptions = {},
): Promise<{ name: string; segments: string[]; parts: string[] }> {
  const { manifest, blobs } = await openArchive(file)
  const restored = await restoreAssets(manifest.state, blobs, manifest.assetInfo, restoreOptions)
  const state = restored.state as ProjectState

  // Medien-Schlüssel der Datei auf Schlüssel der laufenden Sitzung umbiegen
  const keyMap = new Map<string, string>()
  for (const [oldKey, src] of Object.entries(state.media ?? {})) {
    const newKey = typeof src === 'string' ? deps.media.intern(src) : null
    if (newKey) keyMap.set(oldKey, newKey)
  }
  // Unbekannte Schlüssel dürfen nicht zufällig auf fremde Medien der
  // Sitzung zeigen: "media:0" wird nie vergeben und löst zu nichts auf.
  const segments = mapStrings(state.segments, (s) =>
    MEDIA_KEY.test(s) ? (keyMap.get(s) ?? UNKNOWN_MEDIA_KEY) : s,
  ) as Record<string, unknown>

  const parts = await deps.parts.applyAll(state.parts)
  const applied = await deps.recorder.applyAll(segments)
  deps.clearHistory?.()
  deps.recorder.rebase()
  return { name: manifest.name, segments: applied, parts }
}

/**
 * Speichern exportierter Dateien (Video/GIF) mit Speicherort-Auswahl.
 *
 * - Chromium-Browser: File System Access API (`showSaveFilePicker`). Der native
 *   Dialog erlaubt Ordnerwahl und Umbenennen; die Datei wird gestreamt geschrieben.
 * - Andere Browser (Firefox, Safari): kein Picker. Der Aufrufer zeigt dann einen
 *   eigenen Dialog zum Umbenennen und startet einen normalen Download.
 */

// Zeichen, die Windows/macOS/Linux in Dateinamen nicht erlauben.
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g
const MAX_BASENAME_LENGTH = 200

/** Feste MIME-Typen je Endung (ohne Codec-Parameter, die der Picker ablehnt). */
/** Fenster mit optionalem File-System-Access-Speicherdialog */
export interface SavePickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName?: string
    types?: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle>
}

export type SaveResult = { status: 'saved'; name: string } | { status: 'cancelled' }

export interface SaveViaPickerOptions {
  /** Blob- oder Server-URL der Datei */
  url: string
  suggestedName: string
  /** ohne Punkt */
  extension: string
  description?: string
  win?: SavePickerWindow
  fetchImpl?: typeof fetch
}

export const EXPORT_MIME_TYPES: Readonly<Record<string, string>> = Object.freeze({
  webm: 'video/webm',
  mp4: 'video/mp4',
  gif: 'image/gif',
})

/**
 * Prüft, ob der Browser den nativen Speichern-Dialog anbietet.
 * @param {object} [win]
 * @returns {boolean}
 */
export function supportsSavePicker(
  win: SavePickerWindow | null | undefined = globalThis as SavePickerWindow,
): boolean {
  return typeof win?.showSaveFilePicker === 'function'
}

/**
 * Bereinigt eine Nutzereingabe zu einem gültigen Dateinamen mit fester Endung.
 * Gibt '' zurück, wenn kein Name übrig bleibt.
 * @param {string} input
 * @param {string} extension ohne Punkt, z. B. 'mp4'
 * @returns {string}
 */
export function normalizeFilename(input: unknown, extension: unknown): string {
  const ext = `.${String(extension).replace(/^\.+/, '')}`
  let base = Array.from(String(input ?? '').replace(INVALID_FILENAME_CHARS, ''))
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127) // Steuerzeichen
    .join('')
    .trim()
  if (base.toLowerCase().endsWith(ext.toLowerCase())) base = base.slice(0, -ext.length)
  base = base.replace(/^[.\s]+|[.\s]+$/g, '').slice(0, MAX_BASENAME_LENGTH)
  return base ? `${base}${ext}` : ''
}

/**
 * Entfernt die Endung, falls vorhanden (für das Eingabefeld im Fallback-Dialog).
 * @param {string} filename
 * @param {string} extension
 * @returns {string}
 */
export function stripExtension(filename: unknown, extension: string): string {
  const ext = `.${extension}`.toLowerCase()
  const name = String(filename ?? '')
  return name.toLowerCase().endsWith(ext) ? name.slice(0, -ext.length) : name
}

/**
 * Vorschlag `visualizer_2026-11-01T04-14-00[suffix].ext`.
 * @param {string} extension
 * @param {string} [suffix]
 * @param {Date} [date]
 * @returns {string}
 */
export function timestampedFilename(extension: string, suffix = '', date = new Date()): string {
  const ts = date.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `visualizer_${ts}${suffix}.${extension}`
}

/**
 * Fehler beim Öffnen des Pickers (nicht erlaubt, Sicherheitskontext, …).
 * Der Aufrufer fällt dann auf den eigenen Dialog zurück.
 */
export class SavePickerUnavailableError extends Error {
  cause: unknown

  constructor(cause: unknown) {
    super((cause as { message?: string } | null | undefined)?.message || 'Save picker unavailable')
    this.name = 'SavePickerUnavailableError'
    this.cause = cause
  }
}

/**
 * Öffnet den nativen Speichern-Dialog und schreibt die Datei hinter `url`.
 * Muss synchron aus einem Klick heraus aufgerufen werden (User Activation):
 * `showSaveFilePicker` wird vor dem ersten `await` gestartet.
 *
 * @param {object} options
 * @param {string} options.url Blob- oder Server-URL der Datei
 * @param {string} options.suggestedName
 * @param {string} options.extension ohne Punkt
 * @param {string} [options.description] Beschriftung des Dateityps im Dialog
 * @param {object} [options.win]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<{status: 'saved', name: string} | {status: 'cancelled'}>}
 * @throws {SavePickerUnavailableError} wenn der Picker nicht geöffnet werden konnte
 * @throws {Error} wenn Laden oder Schreiben der Datei fehlschlägt
 */
export async function saveViaPicker({
  url,
  suggestedName,
  extension,
  description,
  win = globalThis as SavePickerWindow,
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: SaveViaPickerOptions): Promise<SaveResult> {
  const mimeType = EXPORT_MIME_TYPES[extension] ?? 'application/octet-stream'
  let handle: FileSystemFileHandle
  try {
    // Aufrufer prüfen vorher supportsSavePicker(); fehlt der Dialog, greift der catch
    handle = await (win.showSaveFilePicker as NonNullable<SavePickerWindow['showSaveFilePicker']>)({
      suggestedName,
      types: [
        {
          description: description || extension.toUpperCase(),
          accept: { [mimeType]: [`.${extension}`] },
        },
      ],
    })
  } catch (error) {
    if ((error as { name?: string } | null)?.name === 'AbortError') return { status: 'cancelled' }
    throw new SavePickerUnavailableError(error)
  }

  const response = await fetchImpl(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const writable = await handle.createWritable()
  try {
    if (response.body && typeof response.body.pipeTo === 'function') {
      // pipeTo schließt den Stream bei Erfolg und bricht ihn bei Fehlern ab.
      await response.body.pipeTo(writable)
    } else {
      await writable.write(await response.blob())
      await writable.close()
    }
  } catch (error) {
    await Promise.resolve(writable.abort?.()).catch(() => {})
    throw error
  }
  return { status: 'saved', name: handle.name || suggestedName }
}

/**
 * Startet einen normalen Browser-Download mit dem gewünschten Dateinamen.
 * @param {string} url
 * @param {string} filename
 * @param {Document} [doc]
 */
export function triggerDownload(
  url: string,
  filename: string,
  doc: Document = globalThis.document,
): void {
  const a = doc.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  doc.body.appendChild(a)
  a.click()
  a.remove()
}

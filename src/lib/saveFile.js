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
export const EXPORT_MIME_TYPES = Object.freeze({
  webm: 'video/webm',
  mp4: 'video/mp4',
  gif: 'image/gif',
})

/**
 * Prüft, ob der Browser den nativen Speichern-Dialog anbietet.
 * @param {object} [win]
 * @returns {boolean}
 */
export function supportsSavePicker(win = globalThis) {
  return typeof win?.showSaveFilePicker === 'function'
}

/**
 * Bereinigt eine Nutzereingabe zu einem gültigen Dateinamen mit fester Endung.
 * Gibt '' zurück, wenn kein Name übrig bleibt.
 * @param {string} input
 * @param {string} extension ohne Punkt, z. B. 'mp4'
 * @returns {string}
 */
export function normalizeFilename(input, extension) {
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
export function stripExtension(filename, extension) {
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
export function timestampedFilename(extension, suffix = '', date = new Date()) {
  const ts = date.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `visualizer_${ts}${suffix}.${extension}`
}

/**
 * Fehler beim Öffnen des Pickers (nicht erlaubt, Sicherheitskontext, …).
 * Der Aufrufer fällt dann auf den eigenen Dialog zurück.
 */
export class SavePickerUnavailableError extends Error {
  constructor(cause) {
    super(cause?.message || 'Save picker unavailable')
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
  win = globalThis,
  fetchImpl = globalThis.fetch?.bind(globalThis),
}) {
  const mimeType = EXPORT_MIME_TYPES[extension] ?? 'application/octet-stream'
  let handle
  try {
    handle = await win.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: description || extension.toUpperCase(),
          accept: { [mimeType]: [`.${extension}`] },
        },
      ],
    })
  } catch (error) {
    if (error?.name === 'AbortError') return { status: 'cancelled' }
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
export function triggerDownload(url, filename, doc = globalThis.document) {
  const a = doc.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  doc.body.appendChild(a)
  a.click()
  a.remove()
}

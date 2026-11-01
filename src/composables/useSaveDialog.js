import { getCurrentInstance, onBeforeUnmount, reactive } from 'vue'
import {
  normalizeFilename,
  saveViaPicker,
  SavePickerUnavailableError,
  stripExtension,
  supportsSavePicker,
  triggerDownload,
} from '../lib/saveFile.js'

/**
 * Speichern-Ablauf für Exporte.
 *
 * `requestSave()` öffnet den nativen Speichern-Dialog (Ordner + Dateiname).
 * Ohne Picker-Unterstützung oder wenn er verweigert wird, öffnet sich der
 * eigene Dialog (`dialog`-State), in dem nur der Dateiname geändert wird;
 * danach folgt ein normaler Download.
 *
 * Ergebnis: 'saved' (Picker), 'downloaded' (Fallback) oder 'cancelled'.
 * Lade-/Schreibfehler werden weitergeworfen.
 *
 * @param {object} [options]
 * @param {object} [options.win] Fenster-Objekt (für Tests)
 */
export function useSaveDialog({ win = globalThis } = {}) {
  const dialog = reactive({ open: false, filename: '', extension: '' })
  let pending = null

  function settle(result) {
    const current = pending
    pending = null
    dialog.open = false
    current?.resolve(result)
  }

  function openFallback(request) {
    if (pending) settle('cancelled')
    dialog.filename = stripExtension(request.suggestedName, request.extension)
    dialog.extension = request.extension
    dialog.open = true
    return new Promise((resolve) => {
      pending = { resolve, request }
    })
  }

  /**
   * @param {object} request
   * @param {string} request.url
   * @param {string} request.suggestedName inkl. Endung
   * @param {string} request.extension ohne Punkt
   * @param {string} [request.description]
   * @returns {Promise<'saved' | 'downloaded' | 'cancelled'>}
   */
  async function requestSave(request) {
    if (!request?.url || !request.extension) return 'cancelled'
    if (supportsSavePicker(win)) {
      try {
        const result = await saveViaPicker({ ...request, win })
        return result.status
      } catch (error) {
        if (!(error instanceof SavePickerUnavailableError)) throw error
        console.warn('[Save] Picker nicht verfügbar, nutze Download-Dialog:', error.cause ?? error)
      }
    }
    return openFallback(request)
  }

  /** Bestätigung im Fallback-Dialog. Ungültige Namen lassen den Dialog offen. */
  function confirm(name) {
    if (!pending) return false
    const { request } = pending
    const filename = normalizeFilename(name, request.extension)
    if (!filename) return false
    triggerDownload(request.url, filename, win.document)
    settle('downloaded')
    return true
  }

  function cancel() {
    if (pending) settle('cancelled')
    else dialog.open = false
  }

  if (getCurrentInstance()) onBeforeUnmount(cancel)

  return { dialog, requestSave, confirm, cancel }
}

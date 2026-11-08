import { getCurrentInstance, onBeforeUnmount, reactive } from 'vue'
import {
  normalizeFilename,
  saveViaPicker,
  SavePickerUnavailableError,
  stripExtension,
  supportsSavePicker,
  triggerDownload,
  type SavePickerWindow,
} from '../lib/saveFile'

/** Fenster-Objekt für Picker und Download (in Tests ersetzbar) */
export type SaveDialogWindow = SavePickerWindow & { document: Document }

/** Ergebnis von requestSave */
export type SaveDialogResult = 'saved' | 'downloaded' | 'cancelled'

/** Anfrage an requestSave */
export interface SaveRequest {
  url: string
  /** inkl. Endung */
  suggestedName: string
  /** ohne Punkt */
  extension: string
  description?: string
}

interface PendingSave {
  resolve: (result: SaveDialogResult) => void
  request: SaveRequest
}

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
 * @param options.win Fenster-Objekt (für Tests)
 */
export function useSaveDialog({
  win = globalThis as unknown as SaveDialogWindow,
}: { win?: SaveDialogWindow } = {}) {
  const dialog = reactive({ open: false, filename: '', extension: '' })
  let pending: PendingSave | null = null

  function settle(result: SaveDialogResult) {
    const current = pending
    pending = null
    dialog.open = false
    current?.resolve(result)
  }

  function openFallback(request: SaveRequest): Promise<SaveDialogResult> {
    if (pending) settle('cancelled')
    dialog.filename = stripExtension(request.suggestedName, request.extension)
    dialog.extension = request.extension
    dialog.open = true
    return new Promise<SaveDialogResult>((resolve) => {
      pending = { resolve, request }
    })
  }

  /** Speichern anfragen: nativer Picker, sonst eigener Dialog mit Download. */
  async function requestSave(request: SaveRequest | null | undefined): Promise<SaveDialogResult> {
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
  function confirm(name: string) {
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

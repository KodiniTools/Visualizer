// Speichern fertiger Recorder-Exporte über den Speichern-Dialog
// (Speicherort + Dateiname, Fallback: eigener Dialog + Download).
import { useI18n } from '../../lib/i18n.js'
import { useToastStore } from '../../stores/toastStore.js'
import { timestampedFilename } from '../../lib/saveFile.js'

/**
 * @typedef {object} ExportTarget
 * @property {string|null} url       Datei-URL des Exports
 * @property {string} extension      Endung ohne Punkt
 * @property {string} suffix         Namenszusatz (z. B. '_hq')
 * @property {() => void} done       bisheriger Abschluss-Handler (räumt nach 2 s auf)
 */

/**
 * @param {Record<string, () => ExportTarget>} targets je Exportart
 * @param {(request: object) => Promise<'saved'|'downloaded'|'cancelled'>} requestSave
 */
export function useRecorderExportSave(targets, requestSave) {
  const { t } = useI18n()
  const toastStore = useToastStore()

  /**
   * Öffnet den Speichern-Dialog für einen Export. Muss direkt aus dem Klick
   * aufgerufen werden, damit der Browser den nativen Dialog zulässt.
   * Abbruch lässt die Datei bestehen, sodass erneut gespeichert werden kann.
   * @param {string} kind z. B. 'webm' | 'mp4' | 'gif' | 'hq'
   */
  async function saveExport(kind) {
    const target = targets[kind]?.()
    if (!target?.url) return
    try {
      const result = await requestSave({
        url: target.url,
        extension: target.extension,
        suggestedName: timestampedFilename(target.extension, target.suffix),
        description: target.extension.toUpperCase(),
      })
      if (result === 'cancelled') return
      if (result === 'saved') toastStore.success(t('recorder.saveDialog.saved'))
      target.done()
    } catch (error) {
      console.error('[Recorder] Speichern fehlgeschlagen:', error)
      toastStore.error(
        t('recorder.saveDialog.saveFailed').replace('{message}', error?.message || String(error)),
      )
    }
  }

  return { saveExport }
}

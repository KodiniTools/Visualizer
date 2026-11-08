// Speichern fertiger Recorder-Exporte über den Speichern-Dialog
// (Speicherort + Dateiname, Fallback: eigener Dialog + Download).
import { useI18n } from '../../lib/i18n'
import { useToastStore } from '../../stores/toastStore'
import { timestampedFilename } from '../../lib/saveFile'

export interface ExportTarget {
  /** Datei-URL des Exports */
  url: string | null
  /** Endung ohne Punkt */
  extension: string
  /** Namenszusatz (z. B. '_hq') */
  suffix: string
  /** bisheriger Abschluss-Handler (räumt nach 2 s auf) */
  done: () => void
}

export interface SaveRequest {
  url: string
  extension: string
  suggestedName: string
  description: string
}

/**
 * @param targets je Exportart
 */
export function useRecorderExportSave(
  targets: Record<string, () => ExportTarget>,
  requestSave: (request: SaveRequest) => Promise<'saved' | 'downloaded' | 'cancelled'>,
) {
  const { t } = useI18n()
  const toastStore = useToastStore()

  /**
   * Öffnet den Speichern-Dialog für einen Export. Muss direkt aus dem Klick
   * aufgerufen werden, damit der Browser den nativen Dialog zulässt.
   * Abbruch lässt die Datei bestehen, sodass erneut gespeichert werden kann.
   * @param kind z. B. 'webm' | 'mp4' | 'gif' | 'hq'
   */
  async function saveExport(kind: string): Promise<void> {
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
        t('recorder.saveDialog.saveFailed').replace(
          '{message}',
          (error as Error | undefined)?.message || String(error),
        ),
      )
    }
  }

  return { saveExport }
}

/** Fehler des Offline-Exports */

/** Fehlercodes des Offline-Exports (für die Meldung im Panel) */
export type OfflineExportErrorCode =
  | 'unsupported'
  | 'no-track'
  | 'too-long'
  | 'microphone'
  | 'decode'
  | 'render'
  | 'busy'

export class OfflineExportError extends Error {
  readonly code: OfflineExportErrorCode
  constructor(code: OfflineExportErrorCode, cause?: unknown) {
    super(`Offline export failed: ${code}`)
    this.name = 'OfflineExportError'
    this.code = code
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause
  }
}

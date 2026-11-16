// @ts-check
/**
 * Auto-Update der Desktop-App.
 *
 * Prüft beim Start einmal, ob auf GitHub eine neuere Version liegt, lädt sie im
 * Hintergrund und fragt vor dem Neustart nach. Ohne Zustimmung wird das Update
 * beim nächsten Beenden der App installiert. Fehler (kein Netz, GitHub nicht
 * erreichbar) stören die Arbeit nicht: Sie werden nur protokolliert.
 *
 * Die Abhängigkeiten werden hereingereicht, damit die Logik ohne Electron
 * testbar ist.
 */

/**
 * @typedef {object} UpdaterLike
 * @property {boolean} autoDownload
 * @property {boolean} autoInstallOnAppQuit
 * @property {(event: string, listener: (...args: any[]) => void) => unknown} on
 * @property {() => Promise<unknown>} checkForUpdates
 * @property {() => void} quitAndInstall
 */

/**
 * @typedef {object} UpdaterDeps
 * @property {UpdaterLike} autoUpdater
 * @property {boolean} isPackaged - nur die installierte App aktualisiert sich
 * @property {(info: { version: string }) => Promise<boolean>} confirmRestart -
 *   fragt, ob jetzt neu gestartet werden darf
 * @property {(message: string, error?: unknown) => void} [log]
 */

/**
 * Richtet das Auto-Update ein und startet die Prüfung.
 * @param {UpdaterDeps} deps
 * @returns {Promise<'disabled' | 'checked' | 'failed'>}
 */
export async function setupAutoUpdate({ autoUpdater, isPackaged, confirmRestart, log = () => {} }) {
  if (!isPackaged) return 'disabled'

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (error) => log('[Update] Fehler', error))
  autoUpdater.on('update-downloaded', (info) => {
    void confirmRestart({ version: String(info?.version ?? '') })
      .then((restart) => {
        if (restart) autoUpdater.quitAndInstall()
      })
      .catch((error) => log('[Update] Nachfrage fehlgeschlagen', error))
  })

  try {
    await autoUpdater.checkForUpdates()
    return 'checked'
  } catch (error) {
    log('[Update] Prüfung fehlgeschlagen', error)
    return 'failed'
  }
}

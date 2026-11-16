// @vitest-environment node
// @ts-check
import { describe, it, expect, vi } from 'vitest'
import { setupAutoUpdate } from '../updater.mjs'

function createUpdater() {
  /** @type {Record<string, (...args: any[]) => void>} */
  const listeners = {}
  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    listeners,
    /**
     * @param {string} event
     * @param {(...args: any[]) => void} listener
     */
    on(event, listener) {
      listeners[event] = listener
    },
    checkForUpdates: vi.fn(async () => undefined),
    quitAndInstall: vi.fn(),
  }
}

/** Wartet, bis die Promise-Kette der Nachfrage durchgelaufen ist. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('setupAutoUpdate', () => {
  it('tut in der Entwicklung nichts', async () => {
    const autoUpdater = createUpdater()
    const result = await setupAutoUpdate({
      autoUpdater,
      isPackaged: false,
      confirmRestart: async () => true,
    })
    expect(result).toBe('disabled')
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()
    expect(autoUpdater.listeners).toEqual({})
  })

  it('prüft in der installierten App und lädt automatisch', async () => {
    const autoUpdater = createUpdater()
    const result = await setupAutoUpdate({
      autoUpdater,
      isPackaged: true,
      confirmRestart: async () => false,
    })
    expect(result).toBe('checked')
    expect(autoUpdater.autoDownload).toBe(true)
    expect(autoUpdater.autoInstallOnAppQuit).toBe(true)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('startet nach Zustimmung neu und nennt die Version', async () => {
    const autoUpdater = createUpdater()
    const confirmRestart = vi.fn(async () => true)
    await setupAutoUpdate({ autoUpdater, isPackaged: true, confirmRestart })

    autoUpdater.listeners['update-downloaded']?.({ version: '0.1.2' })
    await settle()

    expect(confirmRestart).toHaveBeenCalledWith({ version: '0.1.2' })
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('startet ohne Zustimmung nicht neu', async () => {
    const autoUpdater = createUpdater()
    await setupAutoUpdate({ autoUpdater, isPackaged: true, confirmRestart: async () => false })

    autoUpdater.listeners['update-downloaded']?.({ version: '0.1.2' })
    await settle()

    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled()
  })

  it('fängt eine fehlgeschlagene Prüfung ab (kein Netz)', async () => {
    const autoUpdater = createUpdater()
    autoUpdater.checkForUpdates.mockRejectedValueOnce(new Error('net::ERR_INTERNET_DISCONNECTED'))
    const log = vi.fn()

    const result = await setupAutoUpdate({
      autoUpdater,
      isPackaged: true,
      confirmRestart: async () => true,
      log,
    })

    expect(result).toBe('failed')
    expect(log).toHaveBeenCalledWith('[Update] Prüfung fehlgeschlagen', expect.any(Error))
  })

  it('protokolliert Fehler des Updaters und eine fehlgeschlagene Nachfrage', async () => {
    const autoUpdater = createUpdater()
    const log = vi.fn()
    await setupAutoUpdate({
      autoUpdater,
      isPackaged: true,
      confirmRestart: async () => {
        throw new Error('Dialog geschlossen')
      },
      log,
    })

    autoUpdater.listeners['error']?.(new Error('kaputt'))
    autoUpdater.listeners['update-downloaded']?.({ version: '0.1.2' })
    await settle()

    expect(log).toHaveBeenCalledWith('[Update] Fehler', expect.any(Error))
    expect(log).toHaveBeenCalledWith('[Update] Nachfrage fehlgeschlagen', expect.any(Error))
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled()
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSaveDialog } from '../../composables/useSaveDialog.js'

const request = { url: 'blob:clip', suggestedName: 'visualizer_1.mp4', extension: 'mp4' }

function domError(name) {
  const error = new Error(name)
  error.name = name
  return error
}

function fallbackWin() {
  return { document }
}

describe('useSaveDialog', () => {
  afterEach(() => vi.restoreAllMocks())

  it('nutzt den nativen Picker, wenn verfügbar', async () => {
    const writable = { write: vi.fn(), close: vi.fn() }
    const win = {
      document,
      showSaveFilePicker: vi.fn(async () => ({ createWritable: async () => writable })),
    }
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      body: null,
      blob: async () => new Blob(['v']),
    }))
    const { dialog, requestSave } = useSaveDialog({ win })
    await expect(requestSave(request)).resolves.toBe('saved')
    expect(win.showSaveFilePicker).toHaveBeenCalledTimes(1)
    expect(dialog.open).toBe(false)
    vi.unstubAllGlobals()
  })

  it('gibt cancelled zurück, wenn der Nutzer den Picker abbricht', async () => {
    const win = { document, showSaveFilePicker: async () => Promise.reject(domError('AbortError')) }
    const { dialog, requestSave } = useSaveDialog({ win })
    await expect(requestSave(request)).resolves.toBe('cancelled')
    expect(dialog.open).toBe(false)
  })

  it('öffnet ohne Picker den eigenen Dialog mit Namen ohne Endung', async () => {
    const { dialog, requestSave, cancel } = useSaveDialog({ win: fallbackWin() })
    const promise = requestSave(request)
    await Promise.resolve()
    expect(dialog).toMatchObject({ open: true, filename: 'visualizer_1', extension: 'mp4' })
    cancel()
    await promise
  })

  it('lädt nach Bestätigung mit bereinigtem Namen herunter', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { dialog, requestSave, confirm } = useSaveDialog({ win: fallbackWin() })
    const promise = requestSave(request)
    await Promise.resolve()
    expect(confirm('Mein Clip?')).toBe(true)
    await expect(promise).resolves.toBe('downloaded')
    expect(click.mock.contexts[0].download).toBe('Mein Clip.mp4')
    expect(dialog.open).toBe(false)
  })

  it('lässt den Dialog bei ungültigem Namen offen', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { dialog, requestSave, confirm } = useSaveDialog({ win: fallbackWin() })
    requestSave(request)
    await Promise.resolve()
    expect(confirm('  ')).toBe(false)
    expect(dialog.open).toBe(true)
    expect(click).not.toHaveBeenCalled()
  })

  it('Abbrechen im Dialog liefert cancelled ohne Download', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { dialog, requestSave, cancel } = useSaveDialog({ win: fallbackWin() })
    const promise = requestSave(request)
    await Promise.resolve()
    cancel()
    await expect(promise).resolves.toBe('cancelled')
    expect(dialog.open).toBe(false)
    expect(click).not.toHaveBeenCalled()
  })

  it('fällt auf den Dialog zurück, wenn der Picker verweigert wird', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const win = {
      document,
      showSaveFilePicker: async () => Promise.reject(domError('SecurityError')),
    }
    const { dialog, requestSave, cancel } = useSaveDialog({ win })
    const promise = requestSave(request)
    await vi.waitFor(() => expect(dialog.open).toBe(true))
    cancel()
    await expect(promise).resolves.toBe('cancelled')
  })

  it('ein zweiter Aufruf beendet den offenen Dialog als cancelled', async () => {
    const { requestSave, cancel } = useSaveDialog({ win: fallbackWin() })
    const first = requestSave(request)
    await Promise.resolve()
    const second = requestSave({ ...request, extension: 'gif', suggestedName: 'b.gif' })
    await expect(first).resolves.toBe('cancelled')
    cancel()
    await expect(second).resolves.toBe('cancelled')
  })

  it('ignoriert Anfragen ohne URL', async () => {
    const { dialog, requestSave } = useSaveDialog({ win: fallbackWin() })
    await expect(requestSave({ ...request, url: null })).resolves.toBe('cancelled')
    expect(dialog.open).toBe(false)
  })
})

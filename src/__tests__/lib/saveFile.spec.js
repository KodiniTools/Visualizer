import { describe, expect, it, vi } from 'vitest'
import {
  normalizeFilename,
  saveViaPicker,
  SavePickerUnavailableError,
  stripExtension,
  supportsSavePicker,
  timestampedFilename,
  triggerDownload,
} from '../../lib/saveFile.js'

function domError(name) {
  const error = new Error(name)
  error.name = name
  return error
}

function fakeWritable() {
  return {
    write: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    abort: vi.fn(async () => {}),
  }
}

describe('normalizeFilename', () => {
  it('ergänzt die Endung und entfernt ungültige Zeichen', () => {
    expect(normalizeFilename('Mein:Video?', 'mp4')).toBe('MeinVideo.mp4')
    expect(normalizeFilename('a/b\\c', 'webm')).toBe('abc.webm')
  })

  it('verdoppelt eine bereits eingegebene Endung nicht (case-insensitive)', () => {
    expect(normalizeFilename('clip.MP4', 'mp4')).toBe('clip.mp4')
  })

  it('liefert leer bei leerem oder nur ungültigem Namen', () => {
    expect(normalizeFilename('', 'mp4')).toBe('')
    expect(normalizeFilename('   ', 'mp4')).toBe('')
    expect(normalizeFilename('::??', 'gif')).toBe('')
    expect(normalizeFilename('.mp4', 'mp4')).toBe('')
    expect(normalizeFilename(undefined, 'mp4')).toBe('')
  })

  it('entfernt Steuerzeichen', () => {
    expect(normalizeFilename('a\u0001b\u007fc', 'mp4')).toBe('abc.mp4')
  })

  it('schneidet Punkte und Leerzeichen am Rand ab', () => {
    expect(normalizeFilename(' ..clip.. ', 'gif')).toBe('clip.gif')
  })
})

describe('Hilfsfunktionen', () => {
  it('stripExtension entfernt nur die passende Endung', () => {
    expect(stripExtension('a.mp4', 'mp4')).toBe('a')
    expect(stripExtension('a.webm', 'mp4')).toBe('a.webm')
  })

  it('timestampedFilename baut einen dateisystemtauglichen Namen', () => {
    const date = new Date('2026-11-01T04:14:00.123Z')
    expect(timestampedFilename('mp4', '_hq', date)).toBe('visualizer_2026-11-01T04-14-00_hq.mp4')
  })

  it('supportsSavePicker erkennt die API', () => {
    expect(supportsSavePicker({ showSaveFilePicker: () => {} })).toBe(true)
    expect(supportsSavePicker({})).toBe(false)
  })

  it('triggerDownload klickt einen temporären Link mit Dateinamen', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    triggerDownload('blob:abc', 'clip.mp4')
    expect(click).toHaveBeenCalledTimes(1)
    const anchor = click.mock.contexts[0]
    expect(anchor.download).toBe('clip.mp4')
    expect(anchor.getAttribute('href')).toBe('blob:abc')
    expect(document.body.contains(anchor)).toBe(false)
    click.mockRestore()
  })
})

describe('saveViaPicker', () => {
  it('öffnet den Picker mit Vorschlag und Dateityp und streamt die Datei', async () => {
    const writable = fakeWritable()
    const handle = { name: 'neu.mp4', createWritable: vi.fn(async () => writable) }
    const win = { showSaveFilePicker: vi.fn(async () => handle) }
    const pipeTo = vi.fn(async () => {})
    const fetchImpl = vi.fn(async () => ({ ok: true, body: { pipeTo } }))

    const result = await saveViaPicker({
      url: '/visualizer/api/files/x.mp4',
      suggestedName: 'visualizer.mp4',
      extension: 'mp4',
      win,
      fetchImpl,
    })

    expect(result).toEqual({ status: 'saved', name: 'neu.mp4' })
    expect(win.showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'visualizer.mp4',
      types: [{ description: 'MP4', accept: { 'video/mp4': ['.mp4'] } }],
    })
    expect(fetchImpl).toHaveBeenCalledWith('/visualizer/api/files/x.mp4')
    expect(pipeTo).toHaveBeenCalledWith(writable)
  })

  it('schreibt ohne Stream-Unterstützung den Blob und schließt', async () => {
    const writable = fakeWritable()
    const blob = new Blob(['x'])
    const win = { showSaveFilePicker: async () => ({ createWritable: async () => writable }) }
    const fetchImpl = async () => ({ ok: true, body: null, blob: async () => blob })
    const result = await saveViaPicker({
      url: 'blob:x',
      suggestedName: 'a.webm',
      extension: 'webm',
      win,
      fetchImpl,
    })
    expect(result.status).toBe('saved')
    expect(writable.write).toHaveBeenCalledWith(blob)
    expect(writable.close).toHaveBeenCalled()
  })

  it('meldet Abbruch durch den Nutzer als cancelled, ohne die Datei zu laden', async () => {
    const win = { showSaveFilePicker: vi.fn(async () => Promise.reject(domError('AbortError'))) }
    const fetchImpl = vi.fn()
    const result = await saveViaPicker({
      url: 'blob:x',
      suggestedName: 'a.mp4',
      extension: 'mp4',
      win,
      fetchImpl,
    })
    expect(result).toEqual({ status: 'cancelled' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('wirft SavePickerUnavailableError, wenn der Picker verweigert wird', async () => {
    const win = { showSaveFilePicker: async () => Promise.reject(domError('SecurityError')) }
    await expect(
      saveViaPicker({
        url: 'blob:x',
        suggestedName: 'a.mp4',
        extension: 'mp4',
        win,
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(SavePickerUnavailableError)
  })

  it('bricht den Schreibvorgang bei Fehlern ab und wirft weiter', async () => {
    const writable = fakeWritable()
    const win = { showSaveFilePicker: async () => ({ createWritable: async () => writable }) }
    const fetchImpl = async () => ({
      ok: true,
      body: { pipeTo: async () => Promise.reject(new Error('netz')) },
    })
    await expect(
      saveViaPicker({ url: 'blob:x', suggestedName: 'a.mp4', extension: 'mp4', win, fetchImpl }),
    ).rejects.toThrow('netz')
    expect(writable.abort).toHaveBeenCalled()
  })

  it('wirft bei HTTP-Fehlern, bevor eine Datei angelegt wird', async () => {
    const handle = { createWritable: vi.fn() }
    const win = { showSaveFilePicker: async () => handle }
    const fetchImpl = async () => ({ ok: false, status: 404 })
    await expect(
      saveViaPicker({ url: '/x', suggestedName: 'a.mp4', extension: 'mp4', win, fetchImpl }),
    ).rejects.toThrow('HTTP 404')
    expect(handle.createWritable).not.toHaveBeenCalled()
  })
})

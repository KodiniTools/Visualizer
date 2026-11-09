/**
 * Gemerktes Mikrofon fehlt (abgesteckt): Start fällt auf das Standardgerät
 * zurück statt dauerhaft zu scheitern.
 */
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAudioSourceStore } from '../../stores/audioSourceStore'

const stream = { getTracks: () => [] }
let getUserMedia: Mock

beforeEach(() => {
  setActivePinia(createPinia())
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  getUserMedia = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices: vi.fn(async () => []) },
  })
})
afterEach(() => vi.restoreAllMocks())

describe('Mikrofon – gemerktes Gerät fehlt', () => {
  it('OverconstrainedError → Standardgerät, Auswahl zurückgesetzt', async () => {
    const store = useAudioSourceStore()
    store.selectedDeviceId = 'alt'
    getUserMedia
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'OverconstrainedError' }))
      .mockResolvedValueOnce(stream)
    const result = await store.startMicrophone('alt')
    expect(result).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    expect(getUserMedia.mock.calls[0]![0].audio.deviceId).toEqual({ exact: 'alt' })
    expect(getUserMedia.mock.calls[1]![0].audio.deviceId).toBeUndefined()
    expect(store.selectedDeviceId).toBe('default')
    expect(store.isMicrophoneActive).toBe(true)
  })

  it('verweigerte Erlaubnis: kein zweiter Versuch, Fehlermeldung bleibt', async () => {
    const store = useAudioSourceStore()
    getUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    expect(await store.startMicrophone('alt')).toBeNull()
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(store.errorKey).toBe('microphonePermissionDenied')
  })

  it('Fehler als i18n-Schlüssel: verweigert, nicht gefunden, unbekannt (mit Browser-Meldung)', async () => {
    const store = useAudioSourceStore()
    getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error('nope'), { name: 'NotAllowedError' }),
    )
    expect(await store.requestMicrophonePermission()).toBe(false)
    expect(store.microphonePermission).toBe('denied')
    expect([store.errorKey, store.errorMessage]).toEqual(['microphonePermissionDenied', ''])

    getUserMedia.mockRejectedValueOnce(Object.assign(new Error('none'), { name: 'NotFoundError' }))
    await store.requestMicrophonePermission()
    expect(store.microphonePermission).toBe('error')
    expect([store.errorKey, store.errorMessage]).toEqual(['microphoneNotFound', ''])

    getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error('Busy'), { name: 'NotReadableError' }),
    )
    await store.requestMicrophonePermission()
    expect([store.errorKey, store.errorMessage]).toEqual(['microphoneUnknownError', 'Busy'])

    getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error('Busy'), { name: 'NotReadableError' }),
    )
    expect(await store.startMicrophone()).toBeNull()
    expect([store.errorKey, store.errorMessage]).toEqual(['microphoneStartFailed', 'Busy'])

    store.reset()
    expect([store.errorKey, store.errorMessage]).toEqual(['', ''])
  })
})

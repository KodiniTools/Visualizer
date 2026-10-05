/**
 * Gemerktes Mikrofon fehlt (abgesteckt): Start fällt auf das Standardgerät
 * zurück statt dauerhaft zu scheitern.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAudioSourceStore } from '../../stores/audioSourceStore.js'

const stream = { getTracks: () => [] }
let getUserMedia

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
    expect(getUserMedia.mock.calls[0][0].audio.deviceId).toEqual({ exact: 'alt' })
    expect(getUserMedia.mock.calls[1][0].audio.deviceId).toBeUndefined()
    expect(store.selectedDeviceId).toBe('default')
    expect(store.isMicrophoneActive).toBe(true)
  })

  it('verweigerte Erlaubnis: kein zweiter Versuch, Fehlermeldung bleibt', async () => {
    const store = useAudioSourceStore()
    getUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    expect(await store.startMicrophone('alt')).toBeNull()
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(store.errorMessage).toBe('denied')
  })
})

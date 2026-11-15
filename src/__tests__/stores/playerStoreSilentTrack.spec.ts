// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '../../stores/playerStore'

let store: ReturnType<typeof usePlayerStore>
let nextUrl: number

beforeEach(() => {
  setActivePinia(createPinia())
  store = usePlayerStore()
  nextUrl = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:silence-${++nextUrl}`)
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Audio-Element-Attrappe für loadTrack */
const fakeAudio = () => {
  const el = {
    src: '',
    load: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    currentTime: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  store.setAudioRef(el as unknown as HTMLAudioElement)
  return el
}

describe('playerStore.addSilentTrack', () => {
  it('fügt Stille als markierten Track hinzu und lädt ihn ohne Autoplay', () => {
    const audio = fakeAudio()
    const track = store.addSilentTrack(120, 'Stille (2:00)')
    expect(track).toEqual({ name: 'Stille (2:00)', url: 'blob:silence-1', silent: true })
    expect(store.playlist).toHaveLength(1)
    expect(store.currentTrackIndex).toBe(0)
    expect(audio.src).toBe('blob:silence-1')
    expect(audio.load).toHaveBeenCalled()
    expect(audio.play).not.toHaveBeenCalled()
    expect(store.isPlaying).toBe(false)
  })

  it('erzeugt eine WAV-Datei mit der gewünschten Länge', () => {
    const spy = vi.mocked(URL.createObjectURL)
    store.addSilentTrack(30, 'Stille (0:30)')
    const blob = spy.mock.calls[0]?.[0] as Blob
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(44 + 30 * 8000)
  })

  it('hängt an eine bestehende Playlist an, ohne den laufenden Track zu wechseln', () => {
    const audio = fakeAudio()
    store.playlist.push({ name: 'song.mp3', url: 'blob:song' })
    store.loadTrack(0)
    audio.load.mockClear()
    store.addSilentTrack(60, 'Stille (1:00)')
    expect(store.playlist.map((t) => t.name)).toEqual(['song.mp3', 'Stille (1:00)'])
    expect(store.currentTrackIndex).toBe(0)
    expect(audio.src).toBe('blob:song')
    expect(audio.load).not.toHaveBeenCalled()
  })

  it('ungültige Länge: nichts hinzufügen', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(store.addSilentTrack(0, 'x')).toBeNull()
    expect(store.addSilentTrack(NaN, 'x')).toBeNull()
    expect(store.playlist).toHaveLength(0)
  })

  it('clearPlaylist gibt auch die Stille-URL frei', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    fakeAudio()
    store.addSilentTrack(30, 'Stille (0:30)')
    store.clearPlaylist()
    expect(revoke).toHaveBeenCalledWith('blob:silence-1')
    expect(store.playlist).toHaveLength(0)
  })
})

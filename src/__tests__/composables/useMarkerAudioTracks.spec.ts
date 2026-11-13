// @vitest-environment jsdom
/**
 * Beat-Marker „Track aus Playlist“: Ein Playlist-Track setzt am Marker
 * zusätzlich zum laufenden Song ein (gemischt über die Audio-Engine).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  findPlaylistTrack,
  markerTrackDuck,
  markerTrackOffset,
  markerTrackVolume,
  useMarkerAudioTracks,
  type MarkerAudioTrackRef,
} from '../../composables/beatMarkers/useMarkerAudioTracks'
import { registerAudioEngine, type AudioEngineApi } from '../../lib/audioEngineBridge'
import type { PlaylistTrack } from '../../stores/playerStore'

/** Audio-Attrappe mit den Feldern, die das Composable nutzt */
class FakeAudio {
  paused = true
  ended = false
  readyState = 1
  currentTime = 0
  duration = NaN
  volume = 1
  preload = ''
  private attrs: Record<string, string> = {}
  private listeners: Record<string, (() => void)[]> = {}
  play = vi.fn(() => {
    this.paused = false
    return Promise.resolve()
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  set src(v: string) {
    this.attrs.src = v
  }
  get src() {
    return this.attrs.src ?? ''
  }
  getAttribute(name: string) {
    return this.attrs[name] ?? null
  }
  removeAttribute(name: string) {
    delete this.attrs[name]
  }
  addEventListener(type: string, fn: () => void, opts?: { once?: boolean }) {
    ;(this.listeners[type] ??= []).push(opts?.once ? Object.assign(fn, { once: true }) : fn)
  }
  emit(type: string) {
    const fns = this.listeners[type] ?? []
    this.listeners[type] = fns.filter((fn) => !(fn as { once?: boolean }).once)
    fns.forEach((fn) => fn())
  }
}

const playlist: PlaylistTrack[] = [
  { name: 'song.mp3', url: 'blob:song' },
  { name: 'drop.wav', url: 'blob:drop' },
]

interface TestMarker {
  id: number
  time: number
  action: { audioTrack?: MarkerAudioTrackRef | null }
}

let created: FakeAudio[]
let markers: TestMarker[]
let tracks: ReturnType<typeof useMarkerAudioTracks>
let unregister: () => void
let connectTrackOverlay: ReturnType<typeof vi.fn>
let setPlayerDuck: ReturnType<typeof vi.fn>

beforeEach(() => {
  created = []
  markers = []
  connectTrackOverlay = vi.fn(() => true)
  setPlayerDuck = vi.fn()
  unregister = registerAudioEngine({
    connectTrackOverlay,
    setPlayerDuck,
  } as unknown as AudioEngineApi)
  tracks = useMarkerAudioTracks({
    playlist: () => playlist,
    markers: () => markers,
    createAudio: () => {
      const a = new FakeAudio()
      created.push(a)
      return a as unknown as HTMLAudioElement
    },
  })
})

afterEach(() => {
  unregister()
  vi.restoreAllMocks()
})

const dropRef = (extra: Partial<MarkerAudioTrackRef> = {}): MarkerAudioTrackRef => ({
  url: 'blob:drop',
  name: 'drop.wav',
  ...extra,
})

describe('findPlaylistTrack', () => {
  it('findet zuerst über die URL, sonst über den Namen', () => {
    expect(findPlaylistTrack(playlist, dropRef())?.url).toBe('blob:drop')
    expect(findPlaylistTrack(playlist, { url: 'blob:alt', name: 'drop.wav' })?.url).toBe(
      'blob:drop',
    )
    expect(findPlaylistTrack(playlist, { url: 'blob:alt', name: 'weg.mp3' })).toBeNull()
    expect(findPlaylistTrack(playlist, null)).toBeNull()
  })

  it('Lautstärke und Startposition mit sicheren Standardwerten', () => {
    expect(markerTrackVolume(undefined)).toBe(1)
    expect(markerTrackVolume(dropRef({ volume: 2 }))).toBe(1)
    expect(markerTrackVolume(dropRef({ volume: 0.4 }))).toBe(0.4)
    expect(markerTrackOffset(dropRef({ offset: -3 }))).toBe(0)
    expect(markerTrackOffset(dropRef({ offset: 12.5 }))).toBe(12.5)
  })
})

describe('useMarkerAudioTracks', () => {
  it('ausgelöster Marker spielt seinen Track über die Engine ab Startposition', () => {
    const marker = { id: 1, time: 10, action: { audioTrack: dropRef({ volume: 0.5, offset: 3 }) } }
    tracks.apply(marker)
    const el = created[0] as FakeAudio
    expect(el.getAttribute('src')).toBe('blob:drop')
    expect(el.currentTime).toBe(3)
    expect(el.play).toHaveBeenCalled()
    expect(connectTrackOverlay).toHaveBeenCalledWith(el, 0.5)
    // Lautstärke regelt der Engine-Gain, nicht das Element
    expect(el.volume).toBe(1)
  })

  it('ohne Engine spielt das Element direkt mit seiner Lautstärke', () => {
    unregister()
    tracks.apply({ id: 1, time: 0, action: { audioTrack: dropRef({ volume: 0.3 }) } })
    expect((created[0] as FakeAudio).volume).toBe(0.3)
    expect((created[0] as FakeAudio).play).toHaveBeenCalled()
  })

  it('Marker ohne Track oder mit gelöschtem Track spielt nichts', () => {
    tracks.apply({ id: 1, time: 0, action: {} })
    tracks.apply({ id: 2, time: 0, action: { audioTrack: { url: 'blob:x', name: 'weg' } } })
    expect(created).toHaveLength(0)
  })

  it('Pause hält alle Tracks an; das Element wird wiederverwendet', () => {
    const marker = { id: 1, time: 0, action: { audioTrack: dropRef() } }
    tracks.apply(marker)
    tracks.stopAll()
    expect((created[0] as FakeAudio).paused).toBe(true)
    tracks.apply(marker)
    expect(created).toHaveLength(1)
  })

  it('Spulen setzt Tracks an der passenden Stelle fort, spätere bleiben still', () => {
    markers = [
      { id: 1, time: 5, action: { audioTrack: dropRef({ offset: 1 }) } },
      { id: 2, time: 30, action: { audioTrack: dropRef() } },
    ]
    tracks.seek(12)
    expect(created).toHaveLength(1)
    const el = created[0] as FakeAudio
    expect(el.currentTime).toBe(8) // 1 s Start + 7 s seit dem Marker
    expect(el.paused).toBe(false)
  })

  it('Spulen hinter das Track-Ende startet ihn nicht', () => {
    // Länge ermitteln
    expect(tracks.trackDuration('blob:drop')).toBeNull()
    const probe = created[0] as FakeAudio
    probe.duration = 20
    probe.emit('loadedmetadata')
    expect(tracks.trackDuration('blob:drop')).toBe(20)

    markers = [{ id: 1, time: 5, action: { audioTrack: dropRef() } }]
    tracks.seek(40)
    expect(created).toHaveLength(1) // nur die Längen-Abfrage
  })

  it('Spieldauer ab Startposition für die Marker-Dauer', () => {
    tracks.trackDuration('blob:drop')
    const probe = created[0] as FakeAudio
    probe.duration = 20
    probe.emit('loadedmetadata')
    expect(tracks.displaySeconds(dropRef({ offset: 5 }))).toBe(15)
    expect(tracks.displaySeconds({ url: 'blob:x', name: 'weg' })).toBeNull()
  })

  it('wartet bei neu gesetzter Quelle auf die Metadaten, bevor es springt', () => {
    const marker = { id: 1, time: 0, action: { audioTrack: dropRef() } }
    tracks.apply(marker)
    const el = created[0] as FakeAudio
    el.readyState = 0 // neue Quelle lädt noch
    tracks.apply({
      ...marker,
      action: { audioTrack: { url: 'blob:song', name: 'song.mp3', offset: 4 } },
    })
    expect(el.getAttribute('src')).toBe('blob:song')
    expect(el.currentTime).toBe(0)
    el.emit('loadedmetadata')
    expect(el.currentTime).toBe(4)
  })

  it('reconcile hält Tracks gelöschter oder geänderter Marker an', () => {
    markers = [
      { id: 1, time: 0, action: { audioTrack: dropRef() } },
      { id: 2, time: 0, action: { audioTrack: dropRef() } },
    ]
    tracks.apply(markers[0] as TestMarker)
    tracks.apply(markers[1] as TestMarker)
    markers = [{ id: 2, time: 0, action: { audioTrack: { url: 'blob:song', name: 'song.mp3' } } }]
    tracks.reconcile()
    expect((created[0] as FakeAudio).paused).toBe(true)
    expect((created[1] as FakeAudio).paused).toBe(true)
  })

  it('Formular: Auswahl, Verweis und Track-Liste', () => {
    expect(tracks.getMarkerPlaylistTracks()).toEqual([
      { value: 'blob:song', number: 1, name: 'song.mp3' },
      { value: 'blob:drop', number: 2, name: 'drop.wav' },
    ])
    expect(tracks.resolveSelection('blob:drop', 0.8, 2)).toEqual({
      url: 'blob:drop',
      name: 'drop.wav',
      volume: 0.8,
      offset: 2,
    })
    expect(tracks.resolveSelection('', 1, 0)).toBeNull()
    expect(tracks.resolveSelection('blob:weg', 1, 0)).toBeNull()
    expect(tracks.editSelection(dropRef())).toBe('blob:drop')
    expect(tracks.editSelection({ url: 'blob:x', name: 'weg' })).toBe('')
  })

  it('Ducking: Song wird abgesenkt, solange der Track läuft, danach wieder 100 %', () => {
    const a = { id: 1, time: 0, action: { audioTrack: dropRef({ duck: 0.3 }) } }
    const b = { id: 2, time: 0, action: { audioTrack: dropRef({ duck: 0.5 }) } }
    tracks.apply(a)
    ;(created[0] as FakeAudio).emit('playing')
    expect(setPlayerDuck).toHaveBeenLastCalledWith(0.3)
    tracks.apply(b)
    ;(created[1] as FakeAudio).emit('playing')
    // niedrigster Wert gilt → keine neue Änderung
    expect(setPlayerDuck).toHaveBeenCalledTimes(1)
    tracks.stop(1)
    expect(setPlayerDuck).toHaveBeenLastCalledWith(0.5)
    tracks.stopAll()
    expect(setPlayerDuck).toHaveBeenLastCalledWith(1)
  })

  it('Ducking endet mit dem Track (ended)', () => {
    tracks.apply({ id: 1, time: 0, action: { audioTrack: dropRef({ duck: 0.2 }) } })
    const el = created[0] as FakeAudio
    el.emit('playing')
    expect(setPlayerDuck).toHaveBeenLastCalledWith(0.2)
    el.paused = true
    Object.assign(el, { ended: true })
    el.emit('ended')
    expect(setPlayerDuck).toHaveBeenLastCalledWith(1)
  })

  it('ohne Ducking bleibt der Song unverändert', () => {
    tracks.apply({ id: 1, time: 0, action: { audioTrack: dropRef() } })
    ;(created[0] as FakeAudio).emit('playing')
    expect(setPlayerDuck).not.toHaveBeenCalled()
    expect(markerTrackDuck(dropRef())).toBeNull()
    expect(markerTrackDuck(dropRef({ duck: 1.5 }))).toBe(1)
    expect(tracks.resolveSelection('blob:drop', 1, 0, 0.25)?.duck).toBe(0.25)
    expect(tracks.resolveSelection('blob:drop', 1, 0)).not.toHaveProperty('duck')
  })

  it('dispose hält an und gibt die Quellen frei', () => {
    tracks.apply({ id: 1, time: 0, action: { audioTrack: dropRef() } })
    tracks.dispose()
    const el = created[0] as FakeAudio
    expect(el.paused).toBe(true)
    expect(el.getAttribute('src')).toBeNull()
  })
})

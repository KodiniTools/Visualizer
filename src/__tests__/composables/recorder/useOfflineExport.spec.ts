// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useOfflineExport } from '../../../composables/recorder/useOfflineExport'
import type { OfflineExportDeps } from '../../../composables/recorder/useOfflineExport'
import { usePlayerStore } from '../../../stores/playerStore'
import { useAudioSourceStore } from '../../../stores/audioSourceStore'
import { useBeatMarkerStore } from '../../../stores/beatMarkerStore'
import type { BeatMarker } from '../../../stores/beatMarkerStore'
import { registerAudioEngine } from '../../../lib/audioEngineBridge'
import type { AudioEngineApi } from '../../../lib/audioEngineBridge'
import { OfflineExportError } from '../../../lib/offlineExport/errors'
import type { RunOfflineExportOptions } from '../../../lib/offlineExport/runOfflineExport'
import type { OfflineScene } from '../../../lib/offlineExport/offlineSceneBridge'
import { stub } from '../../helpers/canvasStubs'

const buffer = (duration: number, tag: string) => ({ duration, tag }) as unknown as AudioBuffer

const scene: OfflineScene = {
  outputSize: () => ({ width: 1280, height: 720 }),
  begin: vi.fn(),
  renderFrame: vi.fn(),
  end: vi.fn(),
}

function withSetup(deps: Partial<OfflineExportDeps> = {}) {
  let api: ReturnType<typeof useOfflineExport> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useOfflineExport({
          fps: ref(60),
          bitrate: ref(15_000_000),
          getScene: () => scene,
          supportsWebCodecs: () => true,
          decode: async (url) => buffer(url === 'blob:main' ? 4 : 2, url),
          createObjectUrl: () => 'blob:result',
          revokeObjectUrl: vi.fn(),
          ...deps,
        })
        return () => h('div')
      },
    }),
  )
  return { api: api as ReturnType<typeof useOfflineExport>, wrapper }
}

let unregisterEngine = () => {}

beforeEach(() => {
  setActivePinia(createPinia())
  const player = usePlayerStore()
  player.playlist = [
    { name: 'main.wav', url: 'blob:main' },
    { name: 'voice.wav', url: 'blob:voice' },
  ]
  player.currentTime = 1.5
  unregisterEngine = registerAudioEngine(
    stub<AudioEngineApi>({ getToneGains: () => ({ bass: 4, treble: -2 }) }),
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  unregisterEngine()
  vi.restoreAllMocks()
})

describe('useOfflineExport', () => {
  it('übergibt Track, Marker-Tracks, Klang und Einstellungen und liefert die MP4', async () => {
    const markers = useBeatMarkerStore()
    markers.markers = [
      stub<BeatMarker>({
        id: 1,
        time: 1.25,
        action: {
          audioTrack: { url: 'blob:voice', name: 'voice.wav', volume: 0.6, offset: 0.5, duck: 0.3 },
        },
      }),
      stub<BeatMarker>({ id: 2, time: 3, action: { visualizer: 'bars' } }),
    ]
    const player = usePlayerStore()
    let seen: RunOfflineExportOptions | null = null
    const run = vi.fn(async (options: RunOfflineExportOptions) => {
      seen = options
      await options.timeline.begin()
      expect(player.isPlaying).toBe(true)
      expect(player.isMuted).toBe(true)
      options.timeline.seek(2)
      expect(player.currentTime).toBe(2)
      options.onProgress?.({ frame: 120, total: 240 })
      options.timeline.end()
      return {
        blob: new Blob(['x']),
        frames: 240,
        videoCodec: 'avc' as const,
        audioCodec: 'aac' as const,
      }
    })
    const { api } = withSetup({ run })

    await api.start()

    expect(run).toHaveBeenCalledTimes(1)
    const options = seen as unknown as RunOfflineExportOptions
    expect(options.fps).toBe(60)
    expect(options.bitrate).toBe(15_000_000)
    expect(options.width).toBe(1280)
    expect(options.height).toBe(720)
    expect(options.mix).toMatchObject({
      bassDb: 4,
      trebleDb: -2,
      analysePlayer: true,
      duration: 4,
      sampleRate: 48000,
    })
    expect((options.mix.main as unknown as { tag: string }).tag).toBe('blob:main')
    expect(options.mix.overlays).toEqual([
      { buffer: buffer(2, 'blob:voice'), start: 1.25, offset: 0.5, volume: 0.6, duck: 0.3 },
    ])
    expect(api.status.value).toBe('completed')
    expect(api.resultUrl.value).toBe('blob:result')
    expect(api.progress.value).toBe(50)
    expect(api.renderedSeconds.value).toBe(2)
    expect(api.totalSeconds.value).toBe(4)
    // Player zurück: angehalten an der alten Position, Ton wieder an
    expect(player.isPlaying).toBe(false)
    expect(player.offlinePlayback).toBe(false)
    expect(player.isMuted).toBe(false)
    expect(player.currentTime).toBe(1.5)
  })

  it('Marker aus: keine Marker-Tracks; Analyse-Quelle Video', async () => {
    const markers = useBeatMarkerStore()
    markers.markers = [
      stub<BeatMarker>({
        id: 1,
        time: 1,
        action: { audioTrack: { url: 'blob:voice', name: 'voice.wav' } },
      }),
    ]
    markers.markersEnabled = false
    useAudioSourceStore().analysisInput = 'video'
    const run = vi.fn(async (_options: RunOfflineExportOptions) => ({
      blob: new Blob(['x']),
      frames: 1,
      videoCodec: 'avc' as const,
      audioCodec: null,
    }))
    const { api } = withSetup({ run })
    await api.start()
    const options = run.mock.calls[0]![0]
    expect(options.mix.overlays).toEqual([])
    expect(options.mix.analysePlayer).toBe(false)
  })

  it.each([
    ['no-track', () => (usePlayerStore().playlist = [])],
    ['microphone', () => (useAudioSourceStore().isMicrophoneActive = true)],
  ])('meldet %s ohne zu rendern', async (code, arrange) => {
    arrange()
    const run = vi.fn()
    const { api } = withSetup({ run })
    await api.start()
    expect(run).not.toHaveBeenCalled()
    expect(api.status.value).toBe('error')
    expect(api.errorCode.value).toBe(code)
  })

  it('meldet zu lange Tracks, fehlendes WebCodecs und Render-Fehler', async () => {
    const tooLong = withSetup({ decode: async () => buffer(11 * 60, 'long'), run: vi.fn() })
    await tooLong.api.start()
    expect(tooLong.api.errorCode.value).toBe('too-long')

    const unsupported = withSetup({ supportsWebCodecs: () => false })
    expect(unsupported.api.isSupported.value).toBe(false)
    expect(unsupported.api.canStart.value).toBe(false)
    await unsupported.api.start()
    expect(unsupported.api.errorCode.value).toBe('unsupported')

    const failing = withSetup({
      run: vi.fn(async () => {
        throw new OfflineExportError('decode')
      }),
    })
    await failing.api.start()
    expect(failing.api.errorCode.value).toBe('decode')

    const crash = withSetup({
      run: vi.fn(async () => {
        throw new TypeError('x')
      }),
    })
    await crash.api.start()
    expect(crash.api.errorCode.value).toBe('render')
    crash.api.dismiss()
    expect(crash.api.status.value).toBe('')
    expect(crash.api.errorCode.value).toBeNull()
  })

  it('Abbrechen beendet ohne Fehler und stellt den Player wieder her', async () => {
    const player = usePlayerStore()
    const run = vi.fn(async (options: RunOfflineExportOptions) => {
      await options.timeline.begin()
      await new Promise<void>((resolve) =>
        options.signal?.addEventListener('abort', () => resolve()),
      )
      throw new DOMException('aborted', 'AbortError')
    })
    const { api } = withSetup({ run })
    const running = api.start()
    await flushPromises()
    await nextTick()
    expect(api.isRunning.value).toBe(true)
    expect(player.offlinePlayback).toBe(true)

    api.cancel()
    await running

    expect(api.status.value).toBe('')
    expect(api.errorCode.value).toBeNull()
    expect(player.offlinePlayback).toBe(false)
    expect(player.isPlaying).toBe(false)
    expect(player.isMuted).toBe(false)
  })

  it('Schließen gibt das Ergebnis frei; Unmount bricht ab und räumt auf', async () => {
    const revoke = vi.fn()
    const run = vi.fn(async () => ({
      blob: new Blob(['x']),
      frames: 1,
      videoCodec: 'avc' as const,
      audioCodec: null,
    }))
    const { api, wrapper } = withSetup({ run, revokeObjectUrl: revoke })
    await api.start()
    api.dismiss()
    expect(revoke).toHaveBeenCalledWith('blob:result')
    expect(api.resultUrl.value).toBeNull()

    await api.start()
    wrapper.unmount()
    expect(revoke).toHaveBeenCalledTimes(2)
  })
})

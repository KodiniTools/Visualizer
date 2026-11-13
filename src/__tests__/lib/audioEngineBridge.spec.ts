// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import {
  registerAudioEngine,
  getAudioEngine,
  type AudioEngineApi,
} from '../../lib/audioEngineBridge'
import { useAudioEngine } from '../../composables/useAudioEngine'
import { useAudioSourceControls } from '../../composables/useAudioSourceControls'
import { useMicrophoneToggle } from '../../composables/useMicrophoneToggle'
import { usePlayerVolumeEq } from '../../composables/usePlayerVolumeEq'
import { useCanvasVideos } from '../../composables/videoPanel/useCanvasVideos'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { stub } from '../helpers/canvasStubs'

const ENGINE_KEYS = [
  'connectTrackOverlay',
  'connectVideoToRecording',
  'disconnectVideoFromRecording',
  'getAudioStreamForRecorder',
  'setBassGain',
  'setPlayerDuck',
  'setTrackOverlayVolume',
  'setTrebleGain',
  'setVideoVolume',
  'switchAudioSource',
  'toggleRecordingMicrophone',
] as (keyof AudioEngineApi)[]

/** Engine-Attrappe: jede Funktion als Mock */
type StubEngine = { [K in keyof AudioEngineApi]: Mock<AudioEngineApi[K]> }

/** Stub-Engine: jede Funktion ist ein vi.fn(), Rückgabe per `results` steuerbar. */
function stubEngine(results: Partial<Record<keyof AudioEngineApi, unknown>> = {}) {
  const api: Record<string, Mock> = {}
  for (const k of ENGINE_KEYS) api[k] = vi.fn(async () => results[k])
  return stub<StubEngine>(api)
}

/** Composable in einer Komponente ausführen (für onMounted/watch). */
function withSetup<T>(fn: () => T) {
  let result: T | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        result = fn()
        return () => h('div')
      },
    }),
  )
  return { result, wrapper }
}

let unregister = () => {}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  unregister()
  unregister = () => {}
  vi.restoreAllMocks()
})

describe('audioEngineBridge', () => {
  it('liefert null ohne Engine und die registrierte Engine danach', () => {
    expect(getAudioEngine()).toBeNull()
    const api = stubEngine()
    unregister = registerAudioEngine(api)
    expect(getAudioEngine()).toBe(api)
    unregister()
    expect(getAudioEngine()).toBeNull()
  })

  it('Abmelden einer alten Engine lässt eine neuere unangetastet', () => {
    const oldApi = stubEngine()
    const newApi = stubEngine()
    const unregisterOld = registerAudioEngine(oldApi)
    unregister = registerAudioEngine(newApi)
    unregisterOld()
    expect(getAudioEngine()).toBe(newApi)
  })
})

describe('useAudioEngine.registerEngine', () => {
  it('meldet alle Funktionen an der Bridge an, ohne window-Globals', () => {
    const engine = useAudioEngine({
      audioRef: ref(null),
      audioSourceStore: stub({ stopMicrophone: vi.fn() }),
      playerStore: null,
    })
    engine.registerEngine()
    unregister = () => engine.cleanup()

    const api = getAudioEngine()
    expect(Object.keys(api!).sort()).toEqual(ENGINE_KEYS)
    for (const k of ENGINE_KEYS) {
      expect(typeof api![k]).toBe('function')
      expect((window as unknown as Record<string, unknown>)[k]).toBeUndefined()
    }
    expect(api!.getAudioStreamForRecorder).toBe(engine.createCombinedAudioStream)
  })

  it('cleanup meldet die Engine wieder ab', () => {
    const engine = useAudioEngine({
      audioRef: ref(null),
      audioSourceStore: stub({ stopMicrophone: vi.fn() }),
      playerStore: null,
    })
    engine.registerEngine()
    engine.cleanup()
    expect(getAudioEngine()).toBeNull()
  })

  it('Stream ohne Audio-Kontext ist null', async () => {
    const engine = useAudioEngine({
      audioRef: ref(null),
      audioSourceStore: stub({ stopMicrophone: vi.fn() }),
      playerStore: null,
    })
    engine.registerEngine()
    unregister = () => engine.cleanup()
    expect(await getAudioEngine()!.getAudioStreamForRecorder()).toBeNull()
  })
})

describe('Aufrufer nutzen die Bridge', () => {
  it('useAudioSourceControls schaltet die Quelle über die Engine', async () => {
    const api = stubEngine({ switchAudioSource: true })
    unregister = registerAudioEngine(api)
    const { result } = withSetup(() => useAudioSourceControls())

    await result!.selectSource('microphone')
    expect(api.switchAudioSource).toHaveBeenCalledWith('microphone')

    const store = useAudioSourceStore()
    store.sourceType = 'microphone'
    api.switchAudioSource.mockClear()
    result!.selectedDevice.value = 'mic-2'
    await result!.changeDevice()
    expect(store.selectedDeviceId).toBe('mic-2')
    expect(api.switchAudioSource.mock.calls).toEqual([['player'], ['microphone']])
  })

  it('useAudioSourceControls meldet einen Fehler ohne Engine', async () => {
    const { result } = withSetup(() => useAudioSourceControls())
    await result!.selectSource('microphone')
    expect(console.error).toHaveBeenCalledWith('[StickyPlayerBar] switchAudioSource not available')
  })

  it('useMicrophoneToggle: Erfolg behält den Zustand, Fehlschlag setzt zurück', async () => {
    const api = stubEngine({ toggleRecordingMicrophone: true })
    unregister = registerAudioEngine(api)
    const { result } = withSetup(() => useMicrophoneToggle())

    result!.microphoneEnabled.value = true
    await result!.toggleMicrophone()
    expect(api.toggleRecordingMicrophone).toHaveBeenCalledWith(true)
    expect(result!.microphoneEnabled.value).toBe(true)

    api.toggleRecordingMicrophone.mockResolvedValueOnce(false)
    await result!.toggleMicrophone()
    expect(result!.microphoneEnabled.value).toBe(false)
    expect(result!.isSwitchingSource.value).toBe(false)
  })

  it('useMicrophoneToggle ohne Engine setzt den Schalter zurück', async () => {
    const { result } = withSetup(() => useMicrophoneToggle())
    result!.microphoneEnabled.value = true
    await result!.toggleMicrophone()
    expect(result!.microphoneEnabled.value).toBe(false)
  })

  it('usePlayerVolumeEq stellt gespeicherten Bass/Höhen über die Engine her', () => {
    localStorage.setItem('playerBass', '4')
    localStorage.setItem('playerTreble', '-3')
    const api = stubEngine()
    unregister = registerAudioEngine(api)
    const { result } = withSetup(() => usePlayerVolumeEq())

    expect(api.setBassGain).toHaveBeenCalledWith(4)
    expect(api.setTrebleGain).toHaveBeenCalledWith(-3)

    result!.bass.value = 7
    result!.updateBass()
    expect(api.setBassGain).toHaveBeenLastCalledWith(7)
    expect(localStorage.getItem('playerBass')).toBe('7')
  })

  it('usePlayerVolumeEq speichert ohne Engine nichts', () => {
    const { result } = withSetup(() => usePlayerVolumeEq())
    result!.bass.value = 5
    result!.updateBass()
    expect(localStorage.getItem('playerBass')).toBeNull()
  })

  it('useCanvasVideos trennt beim Entfernen das Video-Audio', () => {
    const api = stubEngine()
    unregister = registerAudioEngine(api)
    const el = { muted: false, volume: 0.5 }
    const vm = { removeVideo: vi.fn(), getAllVideos: () => [] }
    const cm = { setActiveObject: vi.fn() }
    const cv = useCanvasVideos(stub(ref(cm)), stub(ref(vm)), ref(0))

    cv.removeCanvasVideo(stub({ id: 'v1', videoElement: el }))
    expect(api.disconnectVideoFromRecording).toHaveBeenCalledWith(el)
    expect(vm.removeVideo).toHaveBeenCalledWith('v1')
  })

  it('useCanvasVideos entfernt ohne Engine trotzdem', () => {
    const vm = { removeVideo: vi.fn(), getAllVideos: () => [] }
    const cv = useCanvasVideos(stub(ref({ setActiveObject: vi.fn() })), stub(ref(vm)), ref(0))
    cv.removeCanvasVideo(stub({ id: 'v1', videoElement: {} }))
    expect(vm.removeVideo).toHaveBeenCalledWith('v1')
  })
})

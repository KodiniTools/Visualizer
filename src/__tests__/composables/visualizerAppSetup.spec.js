// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { reactive, ref, nextTick, toRaw } from 'vue'

const ksInstances = []
vi.mock('../../lib/keyboardShortcuts.js', () => ({
  KeyboardShortcuts: class {
    constructor(stores, managers) {
      this.stores = stores
      this.managers = managers
      this.enable = vi.fn()
      ksInstances.push(this)
    }
  },
}))

import { startLazyFontLoading } from '../../composables/visualizerApp/lazyFonts.js'
import { bindAudioElementEvents } from '../../composables/visualizerApp/audioElementEvents.js'
import {
  watchGridSettings,
  watchWorkspacePreset,
  watchRecordingCanvasSize,
} from '../../composables/visualizerApp/canvasSync.js'
import { setupKeyboardShortcuts } from '../../composables/visualizerApp/keyboardShortcutsSetup.js'
import { bindHqCaptureEvents } from '../../composables/visualizerApp/hqCaptureEvents.js'

beforeEach(() => {
  ksInstances.length = 0
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('startLazyFontLoading', () => {
  it('lädt bei der ersten Interaktion genau einmal', async () => {
    vi.useFakeTimers()
    const fm = { initialize: vi.fn(async () => ({ loaded: 3 })) }
    startLazyFontLoading(fm, ['f'])
    expect(fm.initialize).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('keydown'))
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(6000)
    expect(fm.initialize).toHaveBeenCalledTimes(1)
    expect(fm.initialize).toHaveBeenCalledWith(['f'])
  })

  it('lädt spätestens nach der Fallback-Zeit', () => {
    vi.useFakeTimers()
    const fm = { initialize: vi.fn(async () => ({ loaded: 0 })) }
    startLazyFontLoading(fm, [], { fallbackMs: 5000 })
    vi.advanceTimersByTime(4999)
    expect(fm.initialize).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fm.initialize).toHaveBeenCalledTimes(1)
  })
})

describe('bindAudioElementEvents', () => {
  function setup(ctxState = 'running') {
    const audio = document.createElement('audio')
    const ctx = { state: ctxState, resume: vi.fn() }
    const playerStore = { isPlaying: false }
    const audioEngine = {
      getAudioContext: () => ctx,
      enableRecorderAudio: vi.fn(),
      disableRecorderAudio: vi.fn(),
    }
    bindAudioElementEvents(audio, { playerStore, audioEngine })
    return { audio, ctx, playerStore, audioEngine }
  }

  it('play: isPlaying, angehaltenen Kontext fortsetzen, Aufnahme-Audio an', () => {
    const { audio, ctx, playerStore, audioEngine } = setup('suspended')
    audio.dispatchEvent(new Event('play'))
    expect(playerStore.isPlaying).toBe(true)
    expect(ctx.resume).toHaveBeenCalled()
    expect(audioEngine.enableRecorderAudio).toHaveBeenCalled()
  })

  it('pause und ended: Aufnahme-Audio aus, ended ändert isPlaying nicht', () => {
    const { audio, ctx, playerStore, audioEngine } = setup()
    audio.dispatchEvent(new Event('play'))
    expect(ctx.resume).not.toHaveBeenCalled()
    audio.dispatchEvent(new Event('ended'))
    expect(playerStore.isPlaying).toBe(true)
    audio.dispatchEvent(new Event('pause'))
    expect(playerStore.isPlaying).toBe(false)
    expect(audioEngine.disableRecorderAudio).toHaveBeenCalledTimes(2)
  })

  it('ohne Audio-Element passiert nichts', () => {
    expect(() => bindAudioElementEvents(null, {})).not.toThrow()
  })
})

describe('watchGridSettings', () => {
  const gm = () => ({ setVisibility: vi.fn(), setGridColor: vi.fn(), setSnapToGrid: vi.fn() })

  it('überträgt sofort und bei Änderungen, auch auf einen neuen GridManager', async () => {
    const first = gm()
    const gridManagerInstance = ref(first)
    const gridStore = reactive({
      isVisible: true,
      gridColor: '#fff',
      gridOpacity: 0.5,
      snapToGrid: false,
    })
    watchGridSettings({ gridManagerInstance, gridStore })
    expect(first.setVisibility).toHaveBeenCalledWith(true)
    expect(first.setGridColor).toHaveBeenCalledWith('#fff', 0.5)
    expect(first.setSnapToGrid).toHaveBeenCalledWith(false)

    gridStore.snapToGrid = true
    gridStore.gridColor = '#000'
    await nextTick()
    expect(first.setSnapToGrid).toHaveBeenLastCalledWith(true)
    expect(first.setGridColor).toHaveBeenLastCalledWith('#000', 0.5)

    const second = gm()
    gridManagerInstance.value = second
    await nextTick()
    expect(second.setVisibility).toHaveBeenCalledWith(true)
    expect(second.setGridColor).toHaveBeenCalledWith('#000', 0.5)
    expect(second.setSnapToGrid).toHaveBeenCalledWith(true)
  })

  it('ohne GridManager kein Aufruf', () => {
    expect(() =>
      watchGridSettings({ gridManagerInstance: ref(null), gridStore: reactive({}) }),
    ).not.toThrow()
  })
})

describe('watchWorkspacePreset', () => {
  it('setzt Preset und Größe von Canvas und Aufnahme-Canvas, ohne Preset 1920×1080', async () => {
    const canvas = { width: 0, height: 0 }
    const rec = { width: 0, height: 0 }
    const cm = { setWorkspacePreset: vi.fn() }
    const workspaceStore = reactive({ selectedPresetKey: 'tiktok' })
    watchWorkspacePreset({
      workspaceStore,
      canvasRef: ref(canvas),
      canvasManagerInstance: ref(cm),
      presets: { tiktok: { width: 1080, height: 1920 } },
      getRecordingCanvas: () => rec,
    })
    expect(cm.setWorkspacePreset).toHaveBeenCalledWith('tiktok')
    expect([canvas.width, canvas.height, rec.width, rec.height]).toEqual([1080, 1920, 1080, 1920])

    workspaceStore.selectedPresetKey = null
    await nextTick()
    expect(cm.setWorkspacePreset).toHaveBeenLastCalledWith(null)
    expect([canvas.width, canvas.height, rec.width, rec.height]).toEqual([1920, 1080, 1920, 1080])
  })

  it('ohne Canvas oder CanvasManager passiert nichts', () => {
    const cm = { setWorkspacePreset: vi.fn() }
    watchWorkspacePreset({
      workspaceStore: reactive({ selectedPresetKey: 'tiktok' }),
      canvasRef: ref(null),
      canvasManagerInstance: ref(cm),
      presets: {},
      getRecordingCanvas: () => null,
    })
    expect(cm.setWorkspacePreset).not.toHaveBeenCalled()
  })
})

describe('watchRecordingCanvasSize', () => {
  it('gleicht die Aufnahme-Canvas bei Größenänderung an (nicht sofort)', async () => {
    const canvas = reactive({ width: 800, height: 600 })
    const rec = { width: 1, height: 1 }
    watchRecordingCanvasSize({ canvasRef: ref(canvas), getRecordingCanvas: () => rec })
    expect([rec.width, rec.height]).toEqual([1, 1])
    canvas.width = 1280
    canvas.height = 720
    await nextTick()
    expect([rec.width, rec.height]).toEqual([1280, 720])
  })
})

describe('setupKeyboardShortcuts', () => {
  const stores = { playerStore: {}, recorderStore: {}, gridStore: {}, historyStore: {} }

  it('richtet sofort ein, wenn beide Manager bereit sind', () => {
    const instanceRef = ref(null)
    const cm = {}
    const mim = {}
    setupKeyboardShortcuts({
      instanceRef,
      canvasManagerInstance: ref(cm),
      multiImageManagerInstance: ref(mim),
      stores,
    })
    expect(ksInstances).toHaveLength(1)
    expect(toRaw(instanceRef.value)).toBe(ksInstances[0])
    expect(ksInstances[0].stores).toBe(stores)
    expect(ksInstances[0].managers).toEqual({ canvasManager: cm, multiImageManager: mim })
    expect(ksInstances[0].enable).toHaveBeenCalled()
  })

  it('wartet auf die Manager und richtet genau einmal ein', async () => {
    const instanceRef = ref(null)
    const canvasManagerInstance = ref(null)
    const multiImageManagerInstance = ref(null)
    setupKeyboardShortcuts({
      instanceRef,
      canvasManagerInstance,
      multiImageManagerInstance,
      stores,
    })
    expect(ksInstances).toHaveLength(0)
    canvasManagerInstance.value = {}
    await nextTick()
    expect(ksInstances).toHaveLength(0)
    multiImageManagerInstance.value = {}
    await nextTick()
    expect(ksInstances).toHaveLength(1)
    canvasManagerInstance.value = {}
    await nextTick()
    expect(ksInstances).toHaveLength(1)
  })
})

describe('bindHqCaptureEvents', () => {
  it('startet mit dem aktuellen Aufnahme-Canvas und meldet Rest-Frames', async () => {
    const canvas = {}
    const startCapture = vi.fn()
    const stopCapture = vi.fn(async () => ['f1'])
    bindHqCaptureEvents({ getRecordingCanvas: () => canvas, startCapture, stopCapture })
    const onBatch = () => {}
    window.dispatchEvent(new CustomEvent('hq:startCapture', { detail: { fps: 30, onBatch } }))
    expect(startCapture).toHaveBeenCalledWith(canvas, 30, onBatch)

    const remaining = vi.fn()
    window.addEventListener('hq:captureRemaining', remaining, { once: true })
    window.dispatchEvent(new CustomEvent('hq:stopCapture'))
    await Promise.resolve()
    await Promise.resolve()
    expect(remaining).toHaveBeenCalledTimes(1)
    expect(remaining.mock.calls[0][0].detail).toEqual(['f1'])
  })
})

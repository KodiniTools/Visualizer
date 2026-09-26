import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBgSettings } from '../../composables/useBgSettings.js'
import { useBackgroundBridgeStore } from '../../stores/backgroundBridgeStore.js'
import { useTickerStore } from '../../stores/tickerStore.js'
import { AUDIO_REACTIVE_PRESETS } from '../../lib/audio/audioReactiveConfig.js'

/**
 * Verhaltenstests für useBgSettings: sichern die öffentliche API und die
 * Wirkung auf den CanvasManager ab (Farbe, Gradient, Audio-Reaktiv, Flip,
 * Ersetzen/Galerie, Presets, Snapshots, Reset, Lifecycle).
 */

// Bild-Attrappe: löst onload (bzw. onerror bei "fail"-URLs) asynchron aus.
class FakeImage {
  constructor() {
    this.crossOrigin = null
    this.naturalWidth = 640
    this.naturalHeight = 480
  }
  set src(v) {
    this._src = v
    queueMicrotask(() => {
      if (String(v).includes('fail') && this.crossOrigin) this.onerror?.()
      else if (String(v).includes('fail-always')) this.onerror?.()
      else this.onload?.()
    })
  }
  get src() {
    return this._src
  }
}

function fakeVideo(src, extra = {}) {
  return { src, muted: true, loop: true, pause: vi.fn(), ...extra }
}

function makeCanvasManager() {
  const cm = {
    background: 'rgba(255, 255, 255, 1)',
    workspaceBackground: null,
    videoBackground: null,
    workspaceVideoBackground: null,
    workspacePreset: null,
    redrawCallback: vi.fn(),
    updateUICallback: vi.fn(),
    setBackground: vi.fn(function (v) {
      this.background = typeof v === 'string' ? v : { imageObject: v }
    }),
    setWorkspaceBackground: vi.fn(function (img) {
      this.workspaceBackground = { imageObject: img }
    }),
    setVideoBackground: vi.fn(function (video) {
      this.videoBackground = { videoElement: video }
    }),
    setWorkspaceVideoBackground: vi.fn(function (video) {
      this.workspaceVideoBackground = { videoElement: video }
    }),
    setGradientSettings: vi.fn(),
    setBackgroundColorAudioReactive: vi.fn(),
    updateBackgroundFlip: vi.fn(),
    updateWorkspaceBackgroundFlip: vi.fn(),
    replaceBackground: vi.fn(() => true),
    replaceWorkspaceBackground: vi.fn(() => true),
    isCanvasEmpty: vi.fn(() => true),
    reset: vi.fn(),
    setActiveObject: vi.fn(),
    multiImageManager: {
      images: [],
      getAllImages() {
        return this.images
      },
      clear: vi.fn(),
      restoreImage: vi.fn(),
      fotoManager: { initializeImageSettings: vi.fn((d) => (d.fotoSettings = { init: true })) },
    },
    videoManager: {
      videos: [],
      getAllVideos() {
        return this.videos
      },
      clear: vi.fn(),
      addVideo: vi.fn(async () => ({})),
    },
    textManager: { textObjects: [] },
  }
  return cm
}

let wrapper
let bg
let cmRef

function mountBg(cm = makeCanvasManager()) {
  cmRef = ref(cm)
  const Host = defineComponent({
    setup() {
      bg = useBgSettings()
      return () => h('div')
    },
  })
  wrapper = mount(Host, { global: { provide: { canvasManager: cmRef } } })
  return cmRef.value
}

const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()
    await nextTick()
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('Image', FakeImage)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useBgSettings – öffentliche API', () => {
  it('liefert unverändert alle Schlüssel', () => {
    mountBg()
    expect(Object.keys(bg).sort()).toMatchSnapshot()
  })
})

describe('useBgSettings – Farbe', () => {
  it('Helfer konvertieren Farben', () => {
    mountBg()
    expect(bg.hexToRGBA('#ff8000', 0.5)).toBe('rgba(255, 128, 0, 0.5)')
    expect(bg.rgbToHex(255, 7.6, 0)).toBe('#ff0800')
    expect(bg.parseRGBA('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
    expect(bg.parseRGBA('rgba(1,2,3,0.25)')).toEqual({ r: 1, g: 2, b: 3, a: 0.25 })
    expect(bg.parseRGBA('kaputt')).toBeNull()
  })

  it('initialisiert beim Mounten auf Weiß', () => {
    const cm = mountBg()
    expect(cm.setBackground).toHaveBeenCalledWith('#ffffff')
    expect(bg.colorDisplay.value).toBe('rgba(255, 255, 255, 1)')
  })

  it('Texteingabe (rgba und hex) setzt Farbe + Deckkraft', async () => {
    const cm = mountBg()
    await flush() // verzögerte Initialisierung (nextTick) abwarten
    bg.colorDisplay.value = ' rgba(16, 32, 48, 0.4) '
    bg.updateFromTextInput()
    expect(bg.backgroundColor.value).toBe('#102030')
    expect(bg.backgroundOpacity.value).toBe(0.4)
    expect(cm.setBackground).toHaveBeenLastCalledWith('rgba(16, 32, 48, 0.4)')

    bg.colorDisplay.value = '#abcdef'
    bg.updateFromTextInput()
    expect(bg.backgroundColor.value).toBe('#abcdef')

    const calls = cm.setBackground.mock.calls.length
    bg.colorDisplay.value = 'ungültig'
    bg.updateFromTextInput()
    expect(cm.setBackground.mock.calls.length).toBe(calls)

    await nextTick()
    expect(bg.colorDisplay.value).toBe('rgba(171, 205, 239, 0.4)')
  })

  it('Gradient-Einstellungen gehen an den CanvasManager', () => {
    const cm = mountBg()
    bg.gradientEnabled.value = true
    bg.gradientAngle.value = 90
    bg.updateGradientSettings()
    expect(cm.setGradientSettings).toHaveBeenLastCalledWith({
      enabled: true,
      color2: '#0066ff',
      type: 'radial',
      angle: 90,
    })
  })
})

describe('useBgSettings – Audio-Reaktiv', () => {
  it('Handler aktualisieren Konfiguration und Renderer', () => {
    const cm = mountBg()
    bg.setBgAudioEnabled(1)
    expect(bg.bgAudioReactive.enabled).toBe(true)
    bg.setBgAudioProperty('gain', 2)
    bg.setBgAudioProperty('effects', 'x')
    bg.setBgAudioProperty('gibtsNicht', 1)
    expect(bg.bgAudioReactive.gain).toBe(2)
    expect(bg.bgAudioReactive.gibtsNicht).toBeUndefined()

    const name = Object.keys(bg.bgAudioReactive.effects)[0]
    bg.setBgEffectEnabled(name, true)
    bg.setBgEffectIntensity(name, '250')
    expect(bg.bgAudioReactive.effects[name].intensity).toBe(100)
    bg.setBgEffectIntensity(name, 'abc')
    expect(bg.bgAudioReactive.effects[name].intensity).toBe(100)
    bg.setBgEffectSource(name, '')
    expect(bg.bgAudioReactive.effects[name].source).toBeNull()
    bg.setBgEffectSource(name, 'mid')
    expect(bg.bgAudioReactive.effects[name].source).toBe('mid')

    const last = cm.setBackgroundColorAudioReactive.mock.calls.at(-1)[0]
    expect(last.effects[name]).toMatchObject({ enabled: true, intensity: 100, source: 'mid' })

    bg.setBgAudioEnabled(false)
    expect(bg.activeBgAudioPreset.value).toBeNull()
  })

  it('Preset an/aus stellt Nutzer-Effekte wieder her', () => {
    mountBg()
    const name = Object.keys(bg.bgAudioReactive.effects)[0]
    bg.setBgEffectIntensity(name, 33)
    const before = JSON.stringify(bg.bgAudioReactive)
    const rev = bg.bgAudioRevision.value

    bg.toggleBgAudioPreset('gibtsNicht')
    expect(bg.activeBgAudioPreset.value).toBeNull()

    const [first, second] = Object.keys(AUDIO_REACTIVE_PRESETS)
    bg.toggleBgAudioPreset(first)
    expect(bg.activeBgAudioPreset.value).toBe(first)
    expect(bg.bgAudioReactive.enabled).toBe(true)
    expect(bg.bgAudioRevision.value).toBeGreaterThan(rev)
    // Wechsel zwischen Presets behält das ursprüngliche Backup
    bg.toggleBgAudioPreset(second)
    expect(bg.activeBgAudioPreset.value).toBe(second)
    bg.toggleBgAudioPreset(second)
    expect(bg.activeBgAudioPreset.value).toBeNull()
    expect(JSON.stringify(bg.bgAudioReactive)).toBe(before)
  })

  it('Speichern/Anwenden über localStorage', () => {
    mountBg()
    expect(bg.hasSavedBgAudioSettings.value).toBe(false)
    bg.setBgAudioProperty('gain', 1.7)
    bg.saveBgAudioSettings()
    expect(bg.hasSavedBgAudioSettings.value).toBe(true)
    expect(JSON.parse(localStorage.getItem('visualizer_bgAudioReactivePreset')).gain).toBe(1.7)

    bg.setBgAudioProperty('gain', 1)
    bg.applyBgAudioSettings()
    expect(bg.bgAudioReactive.gain).toBe(1.7)
  })

  it('liest gespeicherte Einstellungen beim Start', () => {
    localStorage.setItem('visualizer_bgAudioReactivePreset', JSON.stringify({ gain: 3 }))
    mountBg()
    expect(bg.hasSavedBgAudioSettings.value).toBe(true)
  })
})

describe('useBgSettings – Flip', () => {
  it('nur mit passendem Hintergrund', async () => {
    const cm = mountBg()
    await flush()
    bg.toggleBgFlipH()
    expect(cm.updateBackgroundFlip).not.toHaveBeenCalled()

    cmRef.value.background = { imageObject: { src: 'a.png' }, fotoSettings: { flipH: true } }
    await nextTick()
    expect(bg.hasImageBackground.value).toBe(true)
    expect(bg.backgroundImageSrc.value).toBe('a.png')
    expect(bg.bgFlipH.value).toBe(true)
    bg.toggleBgFlipV()
    expect(cm.updateBackgroundFlip).toHaveBeenLastCalledWith(true, true)

    bg.toggleWsBgFlipH()
    expect(cm.updateWorkspaceBackgroundFlip).not.toHaveBeenCalled()
    cmRef.value.workspaceBackground = { imageObject: { src: 'w.png' } }
    await nextTick()
    bg.toggleWsBgFlipH()
    bg.toggleWsBgFlipV()
    expect(cm.updateWorkspaceBackgroundFlip).toHaveBeenLastCalledWith(true, true)
    expect(bg.workspaceBackgroundImageSrc.value).toBe('w.png')
    bg.replaceType.value = 'workspace'
    expect(bg.currentBackgroundForReplace.value).toBe('w.png')
    bg.replaceType.value = 'background'
    expect(bg.currentBackgroundForReplace.value).toBe('a.png')

    // Watcher setzen Flip zurück, wenn der Hintergrund keine fotoSettings hat
    cmRef.value.workspaceBackground = null
    await nextTick()
    expect(bg.wsBgFlipH.value).toBe(false)
  })
})

describe('useBgSettings – Ersetzen & Galerie', () => {
  it('Modal-Ablauf ersetzt Workspace-Hintergrund', async () => {
    const cm = mountBg()
    bg.openBackgroundReplaceModal('workspace')
    expect(bg.showBackgroundReplaceModal.value).toBe(true)
    expect(bg.replaceType.value).toBe('workspace')

    bg.confirmBackgroundReplace()
    expect(cm.replaceWorkspaceBackground).not.toHaveBeenCalled()

    const img = new FakeImage()
    bg.pendingBackgroundReplaceImage.value = img
    bg.confirmBackgroundReplace()
    expect(cm.replaceWorkspaceBackground).toHaveBeenCalledTimes(1)
    expect(bg.showBackgroundReplaceModal.value).toBe(false)
    expect(bg.pendingBackgroundReplaceImage.value).toBeNull()

    bg.openBackgroundReplaceModal('background')
    bg.pendingBackgroundReplaceImage.value = img
    bg.cancelBackgroundReplace()
    expect(bg.pendingBackgroundReplaceImage.value).toBeNull()
    bg.pendingBackgroundReplaceImage.value = img
    bg.confirmBackgroundReplace()
    expect(cm.replaceBackground).toHaveBeenCalledTimes(1)
  })

  it('Galerie lädt Index, erste Kategorie, Cache und Bildauswahl', async () => {
    mountBg()
    const fetchMock = vi.fn(async (url) => {
      if (url === 'gallery/gallery.json') return { ok: false }
      if (url === './gallery/gallery.json') {
        return {
          ok: true,
          json: async () => ({
            _version: '2.0',
            categories: [
              { id: 'a', jsonFile: 'a.json' },
              { id: 'b', jsonFile: 'b.json' },
              { id: 'c' },
            ],
          }),
        }
      }
      return { ok: true, json: async () => ({ images: [{ file: `${url}-1.jpg` }] }) }
    })
    vi.stubGlobal('fetch', fetchMock)

    await bg.openBgReplaceGallery()
    expect(bg.showBgReplaceGallery.value).toBe(true)
    expect(bg.selectedBgCategory.value).toBe('a')
    expect(bg.bgGalleryImages.value).toEqual([{ file: 'a.json-1.jpg' }])
    expect(bg.bgGalleryLoading.value).toBe(false)

    await bg.selectBgGalleryCategory('b')
    await bg.selectBgGalleryCategory('a')
    expect(fetchMock.mock.calls.filter((c) => c[0] === 'a.json')).toHaveLength(1)
    await bg.selectBgGalleryCategory('c')
    expect(bg.bgGalleryImages.value).toEqual([])

    bg.selectBgGalleryImage({ file: 'pic.jpg' })
    await bg.confirmBgReplaceFromGallery()
    expect(bg.pendingBackgroundReplaceSrc.value).toBe('pic.jpg')
    expect(bg.pendingBackgroundReplaceImage.value.crossOrigin).toBe('anonymous')
    expect(bg.showBgReplaceGallery.value).toBe(false)

    // Ohne Auswahl: nur schließen
    bg.showBgReplaceGallery.value = true
    await bg.confirmBgReplaceFromGallery()
    expect(bg.showBgReplaceGallery.value).toBe(false)

    // Erneutes Öffnen lädt den Index nicht neu
    const n = fetchMock.mock.calls.length
    await bg.openBgReplaceGallery()
    expect(fetchMock.mock.calls.length).toBe(n)
  })
})

describe('useBgSettings – Presets', () => {
  function populate(cm) {
    cm.background = {
      imageObject: { src: 'bg.png' },
      fotoSettings: { flipH: false, audioReactive: { enabled: true } },
    }
    cm.multiImageManager.images = [
      {
        imageObject: { src: 'i1.png' },
        relX: 0.1,
        relY: 0.2,
        relWidth: 0.3,
        relHeight: 0.4,
        settings: { brightness: 90 },
        fotoSettings: { rotation: 3 },
      },
      { imageObject: {}, relX: 0 },
    ]
    cm.videoManager.videos = [
      { videoElement: { src: 'blob:v1' }, relX: 0.5, relY: 0.5, relWidth: 0.2, relHeight: 0.2 },
    ]
    cm.textManager.textObjects = [{ id: 't1', text: 'Hi', animation: { type: 'fade' } }]
  }

  it('speichert den kompletten Zustand', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234)
    const cm = mountBg()
    populate(cm)
    bg.backgroundColor.value = '#112233'
    bg.gradientEnabled.value = 1
    bg.saveCurrentAsPreset()
    expect(bg.savedPresets.value).toHaveLength(1)
    const stored = JSON.parse(localStorage.getItem('visualizer-canvas-presets'))
    const preset = stored[0]
    expect(preset.elements.ticker).toBeTruthy()
    preset.elements.ticker = '[ticker]'
    expect(preset).toMatchSnapshot()
  })

  it('Rollback, wenn localStorage voll ist', () => {
    mountBg()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    bg.saveCurrentAsPreset()
    expect(bg.savedPresets.value).toHaveLength(0)
  })

  it('lädt gespeicherte Presets beim Mounten und löscht sie', () => {
    localStorage.setItem('visualizer-canvas-presets', JSON.stringify([{ id: 1 }, { id: 2 }]))
    mountBg()
    expect(bg.savedPresets.value).toHaveLength(2)
    bg.deletePreset(1)
    expect(JSON.parse(localStorage.getItem('visualizer-canvas-presets'))).toEqual([{ id: 2 }])
  })

  it('Farb-Preset: entfernt Videos + Workspace-Bild, setzt Farbe und Gradient', () => {
    const cm = mountBg()
    const vid = fakeVideo('blob:x')
    cm.videoBackground = { videoElement: vid }
    cm.workspaceBackground = { imageObject: { src: 'w' } }
    bg.loadPreset({
      backgroundColor: '#010203',
      backgroundOpacity: 0.5,
      gradientEnabled: true,
      gradientAngle: 0,
    })
    expect(vid.pause).toHaveBeenCalled()
    expect(vid.src).toBe('')
    expect(cm.videoBackground).toBeNull()
    expect(cm.workspaceBackground).toBeNull()
    expect(cm.setBackground).toHaveBeenLastCalledWith('rgba(1, 2, 3, 0.5)')
    // loadPreset: 0 → Standardwinkel 45 (|| statt ??)
    expect(cm.setGradientSettings).toHaveBeenLastCalledWith({
      enabled: true,
      color2: '#0066ff',
      type: 'radial',
      angle: 45,
    })
    expect(cm.setBackgroundColorAudioReactive).toHaveBeenCalled()
  })

  it('Bild-Preset + Elemente: Hintergrund und Szene werden wiederhergestellt', async () => {
    const cm = mountBg()
    cm.workspacePreset = 'x'
    bg.loadPreset({
      backgroundColor: '#000000',
      backgroundOpacity: 1,
      backgroundImage: { target: 'workspace', src: 'fail-cors.png', settings: { flipV: true } },
      elements: {
        images: [
          { src: 'data:image/png;base64,AAA', relX: 0.5 },
          { src: 'x.png', fotoSettings: { a: 1 }, settings: { b: 2 } },
          { src: null },
        ],
        texts: [{ id: 't', animation: { type: 'fade', _state: { isPlaying: true } } }],
        videos: [],
        ticker: { enabled: true },
      },
    })
    await flush()
    expect(cm.setWorkspaceBackground).toHaveBeenCalledTimes(1)
    expect(cm.workspaceBackground.fotoSettings).toEqual({ flipV: true })
    expect(cm.multiImageManager.clear).toHaveBeenCalled()
    expect(cm.setActiveObject).toHaveBeenCalledWith(null)
    const restored = cm.multiImageManager.restoreImage.mock.calls
    expect(restored).toHaveLength(2)
    const byIndex = Object.fromEntries(restored.map(([d, i]) => [i, d]))
    expect(byIndex[0]).toMatchObject({
      type: 'image',
      relX: 0.5,
      relY: 0.33,
      settings: { brightness: 100, blur: 0 },
      fotoSettings: { init: true },
    })
    expect(byIndex[1]).toMatchObject({ settings: { b: 2 }, fotoSettings: { a: 1 } })
    expect(cm.textManager.textObjects[0].animation._state).toEqual({
      startTime: null,
      isPlaying: false,
      currentIndex: 0,
    })
    expect(useTickerStore().enabled).toBe(true)
  })

  it('fehlerhafte Presets werden abgefangen', () => {
    mountBg()
    cmRef.value = null
    expect(() => bg.loadPreset({ backgroundColor: '#000' })).not.toThrow()
    expect(console.error).toHaveBeenCalled()
  })
})

describe('useBgSettings – Snapshot (Beat-Marker)', () => {
  it('erfasst Hintergrund und registriert die Bridge', () => {
    const cm = mountBg()
    cm.workspaceVideoBackground = {
      videoElement: { src: 'blob:ws', muted: false, loop: false },
      fotoSettings: { x: 1 },
    }
    bg.gradientType.value = 'linear'
    const snap = useBackgroundBridgeStore().captureSnapshot()
    expect(snap).toEqual(bg.buildBackgroundSnapshot())
    expect(snap).toMatchSnapshot()
  })

  it('Video-Snapshot startet das Video von vorne', async () => {
    const cm = mountBg()
    const created = []
    const orig = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag !== 'video') return orig(tag)
      const v = { load: vi.fn(), play: vi.fn(() => Promise.resolve()), currentTime: 5 }
      created.push(v)
      return v
    })
    bg.applyBackgroundSnapshot({
      backgroundColor: '#ffffff',
      gradientAngle: 0,
      backgroundVideo: { src: 'blob:v', muted: true, settings: { s: 1 } },
    })
    expect(created).toHaveLength(1)
    const v = created[0]
    expect(v).toMatchObject({ src: 'blob:v', muted: true, loop: true, crossOrigin: 'anonymous' })
    v.onloadeddata()
    expect(cm.setVideoBackground).toHaveBeenCalledWith(v)
    expect(cm.videoBackground.fotoSettings).toEqual({ s: 1 })
    expect(v.currentTime).toBe(0)
    expect(v.play).toHaveBeenCalled()
    // Snapshot: 0 bleibt 0 (?? statt ||)
    expect(cm.setGradientSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ angle: 0, enabled: false }),
    )
  })

  it('ohne CanvasManager passiert nichts', () => {
    mountBg()
    cmRef.value = null
    expect(() => bg.applyBackgroundSnapshot({ backgroundColor: '#000' })).not.toThrow()
  })
})

describe('useBgSettings – Reset & Events', () => {
  it('resetAllBackgrounds entfernt alles', () => {
    const cm = mountBg()
    const v1 = fakeVideo('a')
    const v2 = fakeVideo('b')
    cm.videoBackground = { videoElement: v1 }
    cm.workspaceVideoBackground = { videoElement: v2 }
    cm.workspaceBackground = {}
    bg.backgroundColor.value = '#000000'
    bg.resetAllBackgrounds()
    expect(v1.pause).toHaveBeenCalled()
    expect(v2.src).toBe('')
    expect(cm.videoBackground).toBeNull()
    expect(cm.workspaceVideoBackground).toBeNull()
    expect(cm.workspaceBackground).toBeNull()
    expect(bg.backgroundColor.value).toBe('#ffffff')
    expect(cm.redrawCallback).toHaveBeenCalled()
  })

  it('resetNormalBackground / resetWorkspaceBackgroundOnly / confirmReset', () => {
    const cm = mountBg()
    const v1 = fakeVideo('a')
    const v2 = fakeVideo('b')
    cm.videoBackground = { videoElement: v1 }
    cm.workspaceVideoBackground = { videoElement: v2 }
    cm.workspaceBackground = {}
    bg.resetNormalBackground()
    expect(cm.videoBackground).toBeNull()
    expect(cm.workspaceVideoBackground).not.toBeNull()
    expect(cm.workspaceBackground).not.toBeNull()
    bg.resetWorkspaceBackgroundOnly()
    expect(cm.workspaceVideoBackground).toBeNull()
    expect(cm.workspaceBackground).toBeNull()
    bg.backgroundOpacity.value = 0.2
    bg.confirmReset()
    expect(cm.reset).toHaveBeenCalled()
    expect(bg.backgroundOpacity.value).toBe(1)
  })

  it('Reset ohne CanvasManager warnt nur', () => {
    mountBg()
    cmRef.value = null
    bg.resetNormalBackground()
    bg.resetWorkspaceBackgroundOnly()
    bg.resetAllBackgrounds()
    bg.confirmReset()
    expect(console.warn).toHaveBeenCalledTimes(4)
  })

  it('preset:apply-Event setzt Farbe/Gradient; Unmount entfernt Listener + Bridge', () => {
    const cm = mountBg()
    window.dispatchEvent(
      new CustomEvent('preset:apply', {
        detail: { background: { color: '#00ff00', opacity: 0.5, gradientEnabled: true } },
      }),
    )
    expect(bg.backgroundColor.value).toBe('#00ff00')
    expect(cm.setBackground).toHaveBeenLastCalledWith('rgba(0, 255, 0, 0.5)')
    expect(cm.setGradientSettings).toHaveBeenCalled()

    wrapper.unmount()
    wrapper = null
    window.dispatchEvent(
      new CustomEvent('preset:apply', { detail: { background: { color: '#0000ff' } } }),
    )
    expect(bg.backgroundColor.value).toBe('#00ff00')
    expect(useBackgroundBridgeStore().captureSnapshot()).toBeNull()
  })
})

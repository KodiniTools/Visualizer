import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive, ref } from 'vue'
import { useHistoryStore } from '../../stores/historyStore.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { useTickerStore } from '../../stores/tickerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useBackgroundTilesStore } from '../../stores/backgroundTilesStore.js'
import { useGridStore } from '../../stores/gridStore.js'
import { createHistoryRecorder } from '../../lib/history/historyRecorder.js'
import {
  createBackgroundTilesSegment,
  createBeatMarkerSegment,
  createGridSegment,
  createTickerSegment,
  createVisualizerSegment,
} from '../../lib/history/segments/storeSegments.js'
import {
  createImagesSegment,
  createTextsSegment,
  createVideosSegment,
} from '../../lib/history/segments/canvasSegments.js'
import { createBackgroundSegment } from '../../lib/history/segments/backgroundSegment.js'
import { createTextObject } from '../../lib/textManager/createTextObject.js'

/** Fake-Bild-Element (jsdom lädt keine Bilder) */
function fakeImage(src) {
  return { tagName: 'IMG', src, complete: true, naturalWidth: 10, width: 10, height: 10 }
}

/** Fake-Video-Element mit src-Attribut wie im Browser */
function fakeVideo(src) {
  let attr = src
  return {
    tagName: 'VIDEO',
    getAttribute: (name) => (name === 'src' ? attr : null),
    set src(v) {
      attr = v
    },
    get src() {
      return attr
    },
    pause: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    loop: true,
    muted: true,
    playbackRate: 1,
  }
}

function makeCanvasManager() {
  const cm = reactive({
    activeObject: null,
    selectedObjects: [],
    background: '#ffffff',
    workspaceBackground: null,
    videoBackground: null,
    workspaceVideoBackground: null,
    gradientSettings: { enabled: false, color2: '#000', type: 'radial', angle: 0 },
    setGradientSettings(s) {
      this.gradientSettings = { ...this.gradientSettings, ...s }
    },
    setActiveObject(obj) {
      this.activeObject = obj
    },
    textManager: { textObjects: [] },
    multiImageManager: {
      images: [],
      selectedImage: null,
      onImageSelected: vi.fn(),
      onImageChanged: vi.fn(),
    },
    videoManager: {
      videos: [],
      selectedVideo: null,
      isPlaying: false,
      onVideoSelected: vi.fn(),
      onVideoChanged: vi.fn(),
    },
  })
  return cm
}

describe('History-Segmente', () => {
  let store
  let recorder

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    store = useHistoryStore()
    recorder = createHistoryRecorder({ historyStore: store })
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    recorder.destroy()
    vi.restoreAllMocks()
  })

  // ── Stores ────────────────────────────────────────────────────────────────

  it('Visualizer: Einstellungen + Layer, Laufzeitfeld wird ignoriert', async () => {
    const viz = useVisualizerStore()
    recorder.registerSegment('visualizer', createVisualizerSegment(viz))

    const originalColor = viz.visualizerColor
    viz.setColor('#123456')
    viz.addLayer()
    recorder.checkpoint()
    expect(store.history.length).toBe(1)

    // Laufzeit (Render-Loop) erzeugt keinen Schritt
    viz.markVisualizerWorking(viz.selectedVisualizer)
    viz.lastWorkingVisualizer = 'irgendwas'
    expect(recorder.checkpoint()).toBeNull()

    await store.undo()
    expect(viz.visualizerColor).toBe(originalColor)
    expect(viz.visualizerLayers.length).toBe(0)
    expect(viz.multiLayerMode).toBe(false)

    await store.redo()
    expect(viz.visualizerColor).toBe('#123456')
    expect(viz.visualizerLayers.length).toBe(1)
    expect(viz.activeLayerId).toBe(viz.visualizerLayers[0].id)
  })

  it('Ticker: verschachteltes audioFx wird in-place wiederhergestellt', async () => {
    const ticker = useTickerStore()
    recorder.registerSegment('ticker', createTickerSegment(ticker))
    const audioFxRef = ticker.audioFx

    ticker.text = 'Hallo'
    ticker.audioFx.enabled = !ticker.audioFx.enabled
    recorder.checkpoint()
    await store.undo()

    expect(ticker.text).not.toBe('Hallo')
    expect(ticker.audioFx).toBe(audioFxRef) // Identität erhalten
  })

  it('Beat-Marker: triggered ist kein Verlaufsschritt; IDs kollidieren nach Undo nicht', async () => {
    const markers = useBeatMarkerStore()
    recorder.registerSegment('beatMarkers', createBeatMarkerSegment(markers))

    markers.addMarker(1)
    markers.addMarker(2)
    recorder.checkpoint()

    markers.markers[0].triggered = true // Wiedergabe
    expect(recorder.checkpoint()).toBeNull()

    markers.clearAllMarkers()
    recorder.checkpoint()
    await store.undo()
    expect(markers.markers.map((m) => m.id)).toEqual([1, 2])

    const added = markers.addMarker(3)
    expect([1, 2]).not.toContain(added.id)
  })

  it('Raster: Sichtbarkeit/Farbe', async () => {
    const grid = useGridStore()
    recorder.registerSegment('grid', createGridSegment(grid))
    grid.toggleGrid()
    grid.setColor('#ff0000')
    recorder.checkpoint()
    await store.undo()
    expect(grid.isVisible).toBe(false)
    expect(grid.gridColor).toBe('#333333')
  })

  it('Kacheln: Bild bleibt als Element erhalten, Einstellungen werden zurückgesetzt', async () => {
    const tiles = useBackgroundTilesStore()
    tiles.setTilesEnabled(true)
    recorder.registerSegment('backgroundTiles', createBackgroundTilesSegment(tiles))

    const img = fakeImage('data:image/png;base64,AAA')
    tiles.setTileImage(0, img, img.src)
    tiles.updateTileImageSetting(0, 'brightness', 150)
    recorder.checkpoint()

    tiles.removeTileImage(0)
    recorder.checkpoint()
    expect(tiles.tiles[0].image).toBeNull()

    await store.undo()
    expect(tiles.tiles[0].imageSrc).toBe(img.src)
    expect(tiles.tiles[0].image).toStrictEqual(img) // gleiches Element aus der Registry
    expect(tiles.tiles[0].imageSettings.brightness).toBe(150)
  })

  it('Snapshots enthalten große Data-URLs nur als kurzen Schlüssel', () => {
    const tiles = useBackgroundTilesStore()
    tiles.setTilesEnabled(true)
    const seg = createBackgroundTilesSegment(tiles)
    const bigSrc = 'data:image/png;base64,' + 'A'.repeat(100000)
    tiles.setTileImage(0, fakeImage(bigSrc), bigSrc)
    const json = JSON.stringify(seg.capture())
    expect(json.length).toBeLessThan(20000)
    expect(json).toContain('media:')
  })

  // ── Canvas-Objekte ─────────────────────────────────────────────────────────

  it('Texte: Löschen + Undo stellt dasselbe Objekt wieder her, Auswahl ändert nichts', async () => {
    const cm = makeCanvasManager()
    recorder.registerSegment(
      'texts',
      createTextsSegment(() => cm),
    )
    const a = createTextObject('A')
    const b = createTextObject('B')
    b.id = a.id + 1
    cm.textManager.textObjects.push(a, b)
    recorder.rebase()

    // Auswahl verschiebt den Text nach oben (moveToTop) – kein Verlaufsschritt
    cm.textManager.textObjects.reverse()
    expect(recorder.checkpoint()).toBeNull()

    cm.activeObject = cm.textManager.textObjects[0]
    const removed = cm.textManager.textObjects.shift()
    expect(recorder.checkpoint('delete:text')).not.toBeNull()

    await store.undo()
    expect(cm.textManager.textObjects.map((t) => t.content).sort()).toEqual(['A', 'B'])
    expect(cm.textManager.textObjects.find((t) => t.id === removed.id)).toBe(removed)

    await store.redo()
    expect(cm.textManager.textObjects.length).toBe(1)
    expect(cm.activeObject).toBeNull() // gelöschter Text ist nicht mehr ausgewählt
  })

  it('Texte: Eigenschaften werden in-place gepatcht, Animations-Status bleibt', async () => {
    const cm = makeCanvasManager()
    recorder.registerSegment(
      'texts',
      createTextsSegment(() => cm),
    )
    const t = createTextObject('Hi')
    cm.textManager.textObjects.push(t)
    recorder.rebase()

    const live = cm.textManager.textObjects[0]
    const audioRef = live.audioReactive
    live.fontSize = 99
    live.shadow.blur = 7
    live.animation._state = { startTime: 1, isPlaying: true, currentIndex: 3 }
    recorder.checkpoint()

    await store.undo()
    expect(live.fontSize).not.toBe(99)
    expect(live.shadow.blur).toBe(0)
    expect(live.audioReactive).toBe(audioRef)
    expect(live.animation._state.currentIndex).toBe(3)
  })

  it('Bilder: Position/Filter, Slideshow-Bilder und Filter-Caches werden ignoriert', async () => {
    const cm = makeCanvasManager()
    const mgr = cm.multiImageManager
    recorder.registerSegment(
      'images',
      createImagesSegment(() => cm),
    )
    mgr.images.push({
      id: 1,
      type: 'image',
      imageObject: fakeImage('data:a'),
      relX: 0.1,
      relY: 0.1,
      relWidth: 0.3,
      relHeight: 0.3,
      settings: { brightness: 100 },
      fotoSettings: { brightness: 100, rotation: 0, audioReactive: { enabled: false } },
    })
    recorder.rebase()

    const img = mgr.images[0]
    img.fotoSettings._cachedFilterKey = 'x' // Renderer-Cache
    mgr.images.push({ id: 99, isSlideshowImage: true, imageObject: fakeImage('data:s') })
    expect(recorder.checkpoint()).toBeNull()

    img.relX = 0.5
    img.fotoSettings.rotation = 45
    recorder.checkpoint()

    mgr.images.splice(0, 1) // löschen
    recorder.checkpoint()

    await store.undo()
    expect(mgr.images.map((i) => i.id)).toEqual([1, 99])
    await store.undo()
    expect(mgr.images[0].relX).toBe(0.1)
    expect(mgr.images[0].fotoSettings.rotation).toBe(0)
    expect(mgr.images[0].imageObject.src).toBe('data:a')
  })

  it('Videos: entfernte Videos werden nur pausiert, zerstörte aus der Quelle neu erzeugt', async () => {
    const cm = makeCanvasManager()
    const mgr = cm.videoManager
    recorder.registerSegment(
      'videos',
      createVideosSegment(() => cm),
    )
    const el = fakeVideo('blob:video-1')
    mgr.videos.push({
      id: 5,
      type: 'video',
      videoElement: el,
      relX: 0,
      relY: 0,
      relWidth: 0.5,
      relHeight: 0.5,
      playbackRate: 1,
      startTime: 0,
      endTime: 10,
      settings: {},
      fotoSettings: {},
    })
    recorder.rebase()

    // Löschen mit Zerstörung (z. B. Reset: src = '')
    const removed = mgr.videos.pop()
    removed.videoElement.src = ''
    recorder.checkpoint()

    await store.undo()
    expect(mgr.videos.length).toBe(1)
    expect(mgr.videos[0].videoElement.getAttribute('src')).toBe('blob:video-1')

    await store.redo()
    expect(mgr.videos.length).toBe(0)
  })

  it('Hintergrund: Farbe, Gradient und Bild-Hintergrund', async () => {
    const cm = makeCanvasManager()
    const refs = {
      backgroundColor: ref('#ffffff'),
      backgroundOpacity: ref(1),
      gradientEnabled: ref(false),
      gradientColor2: ref('#0066ff'),
      gradientType: ref('radial'),
      gradientAngle: ref(45),
    }
    const bgAudioReactive = reactive({ enabled: false, effects: { pulse: { enabled: false } } })
    const afterApply = vi.fn()
    recorder.registerSegment(
      'background',
      createBackgroundSegment({ getCanvasManager: () => cm, refs, bgAudioReactive, afterApply }),
    )

    refs.backgroundColor.value = '#ff0000'
    cm.background = 'rgba(255, 0, 0, 1)'
    refs.gradientEnabled.value = true
    bgAudioReactive.effects.pulse.enabled = true
    recorder.checkpoint()

    const bgObj = {
      id: '1_bg',
      type: 'background',
      imageObject: fakeImage('data:bg'),
      fotoSettings: { flipH: false },
    }
    cm.background = bgObj
    recorder.checkpoint()

    await store.undo()
    expect(cm.background).toBe('rgba(255, 0, 0, 1)')

    await store.redo()
    expect(cm.background.id).toBe('1_bg')
    expect(cm.background.imageObject.src).toBe('data:bg')

    await store.undo()
    await store.undo()
    expect(cm.background).toBe('#ffffff')
    expect(refs.backgroundColor.value).toBe('#ffffff')
    expect(refs.gradientEnabled.value).toBe(false)
    expect(cm.gradientSettings.enabled).toBe(false)
    expect(bgAudioReactive.effects.pulse.enabled).toBe(false)
    expect(afterApply).toHaveBeenCalled()
  })
})

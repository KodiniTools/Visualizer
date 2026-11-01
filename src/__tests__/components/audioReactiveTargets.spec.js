// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ShapeAudioReactive from '../../components/shapes/ShapeAudioReactive.vue'
import TickerAudioReactive from '../../components/ticker/TickerAudioReactive.vue'
import VideoAudioReactive from '../../components/video-panel/VideoAudioReactive.vue'
import { useShapeStore } from '../../stores/shapeStore.js'
import { useTickerStore } from '../../stores/tickerStore.js'
import { setAudioAnalysisData } from '../../lib/audio/audioAnalysisData.js'
import { historyApplyRevision } from '../../lib/history/historyRecorder.js'

// Verhalten der drei Audio-Reaktiv-Ziele (Form, Lauftext, Video) gegenüber dem
// gemeinsamen AudioReactivePanel. Gilt vor und nach dem Zusammenführen.

const loadSettings = vi.fn()
let bar
const PanelStub = defineComponent({
  name: 'AudioReactivePanel',
  props: {
    hasActiveImage: Boolean,
    hasSavedSettings: Boolean,
    activeAudioPreset: { type: String, default: null },
    allowedEffects: { type: Array, default: null },
    extraCategories: { type: Array, default: null },
  },
  setup(_, { expose }) {
    const audioLevelBarRef = ref(bar)
    expose({ loadSettings, audioLevelBarRef })
    return () => h('div', { class: 'panel-stub' })
  },
})

const ev = (value) => ({ target: { value, checked: value } })
let rafQueue
function runFrame() {
  const q = rafQueue
  rafQueue = []
  q.forEach((cb) => cb())
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  loadSettings.mockClear()
  bar = { style: {} }
  rafQueue = []
  vi.stubGlobal('requestAnimationFrame', (cb) => (rafQueue.push(cb), rafQueue.length))
  vi.stubGlobal('cancelAnimationFrame', () => {
    rafQueue = []
  })
  setAudioAnalysisData({ smoothBass: 255, smoothMid: 51, smoothTreble: 0, smoothVolume: 102 })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setAudioAnalysisData(null)
})

const mountWith = (comp, props) =>
  mount(comp, { props, global: { stubs: { AudioReactivePanel: PanelStub } } })

/** Gemeinsame Abläufe; `target` liefert Zugriff auf Konfiguration und Schalter. */
function sharedBehaviour(name, setup) {
  describe(`${name} – gemeinsames Verhalten`, () => {
    it('Master-Regler und Effekte schreiben in die Konfiguration', async () => {
      const { wrapper, cfg } = await setup()
      const p = wrapper.findComponent(PanelStub)
      p.vm.$emit('audio-reactive-toggle', ev(true))
      p.vm.$emit('source-change', ev('mid'))
      p.vm.$emit('smoothing-change', ev('42'))
      p.vm.$emit('easing-change', ev('easeIn'))
      p.vm.$emit('beat-boost-change', ev('1.5'))
      p.vm.$emit('phase-change', ev('90'))
      p.vm.$emit('gain-change', ev('1.25'))
      const c = cfg()
      expect([c.source, c.smoothing, c.easing, c.beatBoost, c.phase, c.gain]).toEqual([
        'mid',
        42,
        'easeIn',
        1.5,
        90,
        1.25,
      ])
      const fx = Object.keys(c.effects)[0]
      p.vm.$emit('effect-toggle', fx, 1)
      p.vm.$emit('effect-intensity-change', fx, '150')
      p.vm.$emit('effect-source-change', fx, 'treble')
      expect(c.effects[fx]).toMatchObject({ enabled: true, intensity: 100, source: 'treble' })
      p.vm.$emit('effect-intensity-change', fx, 'abc')
      expect(c.effects[fx].intensity).toBe(100)
      p.vm.$emit('effect-source-change', fx, '')
      expect(c.effects[fx].source).toBeNull()
      // unbekannte/geschützte Eigenschaften werden ignoriert
      p.vm.$emit('source-change', ev('x'))
      wrapper.unmount()
    })

    it('Preset an/aus stellt die eigenen Effekte wieder her', async () => {
      const { wrapper, cfg } = await setup()
      const p = wrapper.findComponent(PanelStub)
      p.vm.$emit('audio-reactive-toggle', ev(true))
      const before = JSON.parse(JSON.stringify(cfg().effects))
      p.vm.$emit('toggle-preset', 'pulse')
      await nextTick()
      expect(p.props('activeAudioPreset')).toBe('pulse')
      expect(cfg().source).toBe('bass')
      p.vm.$emit('toggle-preset', 'pulse') // erneut → aus
      await nextTick()
      expect(p.props('activeAudioPreset')).toBeNull()
      expect(cfg().effects).toEqual(before)
      p.vm.$emit('toggle-preset', 'gibtsNicht')
      await nextTick()
      expect(p.props('activeAudioPreset')).toBeNull()
      wrapper.unmount()
    })

    it('Speichern und Anwenden über localStorage', async () => {
      const { wrapper, cfg, key } = await setup()
      const p = wrapper.findComponent(PanelStub)
      expect(p.props('hasSavedSettings')).toBe(false)
      p.vm.$emit('audio-reactive-toggle', ev(true))
      p.vm.$emit('gain-change', ev('1.75'))
      p.vm.$emit('save-settings')
      await nextTick()
      expect(p.props('hasSavedSettings')).toBe(true)
      expect(JSON.parse(localStorage.getItem(key)).gain).toBe(1.75)
      p.vm.$emit('gain-change', ev('0.5'))
      p.vm.$emit('apply-settings')
      expect(cfg().gain).toBe(1.75)
      wrapper.unmount()
    })

    it('liest das Panel nach Undo/Redo neu ein', async () => {
      const { wrapper } = await setup()
      loadSettings.mockClear()
      historyApplyRevision.value++
      await flushPromises()
      expect(loadSettings).toHaveBeenCalled()
      wrapper.unmount()
    })

    it('Pegelanzeige folgt der Quelle und stoppt beim Ausschalten', async () => {
      const { wrapper } = await setup()
      const p = wrapper.findComponent(PanelStub)
      p.vm.$emit('audio-reactive-toggle', ev(true))
      p.vm.$emit('source-change', ev('volume'))
      await flushPromises()
      runFrame()
      expect(bar.style.width).toBe('40%')
      expect(bar.style.background).toBe('#4ade80')
      p.vm.$emit('source-change', ev('bass'))
      runFrame()
      expect(bar.style.width).toBe('100%')
      expect(bar.style.background).toContain('#ef4444')
      p.vm.$emit('audio-reactive-toggle', ev(false))
      await flushPromises()
      runFrame()
      expect(rafQueue).toHaveLength(0)
      wrapper.unmount()
    })
  })
}

sharedBehaviour('ShapeAudioReactive', async () => {
  const store = useShapeStore()
  const shape = store.addShape('star', 800, 600)
  const wrapper = mountWith(ShapeAudioReactive, { shape })
  await flushPromises()
  return {
    wrapper,
    cfg: () => store.shapes.find((s) => s.id === shape.id).audioReactive,
    key: 'visualizer_shapeAudioReactivePreset',
  }
})

sharedBehaviour('TickerAudioReactive', async () => {
  const ticker = useTickerStore()
  const wrapper = mountWith(TickerAudioReactive)
  await flushPromises()
  return { wrapper, cfg: () => ticker.audioFx, key: 'visualizer_tickerAudioReactivePreset' }
})

sharedBehaviour('VideoAudioReactive', async () => {
  const video = { id: 'v1' }
  const wrapper = mountWith(VideoAudioReactive, { video, label: 'Hintergrund' })
  await flushPromises()
  return {
    wrapper,
    cfg: () => video.fotoSettings.audioReactive,
    key: 'visualizer_videoAudioReactivePreset',
  }
})

describe('Ziel-spezifisches Verhalten', () => {
  it('Form: ohne Auswahl kein aktives Bild, Konfiguration entsteht erst bei Änderung', async () => {
    const store = useShapeStore()
    const shape = store.addShape('star', 800, 600)
    const empty = mountWith(ShapeAudioReactive, { shape: null })
    expect(empty.findComponent(PanelStub).props('hasActiveImage')).toBe(false)
    empty.unmount()
    const wrapper = mountWith(ShapeAudioReactive, { shape })
    await flushPromises()
    const p = wrapper.findComponent(PanelStub)
    expect(p.props('hasActiveImage')).toBe(true)
    expect(p.props('allowedEffects').length).toBeGreaterThan(0)
    expect(shape.audioReactive ?? null).toBeNull()
    p.vm.$emit('gain-change', ev('1.1'))
    expect(store.shapes[0].audioReactive.gain).toBe(1.1)
    wrapper.unmount()
  })

  it('Form: Preset gilt je Form', async () => {
    const store = useShapeStore()
    const a = store.addShape('star', 800, 600)
    const b = store.addShape('star', 800, 600)
    const wrapper = mountWith(ShapeAudioReactive, { shape: a })
    await flushPromises()
    wrapper.findComponent(PanelStub).vm.$emit('toggle-preset', 'pulse')
    await wrapper.setProps({ shape: b })
    expect(wrapper.findComponent(PanelStub).props('activeAudioPreset')).toBeNull()
    await wrapper.setProps({ shape: a })
    expect(wrapper.findComponent(PanelStub).props('activeAudioPreset')).toBe('pulse')
    wrapper.unmount()
  })

  it('Lauftext: Schalter ist ticker.audioReactive, Preset schaltet ein, Anwenden übernimmt Schalter', async () => {
    const ticker = useTickerStore()
    const wrapper = mountWith(TickerAudioReactive)
    await flushPromises()
    const p = wrapper.findComponent(PanelStub)
    expect(p.props('hasActiveImage')).toBe(true)
    expect(p.props('extraCategories')[0].effects.map((e) => e.id)).toEqual(['tempo', 'opacity'])
    expect(ticker.audioReactive).toBe(false)
    p.vm.$emit('toggle-preset', 'pulse')
    expect(ticker.audioReactive).toBe(true)
    p.vm.$emit('toggle-preset', 'pulse')
    await nextTick()
    expect(ticker.audioFx.enabled).toBe(true)

    p.vm.$emit('save-settings')
    p.vm.$emit('audio-reactive-toggle', ev(false))
    expect(ticker.audioReactive).toBe(false)
    p.vm.$emit('apply-settings')
    expect(ticker.audioReactive).toBe(true)
    expect(ticker.audioFx.enabled).toBe(true)
    wrapper.unmount()
  })

  it('Video: Kopfzeile mit Bezeichnung, Konfiguration wird vervollständigt, Preset je Video', async () => {
    const v1 = { id: 'v1' }
    const v2 = { id: 'v2', fotoSettings: { audioReactive: { enabled: true, source: 'mid' } } }
    const wrapper = mountWith(VideoAudioReactive, { video: v1, label: 'Hintergrund' })
    await flushPromises()
    expect(wrapper.find('.var-label').text()).toBe('Hintergrund')
    const p = wrapper.findComponent(PanelStub)
    expect(p.props('allowedEffects')).toBeNull()
    p.vm.$emit('toggle-preset', 'pulse')
    await wrapper.setProps({ video: v2 })
    await flushPromises()
    expect(p.props('activeAudioPreset')).toBeNull()
    expect(v2.fotoSettings.audioReactive.source).toBe('mid')
    p.vm.$emit('gain-change', ev('1.3'))
    expect(Object.keys(v2.fotoSettings.audioReactive.effects).length).toBeGreaterThan(10)
    await wrapper.setProps({ video: v1 })
    await flushPromises()
    expect(p.props('activeAudioPreset')).toBe('pulse')
    expect(loadSettings).toHaveBeenLastCalledWith(v1.fotoSettings.audioReactive)
    wrapper.unmount()
  })
})

describe('Pegel-Hilfsfunktionen', () => {
  it('levelForSource wählt den Pegel, unbekannte Quelle → Bass', async () => {
    const { levelForSource } = await import(
      '../../composables/audioReactive/useAudioReactiveTarget.js'
    )
    const d = { smoothBass: 1, smoothMid: 2, smoothTreble: 3, smoothVolume: 4 }
    expect(['bass', 'mid', 'treble', 'volume', 'x'].map((s) => levelForSource(d, s))).toEqual([
      1, 2, 3, 4, 1,
    ])
    expect(levelForSource({}, 'mid')).toBe(0)
  })

  it('levelBarBackground staffelt nach Aussteuerung', async () => {
    const { levelBarBackground } = await import(
      '../../composables/audioReactive/useAudioReactiveTarget.js'
    )
    expect(levelBarBackground(10)).toBe('#4ade80')
    expect(levelBarBackground(50)).toContain('#fbbf24')
    expect(levelBarBackground(80)).toContain('#ef4444')
  })
})

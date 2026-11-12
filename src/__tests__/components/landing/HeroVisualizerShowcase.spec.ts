import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import HeroVisualizerShowcase from '../../../components/landing/HeroVisualizerShowcase.vue'
import { setLocale } from '../../../lib/i18n'
import type { HeroShowcaseEntry } from '../../../lib/landing/heroShowcase'
import type { GlPresetSpec } from '../../../lib/visualizers/gl/types'

// createGlVisualizer liefert in jsdom (kein WebGL2) den Canvas2D-Fallback;
// hier ersetzen wir ihn durch einen Fake, der jeden draw()-Aufruf protokolliert.
const drawCalls: Array<{ id: string; color: string; max: number; min: number }> = []
vi.mock('../../../lib/visualizers/gl/createGlVisualizer', () => ({
  createGlVisualizer: (spec: GlPresetSpec) => ({
    name_de: spec.name_de,
    name_en: spec.name_en,
    needsTimeData: spec.needsTimeData === true,
    init: vi.fn(),
    cleanup: vi.fn(),
    draw: (
      _ctx: unknown,
      data: Uint8Array,
      _len: number,
      _w: number,
      _h: number,
      color: string,
    ) => {
      drawCalls.push({ id: spec.id, color, max: Math.max(...data), min: Math.min(...data) })
    },
  }),
}))

const fakeSpec = (id: string, needsTimeData = false): GlPresetSpec =>
  ({ id, name_de: id, name_en: id, frag: 'void main(){}', needsTimeData }) as GlPresetSpec
const entries: HeroShowcaseEntry[] = [
  { id: 'glBars', color: '#e06cb0', load: () => Promise.resolve(fakeSpec('glBars')) },
  { id: 'glMandala', color: '#8b7cf6', load: () => Promise.resolve(fakeSpec('glMandala')) },
  {
    id: 'glWaveform',
    color: '#4fd1c5',
    load: () => Promise.resolve(fakeSpec('glWaveform', true)),
  },
]

const fakeCtx = {
  save: vi.fn(),
  restore: vi.fn(),
  setTransform: vi.fn(),
  fillRect: vi.fn(),
  createLinearGradient: () => ({ addColorStop: vi.fn() }),
  fillStyle: '',
}

let wrapper: VueWrapper | undefined
let rafQueue: FrameRequestCallback[] = []
let now = 0
function runFrames(n: number, stepMs = 16) {
  for (let i = 0; i < n; i++) {
    const q = rafQueue
    rafQueue = []
    now += stepMs
    q.forEach((cb) => cb(now))
  }
}

function setReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
}

beforeEach(async () => {
  drawCalls.length = 0
  rafQueue = []
  now = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafQueue.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {
    rafQueue = []
  })
  setReducedMotion(false)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeCtx as unknown as CanvasRenderingContext2D,
  )
  await setLocale('de')
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// random ≈ 1 → Fisher-Yates lässt die Reihenfolge unverändert
async function mountShowcase(intervalMs = 1000, random: () => number = () => 0.999) {
  wrapper = mount(HeroVisualizerShowcase, { props: { entries, intervalMs, random } })
  await vi.dynamicImportSettled()
  await flushPromises()
  return wrapper
}

describe('HeroVisualizerShowcase', () => {
  it('rendert den ersten Visualizer mit synthetischen Audiodaten', async () => {
    const w = await mountShowcase()
    runFrames(3)
    await nextTick()
    expect(drawCalls.length).toBe(3)
    expect(drawCalls.every((c) => c.id === 'glBars' && c.color === '#e06cb0')).toBe(true)
    expect(drawCalls[0]!.max).toBeGreaterThan(0)
    expect(w.find('.hero-showcase-name').text()).toBe('Balken')
    expect(w.find('canvas').classes()).toContain('is-ready')
    expect(w.find('canvas').attributes('aria-hidden')).toBe('true')
  })

  it('wechselt nach Ablauf der Anzeigedauer zum nächsten Visualizer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = await mountShowcase(100)
    runFrames(8)
    await nextTick()
    expect(w.find('canvas').classes()).toContain('is-fading')
    await vi.runAllTimersAsync()
    await flushPromises()
    drawCalls.length = 0
    runFrames(1)
    expect(drawCalls[0]?.id).toBe('glMandala')
    expect(w.find('.hero-showcase-name').text()).toBe('Mandala')
  })

  it('Pause stoppt das Rendern, Abspielen setzt es fort', async () => {
    const w = await mountShowcase()
    const toggle = w.find('[data-test="showcase-toggle"]')
    expect(toggle.attributes('aria-label')).toBe('Vorschau anhalten')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-label')).toBe('Vorschau abspielen')
    drawCalls.length = 0
    runFrames(5)
    expect(drawCalls.length).toBe(0)
    await toggle.trigger('click')
    runFrames(2)
    expect(drawCalls.length).toBe(2)
  })

  it('„Weiter“ springt sofort zum nächsten Visualizer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = await mountShowcase(60000)
    await w.find('[data-test="showcase-next"]').trigger('click')
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(w.find('.hero-showcase-name').text()).toBe('Mandala')
  })

  it('bei prefers-reduced-motion: pausiert mit Standbild', async () => {
    setReducedMotion(true)
    const w = await mountShowcase()
    expect(w.find('[data-test="showcase-toggle"]').attributes('aria-label')).toBe(
      'Vorschau abspielen',
    )
    const stillFrames = drawCalls.length
    expect(stillFrames).toBeGreaterThan(0)
    runFrames(5)
    expect(drawCalls.length).toBe(stillFrames)
  })

  it('zeigt Namen und Beschriftung auf Englisch', async () => {
    await setLocale('en')
    const w = await mountShowcase()
    expect(w.find('figure').attributes('aria-label')).toBe('Live preview of selected visualizers')
    expect(w.find('.hero-showcase-name').text()).toBe('Bars')
    expect(w.find('[data-test="showcase-next"]').attributes('aria-label')).toBe('Next visualizer')
  })

  it('startet in zufälliger Reihenfolge', async () => {
    // random = 0 → Fisher-Yates ergibt [1, 2, 0]
    const w = await mountShowcase(60000, () => 0)
    expect(w.find('.hero-showcase-name').text()).toBe('Mandala')
  })

  it('gibt Zeitbereich-Visualizern eine Wellenform statt eines Spektrums', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = await mountShowcase(60000, () => 0)
    runFrames(1)
    expect(drawCalls.at(-1)?.min).toBeLessThan(10) // Spektrum: Höhen fast 0
    await w.find('[data-test="showcase-next"]').trigger('click')
    await vi.runAllTimersAsync()
    await vi.dynamicImportSettled()
    await flushPromises()
    drawCalls.length = 0
    runFrames(1)
    expect(drawCalls[0]?.id).toBe('glWaveform')
    expect(drawCalls[0]?.min).toBeGreaterThan(10) // Wellenform um 128
  })

  it('räumt beim Unmount auf (kein weiteres Rendern)', async () => {
    const w = await mountShowcase()
    w.unmount()
    wrapper = undefined
    drawCalls.length = 0
    runFrames(3)
    expect(drawCalls.length).toBe(0)
  })
})

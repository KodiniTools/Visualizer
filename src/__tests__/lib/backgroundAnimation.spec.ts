import { describe, it, expect } from 'vitest'
import { BackgroundMethods } from '../../lib/canvasManager/methods/backgroundMethods'
import {
  applyBackgroundAnimation,
  BackgroundRenderer,
} from '../../lib/canvasManager/rendering/BackgroundRenderer'
import { createImageAnimation } from '../../lib/canvasObjects/imageAnimation'
import { stub } from '../helpers/canvasStubs'

/** Basis-Zeitpunkt (0 gilt in der Text-Zeitleiste als „nicht gestartet“) */
const T = 1_000_000
const IMG = { tag: 'img' }

/** Hintergrund-Eintrag, wie ihn die Tests auslesen */
type FakeBgSlot = { timedAnimation: ReturnType<typeof createImageAnimation> } & Record<
  string,
  unknown
>

interface FakeManager {
  workspacePreset: { id: string }
  fotoManager: null
  background?: FakeBgSlot
  workspaceBackground?: FakeBgSlot
  backgroundColor?: string
  redrawCallback(): void
  updateUICallback(): void
}

function fakeManager(workspacePreset = { id: 'ws' }): FakeManager {
  return {
    workspacePreset,
    fotoManager: null,
    redrawCallback() {},
    updateUICallback() {},
  }
}

function slideFromLeft() {
  const cfg = createImageAnimation()
  Object.assign(cfg.slide, { enabled: true, easing: 'linear', duration: 1000 })
  return cfg
}

describe('Bild-Hintergründe mit Animation', () => {
  it('setBackground/setWorkspaceBackground übernehmen eine Kopie der Animation', () => {
    const cm = fakeManager()
    const cfg = slideFromLeft()
    BackgroundMethods.prototype.setBackground.call(stub(cm), stub(IMG), { timedAnimation: cfg })
    expect(cm.background!.timedAnimation.slide.enabled).toBe(true)
    expect(cm.background!.timedAnimation).not.toBe(cfg)

    expect(
      BackgroundMethods.prototype.setWorkspaceBackground.call(stub(cm), stub(IMG), {
        timedAnimation: cfg,
      }),
    ).toBe(true)
    expect(cm.workspaceBackground!.timedAnimation.slide.enabled).toBe(true)
  })

  it('ohne aktiven Effekt bzw. ohne Optionen wie bisher', () => {
    const cm = fakeManager()
    BackgroundMethods.prototype.setBackground.call(stub(cm), stub(IMG), {
      timedAnimation: createImageAnimation(),
    })
    expect(cm.background).not.toHaveProperty('timedAnimation')
    BackgroundMethods.prototype.setWorkspaceBackground.call(stub(cm), stub(IMG))
    expect(cm.workspaceBackground).not.toHaveProperty('timedAnimation')
    BackgroundMethods.prototype.setBackground.call(stub(cm), '#123456')
    expect(cm.background).toBe('#123456')
  })

  it('applyBackgroundAnimation: Bounds verschieben, Deckkraft multiplizieren', () => {
    const ctx = { canvas: { width: 1000, height: 500 }, globalAlpha: 0.8 }
    const bounds = { x: 0, y: 0, width: 1000, height: 500 }
    const target = { timedAnimation: slideFromLeft() }
    target.timedAnimation.fade.enabled = true
    target.timedAnimation.fade.easing = 'linear'
    applyBackgroundAnimation(stub(ctx), target, bounds, T) // Start
    ctx.globalAlpha = 0.8
    const mid = applyBackgroundAnimation(stub(ctx), target, bounds, T + 500)
    expect(mid.x).toBeCloseTo(-500)
    expect(mid.width).toBe(1000)
    expect(ctx.globalAlpha).toBeCloseTo(0.4)
  })

  it('applyBackgroundAnimation ohne Animation: Bounds und Deckkraft unverändert', () => {
    const ctx = { canvas: { width: 100, height: 100 }, globalAlpha: 1 }
    const bounds = { x: 1, y: 2, width: 3, height: 4 }
    expect(applyBackgroundAnimation(stub(ctx), {}, bounds, T)).toBe(bounds)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('setBackground merkt sich die Farbe, auch wenn danach ein Bild Hintergrund wird', () => {
    const cm = fakeManager()
    BackgroundMethods.prototype.setBackground.call(stub(cm), 'rgba(5, 0, 26, 1)')
    BackgroundMethods.prototype.setBackground.call(stub(cm), stub(IMG), {
      timedAnimation: slideFromLeft(),
    })
    expect(cm.backgroundColor).toBe('rgba(5, 0, 26, 1)')
  })

  describe('Grundfläche unter animiertem Hintergrundbild', () => {
    function render(manager: Record<string, unknown>) {
      const fills: unknown[][] = []
      const ctx = {
        canvas: { width: 100, height: 50 },
        globalAlpha: 1,
        fillStyle: '',
        filter: 'none',
        save() {},
        restore() {},
        translate() {},
        scale() {},
        drawImage() {},
        fillRect: (...a: number[]) => fills.push([ctx.fillStyle, ...a]),
      }
      const r = new BackgroundRenderer(
        stub({
          _getAudioReactiveValues: () => null,
          _applyAudioReactiveFilters() {},
          gradientSettings: { enabled: false },
          ...manager,
        }),
      )
      r._drawAudioReactiveOverlays = () => {}
      r._drawImageBackground(stub(ctx))
      return fills
    }

    it('füllt mit der eingestellten Hintergrundfarbe statt Weiß', () => {
      const fills = render({
        background: { type: 'background', imageObject: {}, timedAnimation: slideFromLeft() },
        backgroundColor: 'rgba(5, 0, 26, 1)',
      })
      expect(fills[0]).toEqual(['rgba(5, 0, 26, 1)', 0, 0, 100, 50])
    })

    it('ohne gemerkte Farbe weiß; ohne Animation keine Grundfläche', () => {
      expect(
        render({
          background: { type: 'background', imageObject: {}, timedAnimation: slideFromLeft() },
        })[0]![0],
      ).toBe('#ffffff')
      expect(
        render({ background: { type: 'background', imageObject: {} }, backgroundColor: '#000000' }),
      ).toEqual([])
    })
  })
})

import { describe, it, expect } from 'vitest'
import { BackgroundMethods } from '../../lib/canvasManager/methods/backgroundMethods'
import { applyBackgroundAnimation } from '../../lib/canvasManager/rendering/BackgroundRenderer'
import { createImageAnimation } from '../../lib/canvasObjects/imageAnimation'

/** Basis-Zeitpunkt (0 gilt in der Text-Zeitleiste als „nicht gestartet“) */
const T = 1_000_000
const IMG = { tag: 'img' }

function fakeManager(workspacePreset = { id: 'ws' }) {
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
    BackgroundMethods.prototype.setBackground.call(cm, IMG, { timedAnimation: cfg })
    expect(cm.background.timedAnimation.slide.enabled).toBe(true)
    expect(cm.background.timedAnimation).not.toBe(cfg)

    expect(
      BackgroundMethods.prototype.setWorkspaceBackground.call(cm, IMG, { timedAnimation: cfg }),
    ).toBe(true)
    expect(cm.workspaceBackground.timedAnimation.slide.enabled).toBe(true)
  })

  it('ohne aktiven Effekt bzw. ohne Optionen wie bisher', () => {
    const cm = fakeManager()
    BackgroundMethods.prototype.setBackground.call(cm, IMG, {
      timedAnimation: createImageAnimation(),
    })
    expect(cm.background).not.toHaveProperty('timedAnimation')
    BackgroundMethods.prototype.setWorkspaceBackground.call(cm, IMG)
    expect(cm.workspaceBackground).not.toHaveProperty('timedAnimation')
    BackgroundMethods.prototype.setBackground.call(cm, '#123456')
    expect(cm.background).toBe('#123456')
  })

  it('applyBackgroundAnimation: Bounds verschieben, Deckkraft multiplizieren', () => {
    const ctx = { canvas: { width: 1000, height: 500 }, globalAlpha: 0.8 }
    const bounds = { x: 0, y: 0, width: 1000, height: 500 }
    const target = { timedAnimation: slideFromLeft() }
    target.timedAnimation.fade.enabled = true
    target.timedAnimation.fade.easing = 'linear'
    applyBackgroundAnimation(ctx, target, bounds, T) // Start
    ctx.globalAlpha = 0.8
    const mid = applyBackgroundAnimation(ctx, target, bounds, T + 500)
    expect(mid.x).toBeCloseTo(-500)
    expect(mid.width).toBe(1000)
    expect(ctx.globalAlpha).toBeCloseTo(0.4)
  })

  it('applyBackgroundAnimation ohne Animation: Bounds und Deckkraft unverändert', () => {
    const ctx = { canvas: { width: 100, height: 100 }, globalAlpha: 1 }
    const bounds = { x: 1, y: 2, width: 3, height: 4 }
    expect(applyBackgroundAnimation(ctx, {}, bounds, T)).toBe(bounds)
    expect(ctx.globalAlpha).toBe(1)
  })
})

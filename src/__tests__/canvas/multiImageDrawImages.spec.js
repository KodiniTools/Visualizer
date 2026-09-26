import { describe, it, expect, vi, afterEach } from 'vitest'
import { MultiImageManager } from '../../lib/multiImageManager.js'

/**
 * Charakterisierungstest für MultiImageManager.drawImages():
 * Protokolliert JEDE Canvas-Operation (Methodenaufrufe + Property-Zuweisungen)
 * in exakter Reihenfolge. Die Snapshots sichern ab, dass Refactorings der
 * Render-Pipeline das Zeichenergebnis nicht verändern.
 */

function round(v) {
  return typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v
}

function makeRecordingCtx() {
  const log = []
  const state = {
    canvas: { width: 1000, height: 1000 },
    globalAlpha: 1,
    filter: 'none',
    globalCompositeOperation: 'source-over',
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    fillStyle: '#000',
  }
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop !== 'string') return undefined
      return (...args) => {
        log.push(
          `${prop}(${args.map((a) => (a && typeof a === 'object' ? `[${a.tag || 'obj'}]` : round(a))).join(', ')})`,
        )
        if (prop === 'createRadialGradient') {
          return {
            tag: 'gradient',
            addColorStop: (o, c) => log.push(`gradient.addColorStop(${o}, ${c})`),
          }
        }
        return undefined
      }
    },
    set(target, prop, value) {
      target[prop] = value
      log.push(
        `${String(prop)} = ${value && typeof value === 'object' ? `[${value.tag || 'obj'}]` : round(value)}`,
      )
      return true
    },
  })
  return { ctx, log }
}

const IMAGE = { tag: 'img', width: 100, height: 100 }

function baseImage(extra = {}) {
  return {
    id: 1,
    type: 'image',
    imageObject: IMAGE,
    relX: 0.1,
    relY: 0.2,
    relWidth: 0.3,
    relHeight: 0.4,
    ...extra,
  }
}

const NO_ANIM = { translateX: 0, translateY: 0, scale: 1, rotation: 0, opacity: 1 }

function run({ images, audio = null, anim = NO_ANIM, fotoManager = null, options } = {}) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const mgr = new MultiImageManager(
    { width: 1000, height: 1000 },
    fotoManager ? { fotoManager } : {},
  )
  mgr.images.push(...images)
  vi.spyOn(mgr, 'getAudioReactiveValues').mockImplementation(() => audio)
  vi.spyOn(mgr, 'getAnimationTransform').mockImplementation(() => ({ ...anim }))
  const { ctx, log } = makeRecordingCtx()
  vi.spyOn(mgr, '_drawImageOutline').mockImplementation((c, img, b, ...rest) => {
    log.push(`_drawImageOutline(${JSON.stringify(b)}, ${rest.map(round).join(', ')})`)
  })
  mgr.drawImages(ctx, options)
  return log
}

const ALL_FILTER_EFFECTS = {
  hue: { hueRotate: 30 },
  freqSplit: { hueRotate: 15, glowBlur: 4, glowColor: '#0f0', scale: 1.05 },
  colorStrobe: { hueRotate: 90, saturate: 150 },
  brightness: { brightness: 120 },
  saturation: { saturation: 80 },
  blur: { blur: 2 },
  contrast: { contrast: 110 },
  grayscale: { grayscale: 50 },
  sepia: { sepia: 20 },
  invert: { invert: 10 },
  strobe: { strobeBrightness: 140, strobeOpacity: 0.5 },
  glow: { glowBlur: 10, glowColor: '#f00' },
  beatPulse: { glowBlur: 12, glowColor: '#00f', scale: 1.1 },
  bpmPulse: { glowBlur: 3, glowColor: '#ff0', scale: 1.2 },
}

const ALL_MOTION_EFFECTS = {
  rotation: { rotation: 15 },
  beatFlip: { flipScaleX: 0.01 },
  shake: { shakeX: 3, shakeY: -2 },
  impulseShake: { shakeX: 1, shakeY: 1 },
  bounce: { bounceY: -5 },
  swing: { swingX: 4 },
  orbit: { orbitX: 2, orbitY: 3 },
  figure8: { figure8X: 1, figure8Y: -1 },
  wave: { waveX: 0.5, waveY: 0.25 },
  spiral: { spiralX: -1, spiralY: 2 },
  float: { floatX: 0, floatY: -3 },
  skew: { skewX: 10, skewY: -5 },
  perspective: { perspectiveRotateX: 20, perspectiveRotateY: -30 },
  scale: { scale: 1.3 },
  zoomPunch: { scale: 0.9 },
  vignettePulse: { vignetteStrength: 0.95 },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MultiImageManager.drawImages – Charakterisierung', () => {
  it('ohne Bilder / ohne ctx passiert nichts', () => {
    expect(run({ images: [] })).toEqual([])
    const mgr = new MultiImageManager({ width: 1000, height: 1000 })
    mgr.images.push(baseImage())
    expect(() => mgr.drawImages(null)).not.toThrow()
  })

  it('einfaches Bild ohne Effekte', () => {
    expect(run({ images: [baseImage()] })).toMatchSnapshot()
  })

  it('Layer-Filter behindVisualizer', () => {
    const images = [
      baseImage({ id: 1, fotoSettings: { renderBehindVisualizer: true } }),
      baseImage({ id: 2, relX: 0.5, fotoSettings: { renderBehindVisualizer: false } }),
      baseImage({ id: 3, relX: 0.7 }),
    ]
    expect(run({ images, options: { behindVisualizer: true } })).toMatchSnapshot('behind')
    expect(run({ images, options: { behindVisualizer: false } })).toMatchSnapshot('front')
  })

  it('statische Einstellungen: Legacy-Filter, Rotation, Flip', () => {
    const img = baseImage({
      settings: { brightness: 110, contrast: 90, saturation: 100, blur: 1, opacity: 80 },
      fotoSettings: { rotation: 45, flipH: true, flipV: true },
    })
    expect(run({ images: [img] })).toMatchSnapshot()
  })

  it('FotoManager-Filter haben Vorrang vor Legacy-Filtern', () => {
    const fotoManager = {
      applyFilters: (ctx) => {
        ctx.filter = 'brightness(150%)'
        ctx.globalAlpha = 0.7
      },
    }
    const img = baseImage({
      settings: { brightness: 1, contrast: 1, saturation: 1, blur: 0, opacity: 1 },
      fotoSettings: {},
    })
    expect(
      run({ images: [img], fotoManager, anim: { ...NO_ANIM, opacity: 0.5 } }),
    ).toMatchSnapshot()
  })

  it('Eintritts-Animation (Translate, Scale, Rotation, Opacity)', () => {
    const anim = { translateX: 10, translateY: -20, scale: 0.5, rotation: 30, opacity: 0.25 }
    expect(run({ images: [baseImage()], anim })).toMatchSnapshot()
  })

  it('Slideshow: Clip, Wischen, Blur, Kippen, Übergangs-Transform', () => {
    const img = baseImage({
      slideshow: {
        active: true,
        opacity: 0.6,
        clipRect: { relX: 0, relY: 0.1, relWidth: 0.9, relHeight: 0.8 },
        transitionState: {
          translateX: 0.1,
          translateY: -0.2,
          scale: 1.5,
          rotation: 10,
          wipe: { start: -0.5, end: 0.4 },
          blur: 3.456,
          scaleX: 0.0001,
        },
      },
    })
    expect(run({ images: [img], anim: { ...NO_ANIM, translateX: 5 } })).toMatchSnapshot()
  })

  it('alle audio-reaktiven Filter-Effekte + stärkster Glow', () => {
    const audio = { hasEffects: true, effects: ALL_FILTER_EFFECTS }
    const fotoManager = { applyFilters: (ctx) => (ctx.filter = 'contrast(105%)') }
    expect(run({ images: [baseImage({ fotoSettings: {} })], audio, fotoManager })).toMatchSnapshot()
  })

  it('alle audio-reaktiven Bewegungs-Effekte + Vignette', () => {
    const audio = { hasEffects: true, effects: ALL_MOTION_EFFECTS }
    const anim = { translateX: 7, translateY: 3, scale: 1.1, rotation: -12, opacity: 1 }
    const img = baseImage({ fotoSettings: { rotation: 5, flipH: true } })
    expect(run({ images: [img], audio, anim })).toMatchSnapshot()
  })

  it('Beat-Flip nahe 0 mit negativem Vorzeichen und exakt 0', () => {
    const neg = { hasEffects: true, effects: { beatFlip: { flipScaleX: -0.001 } } }
    const zero = { hasEffects: true, effects: { beatFlip: { flipScaleX: 0 } } }
    expect(run({ images: [baseImage()], audio: neg })).toMatchSnapshot('negativ')
    expect(run({ images: [baseImage()], audio: zero })).toMatchSnapshot('null')
  })

  it('hasEffects=false ignoriert alle Effekte', () => {
    const audio = { hasEffects: false, effects: { ...ALL_FILTER_EFFECTS, ...ALL_MOTION_EFFECTS } }
    expect(run({ images: [baseImage()], audio })).toMatchSnapshot()
  })

  it('Strobe ohne Brightness-Änderung, Vignette unter Schwelle', () => {
    const audio = {
      hasEffects: true,
      effects: {
        strobe: { strobeBrightness: 100, strobeOpacity: 1 },
        vignettePulse: { vignetteStrength: 0.005 },
      },
    }
    expect(run({ images: [baseImage()], audio })).toMatchSnapshot()
  })

  it('chromatische Aberration (ohne Kontur)', () => {
    const audio = { hasEffects: true, effects: { chromatic: { chromaticOffset: 6 } } }
    expect(run({ images: [baseImage()], audio })).toMatchSnapshot()
  })

  it('chromatische Aberration unter Schwelle zeichnet normal', () => {
    const audio = { hasEffects: true, effects: { chromatic: { chromaticOffset: 0.5 } } }
    expect(run({ images: [baseImage()], audio })).toMatchSnapshot()
  })

  it('statische Kontur hat Vorrang vor chromatischer Aberration', () => {
    const audio = { hasEffects: true, effects: { chromatic: { chromaticOffset: 6 } } }
    const img = baseImage({
      fotoSettings: { borderWidth: 4, borderColor: '#123456', borderOpacity: 50 },
    })
    expect(run({ images: [img], audio, anim: { ...NO_ANIM, opacity: 0.8 } })).toMatchSnapshot()
  })

  it('audio-reaktive Kontur erweitert statische Werte', () => {
    const audio = {
      hasEffects: true,
      effects: { border: { borderWidth: 2, borderOpacity: 0.9, borderGlow: 7 } },
    }
    const img = baseImage({ fotoSettings: { borderWidth: 5, borderOpacity: 30 } })
    expect(run({ images: [img], audio })).toMatchSnapshot()
  })

  it('Bild ohne gültige Bounds wird übersprungen, drawImage-Fehler werden abgefangen', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = { ...baseImage({ id: 9 }), type: 'video' }
    const log = run({ images: [bad] })
    expect(log).toEqual([])

    const mgr = new MultiImageManager({ width: 1000, height: 1000 })
    mgr.images.push(baseImage())
    const { ctx } = makeRecordingCtx()
    const throwing = new Proxy(ctx, {
      get(t, p) {
        if (p === 'drawImage') {
          return () => {
            throw new Error('boom')
          }
        }
        return t[p]
      },
    })
    expect(() => mgr.drawImages(throwing)).not.toThrow()
    expect(console.warn).toHaveBeenCalledWith(
      '[MultiImageManager] Image render error:',
      expect.any(Error),
    )
  })
})

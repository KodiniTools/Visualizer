import { describe, it, expect } from 'vitest'
import { reactive, ref, toRaw } from 'vue'
import {
  cloneImageAnimation,
  createImageAnimation,
  getImageAnimationTransform,
  hasImageAnimation,
  restartImageAnimation,
  type ImageAnimationKey,
} from '../../lib/canvasObjects/imageAnimation'
import { MultiImageManager } from '../../lib/multiImageManager'
import { stub } from '../helpers/canvasStubs'

const CANVAS = { width: 1000, height: 500 }
/** Basis-Zeitpunkt (0 gilt in der Text-Zeitleiste als „nicht gestartet“) */
const T = 1_000_000

/** Bild mit einem eingeschalteten Effekt */
function imageWith(key: ImageAnimationKey, overrides: object = {}) {
  const timedAnimation = createImageAnimation()
  Object.assign(timedAnimation[key], { enabled: true, easing: 'linear' }, overrides)
  return { timedAnimation }
}

describe('canvasObjects/imageAnimation', () => {
  it('ohne aktiven Effekt neutral (auch ohne Einstellungen)', () => {
    const neutral = { opacity: 1, translateX: 0, translateY: 0, scale: 1 }
    expect(getImageAnimationTransform(null, CANVAS)).toEqual(neutral)
    expect(getImageAnimationTransform({}, CANVAS)).toEqual(neutral)
    expect(getImageAnimationTransform({ timedAnimation: createImageAnimation() }, CANVAS)).toEqual(
      neutral,
    )
    expect(hasImageAnimation(createImageAnimation())).toBe(false)
  })

  it('Fade-In: Deckkraft steigt über die Dauer, startet beim ersten Zeichnen', () => {
    const img = imageWith('fade', { duration: 1000 })
    expect(getImageAnimationTransform(img, CANVAS, T + 10_000).opacity).toBe(0)
    expect(getImageAnimationTransform(img, CANVAS, T + 10_500).opacity).toBeCloseTo(0.5)
    expect(getImageAnimationTransform(img, CANVAS, T + 11_000).opacity).toBe(1)
    expect(getImageAnimationTransform(img, CANVAS, T + 20_000).opacity).toBe(1)
  })

  it('Start-Verzögerung hält das Bild unsichtbar', () => {
    const img = imageWith('fade', { duration: 1000, startDelay: 500 })
    expect(getImageAnimationTransform(img, CANVAS, T + 0).opacity).toBe(0)
    expect(getImageAnimationTransform(img, CANVAS, T + 400).opacity).toBe(0)
    expect(getImageAnimationTransform(img, CANVAS, T + 1000).opacity).toBeCloseTo(0.5)
  })

  it('Slide von links: Versatz in % der Canvas-Breite, endet bei 0', () => {
    const img = imageWith('slide', { from: 'left', distance: 100, duration: 1000 })
    expect(getImageAnimationTransform(img, CANVAS, T + 0).translateX).toBe(-1000)
    expect(getImageAnimationTransform(img, CANVAS, T + 500).translateX).toBeCloseTo(-500)
    const end = getImageAnimationTransform(img, CANVAS, T + 1000)
    expect(end.translateX).toBe(0)
    expect(end.translateY).toBe(0)
  })

  it('Slide von unten nutzt die Canvas-Höhe', () => {
    const img = imageWith('slide', { from: 'bottom', distance: 50, duration: 1000 })
    expect(getImageAnimationTransform(img, CANVAS, T + 0).translateY).toBe(250)
  })

  it('Scale: von startScale zu endScale', () => {
    const img = imageWith('scale', { startScale: 0.5, endScale: 2, duration: 1000 })
    expect(getImageAnimationTransform(img, CANVAS, T + 0).scale).toBe(0.5)
    expect(getImageAnimationTransform(img, CANVAS, T + 500).scale).toBeCloseTo(1.25)
    expect(getImageAnimationTransform(img, CANVAS, T + 1000).scale).toBe(2)
  })

  it('Anzeigedauer (nicht permanent): Ausgang und danach unsichtbar', () => {
    const img = imageWith('fade', { duration: 1000, permanent: false, displayDuration: 2000 })
    getImageAnimationTransform(img, CANVAS, T + 0)
    expect(getImageAnimationTransform(img, CANVAS, T + 2000).opacity).toBe(1)
    expect(getImageAnimationTransform(img, CANVAS, T + 3500).opacity).toBeCloseTo(0.5)
    expect(getImageAnimationTransform(img, CANVAS, T + 10_000).opacity).toBe(0)
  })

  it('restartImageAnimation beginnt beim nächsten Zeichnen von vorn', () => {
    const img = imageWith('fade', { duration: 1000 })
    getImageAnimationTransform(img, CANVAS, T + 0)
    expect(getImageAnimationTransform(img, CANVAS, T + 5000).opacity).toBe(1)
    restartImageAnimation(img, 'fade')
    expect(getImageAnimationTransform(img, CANVAS, T + 6000).opacity).toBe(0)
    restartImageAnimation(null) // kein Fehler
  })

  it('Neustart greift, wenn Render-Loop (Proxy) und Panel (Rohobjekt) verschieden zugreifen', () => {
    // Manager liegen in Vue-Refs → der Render-Loop zeichnet reaktive Proxys
    const manager = ref({ images: [imageWith('fade', { duration: 1000 })] })
    const drawn = manager.value.images[0]!
    const raw = toRaw(drawn)
    expect(drawn).not.toBe(raw)

    getImageAnimationTransform(drawn, CANVAS, T + 0)
    expect(getImageAnimationTransform(drawn, CANVAS, T + 5000).opacity).toBe(1)
    restartImageAnimation(raw, 'fade')
    expect(getImageAnimationTransform(drawn, CANVAS, T + 6000).opacity).toBe(0)

    // und umgekehrt
    getImageAnimationTransform(raw, CANVAS, T + 7000)
    expect(getImageAnimationTransform(raw, CANVAS, T + 9000).opacity).toBe(1)
    restartImageAnimation(reactive(raw), 'fade')
    expect(getImageAnimationTransform(raw, CANVAS, T + 9500).opacity).toBe(0)
  })

  it('cloneImageAnimation ergänzt Standardwerte und kopiert tief', () => {
    const src = { fade: { enabled: true, duration: 300 } }
    const copy = cloneImageAnimation(src)
    expect(copy.fade).toMatchObject({ enabled: true, duration: 300, direction: 'in' })
    expect(copy.slide).toMatchObject({ enabled: false, from: 'left', distance: 100 })
    copy.fade.duration = 1
    expect(src.fade.duration).toBe(300)
    expect(cloneImageAnimation('kaputt')).toEqual(createImageAnimation())
  })
})

describe('MultiImageManager + Bild-Animationen', () => {
  function makeManager() {
    const canvas = { width: 1000, height: 500 }
    return new MultiImageManager(stub(canvas), { redrawCallback: () => {} })
  }
  const IMG = stub<HTMLImageElement>({ width: 100, height: 100 })

  it('addImage/addImageWithBounds übernehmen eine Kopie der Animationen', () => {
    const mgr = makeManager()
    const cfg = createImageAnimation()
    cfg.slide.enabled = true
    const a = mgr.addImage(IMG, { timedAnimation: cfg })
    const b = mgr.addImageWithBounds(
      IMG,
      { relX: 0, relY: 0, relWidth: 0.2, relHeight: 0.2 },
      'none',
      { timedAnimation: cfg },
    )
    expect(a!.timedAnimation!.slide.enabled).toBe(true)
    expect(b!.timedAnimation).not.toBe(cfg)
    expect(b!.timedAnimation).not.toBe(a!.timedAnimation)
  })

  it('ohne aktiven Effekt kein timedAnimation am Bild (Verhalten wie bisher)', () => {
    const mgr = makeManager()
    expect(mgr.addImage(IMG, { timedAnimation: createImageAnimation() })!.timedAnimation).toBe(
      undefined,
    )
    expect(mgr.addImage(IMG)!.timedAnimation).toBe(undefined)
  })

  it('getAnimationTransform verbindet Einblend-Effekt und Bild-Animation', () => {
    const mgr = makeManager()
    const img = mgr.addImage(IMG, {
      timedAnimation: imageWith('slide', { from: 'top' }).timedAnimation,
    })
    const t = mgr.getAnimationTransform(img!)
    expect(t.translateY).toBe(-500)
    expect(t.rotation).toBe(0)
    expect(t.opacity).toBe(1)
  })
})

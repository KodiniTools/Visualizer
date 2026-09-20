import { describe, it, expect } from 'vitest'
import { applyEasing } from '../../lib/textManager/animation/easing.js'
import { ensureAnimationState } from '../../lib/textManager/animation/state.js'
import { resolveTimeline } from '../../lib/textManager/animation/timeline.js'
import { getFadeOpacity, restartFade } from '../../lib/textManager/animation/fade.js'
import { getScaleValue, restartScale } from '../../lib/textManager/animation/scale.js'
import { getSlideOffset, restartSlide } from '../../lib/textManager/animation/slide.js'
import { getTypewriterText, restartTypewriter } from '../../lib/textManager/animation/typewriter.js'
import { easeIn as audioEaseIn, easeOut as audioEaseOut } from '../../lib/audio/EasingFunctions.js'

/**
 * Tests für die gemeinsamen Animations-Bausteine
 * (siehe docs/REFACTORING-textManager.md, Schritte 3–4).
 */

describe('applyEasing', () => {
  it('ist an den Rändern für jede Kurve 0 bzw. 1', () => {
    for (const kurve of ['linear', 'easeIn', 'easeOut', 'ease', undefined]) {
      expect(applyEasing(0, kurve)).toBe(0)
      expect(applyEasing(1, kurve)).toBe(1)
    }
  })

  it('bildet linear unverändert ab', () => {
    expect(applyEasing(0.25, 'linear')).toBe(0.25)
    expect(applyEasing(0.75, 'linear')).toBe(0.75)
  })

  it('verwendet QUADRATISCHE Kurven – nicht die kubischen aus audio/EasingFunctions', () => {
    // Dieser Test ist Absicht: ein "Aufräumen" per Import aus audio/EasingFunctions.js
    // würde jede bestehende Text-Animation sichtbar verändern.
    expect(applyEasing(0.5, 'easeIn')).toBeCloseTo(0.25, 10) // t² statt t³
    expect(applyEasing(0.5, 'easeOut')).toBeCloseTo(0.75, 10)

    expect(audioEaseIn(0.5)).toBeCloseTo(0.125, 10)
    expect(audioEaseOut(0.5)).toBeCloseTo(0.875, 10)
    expect(applyEasing(0.5, 'easeIn')).not.toBeCloseTo(audioEaseIn(0.5), 3)
  })

  it('nutzt für "ease" und unbekannte Namen Ease-In-Out', () => {
    expect(applyEasing(0.5, 'ease')).toBeCloseTo(0.5, 10)
    expect(applyEasing(0.25, 'ease')).toBeCloseTo(0.125, 10)
    expect(applyEasing(0.75, 'ease')).toBeCloseTo(0.875, 10)
    expect(applyEasing(0.25, 'unbekannt')).toBe(applyEasing(0.25, 'ease'))
  })

  it('ist monoton steigend', () => {
    for (const kurve of ['linear', 'easeIn', 'easeOut', 'ease']) {
      let vorher = -Infinity
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const wert = applyEasing(t, kurve)
        expect(wert).toBeGreaterThanOrEqual(vorher)
        vorher = wert
      }
    }
  })
})

describe('ensureAnimationState', () => {
  it('legt einen fehlenden Zustand an', () => {
    const animation = {}
    const state = ensureAnimationState(animation)
    expect(state).toEqual({ startTime: null, isPlaying: false, currentIndex: 0 })
    expect(animation._state).toBe(state)
  })

  it('lässt einen vorhandenen Zustand unangetastet', () => {
    const vorhanden = { startTime: 42, isPlaying: true, currentIndex: 7, fadeStartTime: 99 }
    const animation = { _state: vorhanden }
    expect(ensureAnimationState(animation)).toBe(vorhanden)
    expect(animation._state).toEqual(vorhanden)
  })
})

describe('resolveTimeline', () => {
  const T0 = 1_700_000_000_000

  /** Minimale Animations-Hülle mit einer Konfiguration unter `key`. */
  function anim(cfg) {
    return { _state: { startTime: null, isPlaying: false, currentIndex: 0 }, cfg }
  }

  /** Fortschritt zum Zeitpunkt T0 + ms. */
  function p(animation, cfg, ms) {
    return resolveTimeline(animation, cfg, 'testStartTime', T0 + ms)
  }

  it('startet erst beim ERSTEN Aufruf, nicht beim Aktivieren', () => {
    const animation = {}
    const cfg = { direction: 'in', duration: 1000, easing: 'linear' }

    // Quirk: wird die Animation erst nach 300ms zum ersten Mal abgefragt,
    // beginnt sie dort – nicht rueckwirkend.
    expect(resolveTimeline(animation, cfg, 'testStartTime', T0 + 300)).toEqual({
      p: 0,
      isComplete: false,
    })
    expect(animation._state.testStartTime).toBe(T0 + 300)
  })

  it('legt den Zustand an und merkt sich den Startzeitpunkt', () => {
    const animation = {}
    const cfg = { direction: 'in', duration: 1000, easing: 'linear' }

    resolveTimeline(animation, cfg, 'testStartTime', T0)
    expect(animation._state.testStartTime).toBe(T0)

    // Der Startzeitpunkt bleibt über Frames hinweg stehen
    resolveTimeline(animation, cfg, 'testStartTime', T0 + 500)
    expect(animation._state.testStartTime).toBe(T0)
  })

  it('hält während der Start-Verzögerung den Ausgangswert', () => {
    const ein = { direction: 'in', duration: 1000, startDelay: 300, easing: 'linear' }
    const aus = { direction: 'out', duration: 1000, startDelay: 300, easing: 'linear' }

    expect(p(anim(), ein, 0)).toEqual({ p: 0, isComplete: false })
    expect(p(anim(), aus, 0)).toEqual({ p: 1, isComplete: false })
  })

  it('läuft bei "in" ohne Halte-Phase von 0 nach 1', () => {
    const a = anim()
    const cfg = { direction: 'in', duration: 1000, easing: 'linear' }

    expect(p(a, cfg, 0).p).toBe(0)
    expect(p(a, cfg, 250).p).toBeCloseTo(0.25, 10)
    expect(p(a, cfg, 1000)).toEqual({ p: 1, isComplete: true })
  })

  it('hält bei "in" mit Anzeigedauer und läuft dann zurück auf 0', () => {
    const a = anim()
    const cfg = {
      direction: 'in',
      duration: 1000,
      easing: 'linear',
      permanent: false,
      displayDuration: 2000,
    }

    p(a, cfg, 0) // startet die Timeline bei T0
    expect(p(a, cfg, 500).p).toBeCloseTo(0.5, 10)
    expect(p(a, cfg, 1500)).toEqual({ p: 1, isComplete: false }) // Halte-Phase
    expect(p(a, cfg, 3500).p).toBeCloseTo(0.5, 10) // Ausgang
    expect(p(a, cfg, 4000)).toEqual({ p: 0, isComplete: true })
  })

  it('hält bei "out" zuerst und läuft dann von 1 nach 0', () => {
    const a = anim()
    const cfg = {
      direction: 'out',
      duration: 1000,
      easing: 'linear',
      permanent: false,
      displayDuration: 1000,
    }

    p(a, cfg, 0) // startet die Timeline bei T0
    expect(p(a, cfg, 500)).toEqual({ p: 1, isComplete: false })
    expect(p(a, cfg, 1500).p).toBeCloseTo(0.5, 10)
    expect(p(a, cfg, 2000)).toEqual({ p: 0, isComplete: true })
  })

  it('durchläuft bei "inOut" auch ohne Anzeigedauer beide Phasen', () => {
    const a = anim()
    const cfg = { direction: 'inOut', duration: 1000, easing: 'linear' }

    p(a, cfg, 0) // startet die Timeline bei T0
    expect(p(a, cfg, 500).p).toBeCloseTo(0.5, 10)
    expect(p(a, cfg, 1000)).toEqual({ p: 1, isComplete: false }) // Ausgang startet bei 1
    expect(p(a, cfg, 1500).p).toBeCloseTo(0.5, 10)
    expect(p(a, cfg, 2000)).toEqual({ p: 0, isComplete: true })
  })

  it('startet nach loopDelay neu und verschiebt den Startzeitpunkt', () => {
    const a = anim()
    const cfg = { direction: 'in', duration: 1000, easing: 'linear', loop: true, loopDelay: 500 }

    p(a, cfg, 0) // startet die Timeline bei T0
    expect(p(a, cfg, 1000)).toEqual({ p: 1, isComplete: true })
    expect(p(a, cfg, 1499)).toEqual({ p: 1, isComplete: true })
    expect(p(a, cfg, 1500)).toEqual({ p: 0, isComplete: false })
    expect(a._state.testStartTime).toBe(T0 + 1500)
    expect(p(a, cfg, 2000).p).toBeCloseTo(0.5, 10)
  })

  it('wiederholt bei loopDelay 0 nahtlos', () => {
    // Der Slider laesst 0 zu ("keine Pause"); ein `||`-Fallback wuerde daraus
    // die Default-Pause von 1000ms machen.
    const a = anim()
    const cfg = { direction: 'in', duration: 1000, easing: 'linear', loop: true, loopDelay: 0 }

    p(a, cfg, 0)
    // Direkt am Ende des Durchlaufs beginnt der naechste
    expect(p(a, cfg, 1000)).toEqual({ p: 0, isComplete: false })
    expect(a._state.testStartTime).toBe(T0 + 1000)
    expect(p(a, cfg, 1500).p).toBeCloseTo(0.5, 10)
  })

  it('nutzt ohne loopDelay weiterhin die Default-Pause von 1000ms', () => {
    const a = anim()
    const cfg = { direction: 'in', duration: 1000, easing: 'linear', loop: true }

    p(a, cfg, 0)
    expect(p(a, cfg, 1000)).toEqual({ p: 1, isComplete: true })
    expect(p(a, cfg, 1999)).toEqual({ p: 1, isComplete: true })
    expect(p(a, cfg, 2000)).toEqual({ p: 0, isComplete: false })
  })

  it('liefert für unbekannte Richtungen den Endwert', () => {
    expect(p(anim(), { direction: 'unbekannt', duration: 1000 }, 100)).toEqual({
      p: 1,
      isComplete: false,
    })
  })
})

describe('Abbildung des Fortschritts auf die Animationswerte', () => {
  const T0 = 1_700_000_000_000

  /** Text-Objekt mit derselben Konfiguration für alle drei Animationen. */
  function textObj(cfg) {
    return {
      animation: {
        _state: { startTime: null, isPlaying: false, currentIndex: 0 },
        fade: { enabled: true, ...cfg },
        scale: { enabled: true, startScale: 0, endScale: 2, ...cfg },
        slide: { enabled: true, from: 'left', distance: 100, ...cfg },
      },
    }
  }

  // Der Vertrag aus docs/REFACTORING-textManager.md: Fade, Scale und Slide
  // sind dieselbe Timeline mit unterschiedlicher Wertabbildung.
  it.each([0, 250, 500, 750, 1000, 1500, 2000])(
    'Fade, Scale und Slide bilden bei t = %ims denselben Fortschritt ab',
    (ms) => {
      const cfg = { direction: 'inOut', duration: 1000, easing: 'ease' }
      const now = T0 + ms

      // Referenz-Fortschritt auf einem eigenen Objekt, damit der Zustand
      // der drei Animationen unberührt bleibt
      const { p } = resolveTimeline({}, cfg, 'refStartTime', now)

      expect(getFadeOpacity(textObj(cfg), now).opacity).toBeCloseTo(p, 10)
      expect(getScaleValue(textObj(cfg), now).scale).toBeCloseTo(0 + (2 - 0) * p, 10)
      expect(getSlideOffset(textObj(cfg), 800, 600, now).offsetX).toBeCloseTo(-800 * (1 - p), 10)
    },
  )

  it('liefert bei deaktivierter Animation neutrale Werte', () => {
    const aus = { animation: { _state: {}, fade: {}, scale: {}, slide: {} } }
    expect(getFadeOpacity(aus)).toEqual({ opacity: 1, isComplete: true })
    expect(getScaleValue(aus)).toEqual({ scale: 1, isComplete: true })
    expect(getSlideOffset(aus, 800, 600)).toEqual({ offsetX: 0, offsetY: 0, isComplete: true })
  })

  it('verschiebt Slide je nach Kante und Distanz', () => {
    const now = T0
    const kante = (from, distance = 100) =>
      getSlideOffset(textObj({ direction: 'in', from, distance }), 800, 600, now)

    expect(kante('left')).toMatchObject({ offsetX: -800, offsetY: 0 })
    expect(kante('right')).toMatchObject({ offsetX: 800, offsetY: 0 })
    expect(kante('top')).toMatchObject({ offsetX: 0, offsetY: -600 })
    expect(kante('bottom')).toMatchObject({ offsetX: 0, offsetY: 600 })
    expect(kante('right', 50)).toMatchObject({ offsetX: 400 })
  })
})

describe('Typewriter-Loop', () => {
  const T0 = 1_700_000_000_000

  function getippt(overrides = {}) {
    return {
      content: 'ABC',
      animation: {
        _state: { startTime: null, isPlaying: false, currentIndex: 0 },
        typewriter: { enabled: true, speed: 100, loop: true, ...overrides },
      },
    }
  }

  it('wiederholt bei loopDelay 0 nahtlos', () => {
    const t = getippt({ loopDelay: 0 })

    getTypewriterText(t, T0)
    // Nach 3 Zeichen * 100ms beginnt sofort der naechste Durchlauf
    expect(getTypewriterText(t, T0 + 300)).toMatchObject({ text: '', isComplete: false })
    expect(getTypewriterText(t, T0 + 400).text).toBe('AB')
  })

  it('nutzt ohne loopDelay weiterhin die Default-Pause von 1000ms', () => {
    const t = getippt()

    getTypewriterText(t, T0)
    expect(getTypewriterText(t, T0 + 300)).toMatchObject({ text: 'ABC', isComplete: true })
    expect(getTypewriterText(t, T0 + 1299).text).toBe('ABC')
    expect(getTypewriterText(t, T0 + 1300)).toMatchObject({ text: '', isComplete: false })
  })
})

describe('Robustheit gegen fehlenden _state', () => {
  const T0 = 1_700_000_000_000

  /**
   * Text-Objekt mit aktivierter Animation, aber OHNE `animation._state` –
   * so, wie es aus einer Quelle kommen kann, die `animation` selbst
   * zusammenbaut (Preset, Handoff, manuell gesetzte Konfiguration).
   */
  function ohneState(name, cfg = {}) {
    return {
      content: 'Hallo',
      animation: {
        type: name,
        [name]: { enabled: true, duration: 1000, easing: 'linear', ...cfg },
      },
    }
  }

  it('legt den Zustand beim Typewriter an, statt zu werfen', () => {
    const t = ohneState('typewriter', { speed: 100 })

    expect(() => getTypewriterText(t, T0)).not.toThrow()
    expect(getTypewriterText(t, T0).text).toBe('H')
    expect(t.animation._state).toMatchObject({ isPlaying: true, currentIndex: 0 })
  })

  it('legt den Zustand bei Fade, Scale und Slide an', () => {
    const fade = ohneState('fade', { direction: 'in' })
    const scale = ohneState('scale', { direction: 'in', startScale: 0, endScale: 2 })
    const slide = ohneState('slide', { direction: 'in', from: 'left', distance: 100 })

    expect(getFadeOpacity(fade, T0)).toEqual({ opacity: 0, isComplete: false })
    expect(getScaleValue(scale, T0)).toEqual({ scale: 0, isComplete: false })
    expect(getSlideOffset(slide, 800, 600, T0)).toEqual({
      offsetX: -800,
      offsetY: 0,
      isComplete: false,
    })
  })

  it('lässt alle vier restart-Funktionen ohne Zustand durchlaufen', () => {
    for (const [name, restart] of [
      ['typewriter', restartTypewriter],
      ['fade', restartFade],
      ['scale', restartScale],
      ['slide', restartSlide],
    ]) {
      const t = ohneState(name)
      expect(() => restart(t)).not.toThrow()
      expect(t.animation._state).toBeDefined()
    }
  })

  it('ignoriert weiterhin Objekte ganz ohne Animation', () => {
    for (const restart of [restartTypewriter, restartFade, restartScale, restartSlide]) {
      expect(() => restart(null)).not.toThrow()
      expect(() => restart({})).not.toThrow()
      expect(() => restart({ animation: null })).not.toThrow()
    }
  })

  it('setzt einen vorhandenen Zustand nicht zurück', () => {
    // Die restart-Funktionen leeren nur ihre eigenen Felder, nicht den Rest
    const t = ohneState('fade', { direction: 'in' })
    getFadeOpacity(t, T0)
    t.animation._state.scaleStartTime = 4711
    t.animation._state.currentIndex = 7

    restartFade(t)
    expect(t.animation._state.fadeStartTime).toBeNull()
    expect(t.animation._state.scaleStartTime).toBe(4711)
    expect(t.animation._state.currentIndex).toBe(7)
  })
})

import { describe, it, expect } from 'vitest'
import {
  animationDisplaySeconds,
  imageDisplaySeconds,
  shapeDisplaySeconds,
  summarizeMarkerDuration,
  textDisplaySeconds,
  timedEffectEndMs,
  videoDisplaySeconds,
} from '../../lib/markerDuration'
import { createImageAnimation } from '../../lib/canvasObjects/imageAnimation'

describe('markerDuration', () => {
  it('Effekt-Ende: Verzögerung + Ein + Anzeige + Aus; „Aus“ ohne Eingang', () => {
    const base = { enabled: true, permanent: false, duration: 1000, displayDuration: 3000 }
    expect(timedEffectEndMs({ ...base, direction: 'inOut', startDelay: 500 })).toBe(5500)
    expect(timedEffectEndMs({ ...base, direction: 'in' })).toBe(5000)
    expect(timedEffectEndMs({ ...base, direction: 'out' })).toBe(4000)
    // Defaults wie in timeline.ts (1 s Dauer, 5 s Anzeige)
    expect(timedEffectEndMs({ enabled: true, permanent: false })).toBe(7000)
  })

  it('permanente, geloopte und inaktive Effekte begrenzen nichts', () => {
    const timed = { enabled: true, permanent: false, duration: 1000, displayDuration: 2000 }
    expect(animationDisplaySeconds([{ ...timed, permanent: true }])).toBeNull()
    expect(animationDisplaySeconds([{ ...timed, loop: true }])).toBeNull()
    expect(animationDisplaySeconds([{ ...timed, enabled: false }])).toBeNull()
    expect(animationDisplaySeconds([undefined, null])).toBeNull()
    // Ein begrenzter Effekt reicht, der längste zählt
    expect(
      animationDisplaySeconds([
        { ...timed, permanent: true },
        timed,
        { ...timed, displayDuration: 6000 },
      ]),
    ).toBe(8)
  })

  it('Text: Schreibmaschine zählt Tippen + Anzeigedauer', () => {
    const seconds = textDisplaySeconds({
      content: 'Hallo',
      animation: {
        typewriter: {
          enabled: true,
          permanent: false,
          speed: 100,
          displayDuration: 2000,
          startDelay: 1000,
        },
      },
    })
    expect(seconds).toBe(3.5)
    expect(textDisplaySeconds({ content: 'x', animation: null })).toBeNull()
    expect(textDisplaySeconds(null)).toBeNull()
  })

  it('Bild: Fade/Scale/Slide aus timedAnimation', () => {
    const anim = createImageAnimation()
    expect(imageDisplaySeconds(anim)).toBeNull()
    Object.assign(anim.slide, {
      enabled: true,
      permanent: false,
      duration: 500,
      displayDuration: 4000,
      direction: 'inOut',
    })
    expect(imageDisplaySeconds(anim)).toBe(5)
    expect(imageDisplaySeconds(null)).toBeNull()
  })

  it('Form: nur „Ausblenden“ endet (Verzögerung + Dauer, in Sekunden)', () => {
    expect(shapeDisplaySeconds({ type: 'fadeOut', duration: 2, delay: 1.5 })).toBe(3.5)
    expect(shapeDisplaySeconds({ type: 'pulse', duration: 1 })).toBeNull()
    expect(shapeDisplaySeconds(null)).toBeNull()
  })

  it('Video: einmal = Videolänge, Schleife oder unbekannte Länge = dauerhaft', () => {
    expect(videoDisplaySeconds(false, 12.5)).toBe(12.5)
    expect(videoDisplaySeconds(true, 12.5)).toBeNull()
    expect(videoDisplaySeconds(false, undefined)).toBeNull()
    expect(videoDisplaySeconds(false, NaN)).toBeNull()
  })

  it('Zusammenfassung: längstes begrenztes Element + dauerhafte Elemente', () => {
    expect(summarizeMarkerDuration([])).toEqual({ seconds: null, hasPermanent: false, count: 0 })
    expect(
      summarizeMarkerDuration([
        { kind: 'text', seconds: 4 },
        { kind: 'image', seconds: 9.25 },
        { kind: 'shape', seconds: null },
      ]),
    ).toEqual({ seconds: 9.25, hasPermanent: true, count: 3 })
  })
})

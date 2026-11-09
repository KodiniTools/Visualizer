import { describe, it, expect } from 'vitest'
import { resolveTimeline, timelineStartForElapsed } from '../../lib/textManager/animation/timeline'
import { seekTextAnimation } from '../../lib/textManager/animation/seek'
import { getTypewriterText } from '../../lib/textManager/animation/typewriter'
import {
  seekImageAnimation,
  createImageAnimation,
  getImageAnimationTransform,
} from '../../lib/canvasObjects/imageAnimation'
import type { TextAnimation, TextObject, TimedTextAnimation } from '../../lib/textManager/types'

const NOW = 1_000_000

const cfg = (extra: Partial<TimedTextAnimation> = {}): TimedTextAnimation => ({
  enabled: true,
  direction: 'in',
  duration: 1000,
  easing: 'linear',
  ...extra,
})

describe('timelineStartForElapsed', () => {
  it('setzt den Start so, dass die Animation seit elapsed läuft', () => {
    expect(timelineStartForElapsed(cfg(), 400, NOW)).toBe(NOW - 400)
    const anim: TextAnimation = { _state: { startTime: null, isPlaying: false, currentIndex: 0 } }
    anim._state!.fadeStartTime = timelineStartForElapsed(cfg(), 400, NOW)
    expect(resolveTimeline(anim, cfg(), 'fadeStartTime', NOW).p).toBeCloseTo(0.4)
  })

  it('berücksichtigt die Start-Verzögerung', () => {
    expect(timelineStartForElapsed(cfg({ startDelay: 300 }), 100, NOW)).toBe(NOW + 200)
  })

  it('rechnet bei Loop auf den laufenden Durchlauf um', () => {
    // inOut: 1000 + 1000, Pause 500 → Periode 2500
    const loop = cfg({ direction: 'inOut', loop: true, loopDelay: 500 })
    expect(timelineStartForElapsed(loop, 2500 * 3 + 250, NOW)).toBe(NOW - 250)
  })

  it('negative Laufzeit zählt als 0', () => {
    expect(timelineStartForElapsed(cfg(), -50, NOW)).toBe(NOW)
  })
})

describe('seekTextAnimation', () => {
  it('setzt nur aktive Effekte und lässt inaktive unberührt', () => {
    const text = {
      content: 'Hallo',
      animation: {
        fade: cfg(),
        scale: { ...cfg(), enabled: false },
        _state: { startTime: null, isPlaying: false, currentIndex: 0, scaleStartTime: 7 },
      },
    } as unknown as TextObject
    seekTextAnimation(text, 600, NOW)
    expect(text.animation!._state!.fadeStartTime).toBe(NOW - 600)
    expect(text.animation!._state!.scaleStartTime).toBe(7)
  })

  it('Schreibmaschine zeigt die bis dahin getippten Zeichen', () => {
    const text = {
      content: 'Snovi moji',
      animation: { typewriter: { ...cfg(), speed: 100 } },
    } as unknown as TextObject
    seekTextAnimation(text, 450, NOW)
    expect(getTypewriterText(text, NOW).text).toBe('Snovi')
  })

  it('ohne Text oder Animation passiert nichts', () => {
    expect(() => seekTextAnimation(null, 100, NOW)).not.toThrow()
    expect(() => seekTextAnimation({ content: 'x' } as TextObject, 100, NOW)).not.toThrow()
  })
})

describe('seekImageAnimation', () => {
  it('setzt die Bild-Animation auf die Laufzeit', () => {
    const anim = createImageAnimation()
    Object.assign(anim.fade, cfg())
    const img = { timedAnimation: anim }
    seekImageAnimation(img, 250, NOW)
    expect(getImageAnimationTransform(img, { width: 10, height: 10 }, NOW).opacity).toBeCloseTo(
      0.25,
    )
  })

  it('Bild ohne aktive Animation bleibt neutral', () => {
    const img = { timedAnimation: createImageAnimation() }
    seekImageAnimation(img, 250, NOW)
    expect(getImageAnimationTransform(img, { width: 10, height: 10 }, NOW).opacity).toBe(1)
  })
})

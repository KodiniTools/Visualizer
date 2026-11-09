import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  DISPLAY_DURATION_MAX_MS,
  DISPLAY_DURATION_MAX_S,
  DISPLAY_DURATION_MIN_MS,
  clampDisplayDuration,
} from '../../lib/displayDuration'
import { SHAPE_ANIMATION_LIMITS, normalizeShapeAnimation } from '../../lib/shapes/shapeAnimation'
import { normalizeSlideshowPreset } from '../../stores/slideshowPresetStore'
import AnimationDisplayControls from '../../components/text-manager/text-animations/AnimationDisplayControls.vue'
import TextDirectoryPanel from '../../components/text-manager/TextDirectoryPanel.vue'
import SlideshowTimingSettings from '../../components/foto-panel/slideshow/SlideshowTimingSettings.vue'
import type { TimedTextAnimation } from '../../lib/textManager/types'

describe('Anzeigedauer – gemeinsame Obergrenze 120 000 ms', () => {
  it('Grenzwerte und Begrenzung', () => {
    expect(DISPLAY_DURATION_MIN_MS).toBe(500)
    expect(DISPLAY_DURATION_MAX_MS).toBe(120000)
    expect(DISPLAY_DURATION_MAX_S).toBe(120)
    expect(clampDisplayDuration(90000)).toBe(90000)
    expect(clampDisplayDuration(999999)).toBe(120000)
    expect(clampDisplayDuration(10)).toBe(500)
  })

  it('Formen: Verzögerung vor einmaliger Animation bis 120 s', () => {
    expect(SHAPE_ANIMATION_LIMITS.delay.max).toBe(120)
    expect(normalizeShapeAnimation({ type: 'fadeOut', delay: 90 })!.delay).toBe(90)
    expect(normalizeShapeAnimation({ type: 'fadeOut', delay: 500 })!.delay).toBe(120)
  })

  it('Text/Bild-Animation: Regler und Zahlenfeld erlauben 120 000 ms', async () => {
    const effect: TimedTextAnimation = { enabled: true, permanent: false, displayDuration: 90000 }
    const w = mount(AnimationDisplayControls, { props: { effect } })
    const range = w.get('input[type="range"]')
    const num = w.get('input[type="number"]')
    expect(range.attributes('max')).toBe('120000')
    expect(num.attributes('max')).toBe('120000')
    expect((range.element as HTMLInputElement).value).toBe('90000')
    await num.setValue('150000')
    // Zahlenfeld begrenzt Eingaben oberhalb der Grenze auf 120 000 ms
    expect(effect.displayDuration).toBe(120000)
  })

  it('Text-Liste: globale Dauer bis 120 000 ms', () => {
    const w = mount(TextDirectoryPanel, {
      props: {
        items: [{ id: 1, number: 1, content: 'Text', animated: false, offCanvas: false }],
        globalDurationEnabled: true,
        globalDuration: 60000,
      },
    })
    expect(w.get('input[type="range"]').attributes('max')).toBe('120000')
  })

  it('Slideshow: Anzeigedauer-Regler und Preset-Validierung bis 120 000 ms', () => {
    const w = mount(SlideshowTimingSettings)
    const maxes = w.findAll('input[type="range"]').map((r) => r.attributes('max'))
    expect(maxes).toContain('120000')
    expect(maxes).not.toContain('30000')

    const preset = normalizeSlideshowPreset({
      settings: { displayDuration: 100000 },
      slots: [{ displayDuration: 999999 }],
    })
    expect(preset!.settings.displayDuration).toBe(100000)
    expect(preset!.slots[0]!.displayDuration).toBe(120000)
  })
})

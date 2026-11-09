// Animations-Panels (Text und Bild) melden Bearbeitungen an die Beat-Marker
// – Regler-Änderungen starten den Effekt NICHT neu (kein Warten beim Bearbeiten).
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'
import TextAnimationsPanel from '../../components/text-manager/TextAnimationsPanel.vue'
import FadeControls from '../../components/text-manager/text-animations/FadeControls.vue'
import ImageAnimationControls from '../../components/foto-panel/image-animation/ImageAnimationControls.vue'
import { defaultTextSettings } from '../../lib/textDefaults'
import {
  createImageAnimation,
  getImageAnimationTransform,
} from '../../lib/canvasObjects/imageAnimation'
import { onMarkerTargetEdited, type MarkerTargetEdit } from '../../lib/markerTargetEdits'
import type { TextObject } from '../../lib/textManager/types'

let wrapper: VueWrapper | null = null
let edits: MarkerTargetEdit[]
let off: () => void

beforeEach(() => {
  edits = []
  off = onMarkerTargetEdited((e) => edits.push(e))
  vi.useFakeTimers()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  off()
  vi.useRealTimers()
})

function fadeText(): TextObject {
  const base = defaultTextSettings()
  return reactive({
    id: 7,
    content: 'Snovi moji',
    animation: {
      typewriter: { ...base.typewriter },
      fade: { ...base.fade, enabled: true },
      scale: { ...base.scale },
      slide: { ...base.slide },
      _state: { startTime: 1, fadeStartTime: 123, fadePhase: 'in' },
    },
  }) as unknown as TextObject
}

describe('TextAnimationsPanel → Beat-Marker', () => {
  function mountPanel(selectedText: TextObject) {
    return mount(TextAnimationsPanel, {
      props: { selectedText },
      global: { provide: { canvasManager: ref({ redrawCallback: () => {} }) } },
    })
  }

  it('Regler-Änderung meldet den Text, ohne den Effekt neu zu starten', async () => {
    const text = fadeText()
    wrapper = mountPanel(text)
    const fade = wrapper.findAllComponents(FadeControls)[0]!
    fade.vm.$emit('change')
    fade.vm.$emit('change')
    expect(edits).toEqual([
      { kind: 'text', id: 7 },
      { kind: 'text', id: 7 },
    ])
    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(text.animation!._state!.fadeStartTime).toBe(123)
  })
})

describe('ImageAnimationControls → Beat-Marker', () => {
  it('Hintergrund-Bild meldet sich als Hintergrund-Objekt, Canvas-Bild per ID', async () => {
    const timedAnimation = createImageAnimation()
    timedAnimation.fade.enabled = true
    const bg = reactive({ id: 'bg', type: 'background', timedAnimation })
    wrapper = mount(ImageAnimationControls, { props: { image: bg } })
    await wrapper.find('[data-effect="fade"]').findAll('button')[1]!.trigger('click')
    expect(edits.at(-1)).toMatchObject({ kind: 'background' })

    wrapper.unmount()
    wrapper = mount(ImageAnimationControls, {
      props: { image: reactive({ id: 3, type: 'image', timedAnimation: createImageAnimation() }) },
    })
    await wrapper.find('[data-effect="slide"] button').trigger('click')
    expect(edits.at(-1)).toEqual({ kind: 'image', id: 3 })
  })

  it('Regler-Änderung meldet das Bild, ohne den Effekt neu zu starten', () => {
    const timedAnimation = createImageAnimation()
    Object.assign(timedAnimation.fade, { enabled: true, easing: 'linear', duration: 1000 })
    const image = reactive({ id: 4, type: 'image', timedAnimation })
    const t0 = Date.now()
    getImageAnimationTransform(image, { width: 10, height: 10 }, t0)

    wrapper = mount(ImageAnimationControls, { props: { image } })
    wrapper.findAllComponents(FadeControls)[0]!.vm.$emit('change')
    expect(edits).toEqual([{ kind: 'image', id: 4 }])
    vi.advanceTimersByTime(2000)
    // Effekt lief weiter durch, statt von vorn zu beginnen
    expect(getImageAnimationTransform(image, { width: 10, height: 10 }, t0 + 6000).opacity).toBe(1)
  })
})

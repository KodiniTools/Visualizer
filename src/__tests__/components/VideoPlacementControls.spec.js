// @vitest-environment jsdom
// Charakterisierung der Video-Platzierung (Effekt, Dauer, Größe, Wiederholen,
// Stumm, Platzieren). Zugriff über sichtbare Texte, Labels und Optionswerte
// statt CSS-Klassen, damit die Tests den Umbau unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import VideoPlacementControls from '../../components/video-panel/VideoPlacementControls.vue'
import SliderField from '../../components/ui/SliderField.vue'
import { setLocale } from '../../lib/i18n'
import de from '../../lib/i18n/de.js'

let wrapper
let vp

const ANIMATIONS = [
  'none',
  'fade',
  'slideLeft',
  'slideRight',
  'slideUp',
  'slideDown',
  'zoom',
  'bounce',
  'spin',
  'elastic',
]

async function mountControls({ selected = 0, locale = 'de' } = {}) {
  await setLocale(locale)
  vp = {
    locale: ref(locale),
    selectedVideoIndex: ref(selected),
    selectedAnimation: ref('none'),
    animationDuration: ref(500),
    videoScale: ref(3),
    videoLoop: ref(true),
    videoMuted: ref(false),
    addVideoDirectly: vi.fn(),
  }
  wrapper = mount(VideoPlacementControls, {
    attachTo: document.body,
    global: { provide: { videoPanel: vp } },
  })
  await flushPromises()
}

const body = () => document.body
const text = () => body().textContent.replace(/\s+/g, ' ')
const sliders = () => wrapper.findAllComponents(SliderField)

async function clickLabel(name) {
  const label = [...body().querySelectorAll('label')].find((l) => l.textContent.trim() === name)
  expect(label, `Label „${name}“`).toBeTruthy()
  label.click()
  await flushPromises()
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  await setLocale('de')
})

describe('Video-Platzierung', () => {
  it('ohne gewähltes Video unsichtbar', async () => {
    await mountControls({ selected: null })
    expect(text().trim()).toBe('')
  })

  it('Effekt-Auswahl mit allen Animationen; Dauer erscheint erst mit Effekt', async () => {
    await mountControls()
    expect(text()).toContain('Platzierung')
    expect(text()).toContain('Effekt')
    const select = body().querySelector('select')
    expect([...select.options].map((o) => o.value)).toEqual(ANIMATIONS)
    expect(sliders()).toHaveLength(1)
    expect(text()).not.toContain('Dauer')

    select.value = 'zoom'
    select.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(vp.selectedAnimation.value).toBe('zoom')
    expect(text()).toContain('Dauer')
    expect(text()).toContain('0.5s')
    expect(sliders()).toHaveLength(2)
    sliders()[0].vm.$emit('update:modelValue', 1500)
    await flushPromises()
    expect(vp.animationDuration.value).toBe(1500)
    expect(text()).toContain('1.5s')
  })

  it('Größe-Regler', async () => {
    await mountControls()
    expect(text()).toContain('Größe')
    expect(text()).toContain('3x')
    sliders()[0].vm.$emit('update:modelValue', 5)
    await flushPromises()
    expect(vp.videoScale.value).toBe(5)
    expect(text()).toContain('5x')
  })

  it('Wiederholen und Stumm', async () => {
    await mountControls()
    await clickLabel('Wiederholen')
    expect(vp.videoLoop.value).toBe(false)
    await clickLabel('Stumm')
    expect(vp.videoMuted.value).toBe(true)
  })

  it('Platzieren', async () => {
    await mountControls()
    const btn = [...body().querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Platzieren',
    )
    btn.click()
    expect(vp.addVideoDirectly).toHaveBeenCalled()
  })

  it('Englisch', async () => {
    await mountControls({ locale: 'en' })
    for (const word of ['Placement', 'Effect', 'Size', 'Loop', 'Muted', 'Place']) {
      expect(text()).toContain(word)
    }
  })
})

describe('Video-Platzierung – Ui-Bausteine', () => {
  it('Effekt mit Label und übersetzten Namen, Schalter statt Checkboxen', async () => {
    await mountControls()
    const select = body().querySelector('select')
    expect(body().querySelector(`label[for="${select.id}"]`).textContent.trim()).toBe(
      de.placement.effect,
    )
    expect([...select.options].map((o) => o.textContent.trim())).toEqual(
      ANIMATIONS.map((a) => de.placement.animations[a]),
    )
    expect(body().querySelectorAll('[role="switch"]')).toHaveLength(2)
    expect(body().querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
  })
})

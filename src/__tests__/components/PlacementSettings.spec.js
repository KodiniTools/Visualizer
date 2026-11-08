// @vitest-environment jsdom
// Charakterisierung der Bild-Platzierung im Foto-Panel (Effekt, Dauer, Größe,
// X/Y, Zeichnen, Platzieren). Props und Events bleiben die Schnittstelle zu
// ImageUploadSection/StockGallerySection; Zugriff über Texte und Werte.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PlacementSettings from '../../components/foto-panel/PlacementSettings.vue'
import SliderField from '../../components/ui/SliderField.vue'
import { setLocale } from '../../lib/i18n'
import de from '../../lib/i18n/de'

let wrapper

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

async function mountSettings(props = {}, locale = 'de') {
  await setLocale(locale)
  wrapper = mount(PlacementSettings, { attachTo: document.body, props })
  await flushPromises()
}

const body = () => document.body
const text = () => body().textContent.replace(/\s+/g, ' ')
const sliders = () => wrapper.findAllComponents(SliderField)
const lastSettings = () => wrapper.emitted('update:settings')?.at(-1)?.[0]
const buttonByText = (name) =>
  [...body().querySelectorAll('button')].find((b) => b.textContent.trim() === name)

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  await setLocale('de')
})

describe('Bild-Platzierung', () => {
  it('Effekt-Auswahl; Dauer nur mit Effekt; Änderung meldet alle Einstellungen', async () => {
    await mountSettings({ imageScale: 2, imageOffsetX: 10, imageOffsetY: -20 })
    expect(text()).toContain('Platzierung')
    expect(text()).toContain('Effekt')
    const select = body().querySelector('select')
    expect([...select.options].map((o) => o.value)).toEqual(ANIMATIONS)
    expect(text()).not.toContain('Dauer')

    select.value = 'spin'
    select.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(lastSettings()).toEqual({
      selectedAnimation: 'spin',
      animationDuration: 1000,
      imageScale: 2,
      imageOffsetX: 10,
      imageOffsetY: -20,
    })
    expect(text()).toContain('Dauer')
    expect(text()).toContain('1.0s')
  })

  it('Dauer- und Größe-Regler melden ihre Werte', async () => {
    await mountSettings({ selectedAnimation: 'fade' })
    // [0] Dauer, [1] Größe
    sliders()[0].vm.$emit('update:modelValue', 2500)
    await flushPromises()
    expect(lastSettings().animationDuration).toBe(2500)
    expect(text()).toContain('2.5s')
    sliders()[1].vm.$emit('update:modelValue', 4)
    await flushPromises()
    expect(lastSettings().imageScale).toBe(4)
    expect(text()).toContain('4x')
  })

  it('X/Y-Versatz meldet Zahlen', async () => {
    await mountSettings()
    expect(text()).toContain('X')
    expect(text()).toContain('Y')
    const all = sliders()
    if (all.length >= 3) {
      all[1].vm.$emit('update:modelValue', 30)
      all[2].vm.$emit('update:modelValue', -40)
    } else {
      const [x, y] = body().querySelectorAll('input[type="number"]:not(.slider-field input)')
      x.value = '30'
      x.dispatchEvent(new Event('input'))
      y.value = '-40'
      y.dispatchEvent(new Event('input'))
    }
    await flushPromises()
    expect(lastSettings().imageOffsetX).toBe(30)
    expect(lastSettings().imageOffsetY).toBe(-40)
  })

  it('Props-Änderungen von außen werden übernommen', async () => {
    await mountSettings()
    await wrapper.setProps({ selectedAnimation: 'zoom', imageScale: 6 })
    expect(body().querySelector('select').value).toBe('zoom')
    expect(text()).toContain('6x')
  })

  it('Zeichnen und Platzieren; Hinweis im Bereichsmodus', async () => {
    await mountSettings()
    buttonByText('Zeichnen').click()
    buttonByText('Platzieren').click()
    expect(wrapper.emitted('start-draw')).toHaveLength(1)
    expect(wrapper.emitted('place-directly')).toHaveLength(1)
    expect(text()).not.toContain('Bereich auf Canvas ziehen')
    await wrapper.setProps({ isInRangeSelectionMode: true })
    expect(text()).toContain('Bereich auf Canvas ziehen')
  })

  it('Englisch', async () => {
    await mountSettings({ isInRangeSelectionMode: true }, 'en')
    for (const word of ['Placement', 'Effect', 'Size', 'Draw', 'Place', 'Draw area on canvas']) {
      expect(text()).toContain(word)
    }
  })
})

describe('Bild-Platzierung – Ui-Bausteine', () => {
  it('Effekt mit Label und übersetzten Namen, X/Y als Regler, keine freien Zahlenfelder', async () => {
    await mountSettings()
    const select = body().querySelector('select')
    expect(body().querySelector(`label[for="${select.id}"]`).textContent.trim()).toBe(
      de.placement.effect,
    )
    expect([...select.options].map((o) => o.textContent.trim())).toEqual(
      ANIMATIONS.map((a) => de.placement.animations[a]),
    )
    // Größe, X, Y
    expect(sliders()).toHaveLength(3)
    expect(body().querySelectorAll('.placement-input')).toHaveLength(0)
  })
})

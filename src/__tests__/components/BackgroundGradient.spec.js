// @vitest-environment jsdom
// Charakterisierung „Gradient“ (Canvas-Steuerung → Hintergrund): Schalter,
// zweite Farbe, Typ und Winkel schreiben in bgSettings und rufen
// updateGradientSettings. Zugriff über Texte und Rollen statt CSS-Klassen.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import BackgroundGradient from '../../components/canvas-control/background/BackgroundGradient.vue'
import { setLocale } from '../../lib/i18n'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const c = de.canvasControl
let wrapper
let bg

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  await setLocale('de')
})

function mountGradient(state = {}) {
  bg = {
    gradientEnabled: ref(false),
    gradientColor2: ref('#112233'),
    gradientType: ref('radial'),
    gradientAngle: ref(45),
    updateGradientSettings: vi.fn(),
    ...state,
  }
  wrapper = mount(BackgroundGradient, {
    global: { provide: { bgSettings: bg } },
    attachTo: document.body,
  })
  return wrapper
}

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')

/** Schalter über seinen Text: Checkbox im Label oder Switch mit label[for]. */
function toggle(name) {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find(
    (i) => i.closest('label')?.textContent.trim() === name,
  )
  if (cb) return cb
  const label = [...root().querySelectorAll('label')].find((l) => l.textContent.trim() === name)
  return label ? document.getElementById(label.htmlFor) : undefined
}
const isOn = (el) =>
  el.type === 'checkbox' ? el.checked : el.getAttribute('aria-checked') === 'true'
async function flip(name) {
  const el = toggle(name)
  expect(el, `Schalter „${name}“`).toBeTruthy()
  if (el.type === 'checkbox') {
    el.checked = !el.checked
    el.dispatchEvent(new Event('change'))
  } else el.click()
  await nextTick()
}

describe('Hintergrund-Gradient', () => {
  it('Schalter aktiviert den Gradient und zeigt die Einstellungen', async () => {
    mountGradient()
    expect(text()).toContain(c.gradient)
    expect(isOn(toggle(c.enableGradient))).toBe(false)
    expect(root().querySelector('select')).toBeNull()

    await flip(c.enableGradient)
    expect(bg.gradientEnabled.value).toBe(true)
    expect(bg.updateGradientSettings).toHaveBeenCalled()
    expect(text()).toContain(c.secondColor)
    expect(text()).toContain('#112233')
    expect(root().querySelector('select')).toBeTruthy()
  })

  it('Typ radial/linear; Winkel nur bei linear', async () => {
    mountGradient({ gradientEnabled: ref(true) })
    const select = root().querySelector('select')
    expect([...select.options].map((o) => [o.value, o.textContent.trim()])).toEqual([
      ['radial', c.radial],
      ['linear', c.linear],
    ])
    expect(select.value).toBe('radial')
    expect(root().querySelector('input[type="range"]')).toBeNull()

    bg.updateGradientSettings.mockClear()
    select.value = 'linear'
    select.dispatchEvent(new Event('change'))
    await nextTick()
    expect(bg.gradientType.value).toBe('linear')
    expect(bg.updateGradientSettings).toHaveBeenCalled()

    const range = root().querySelector('input[type="range"]')
    expect([range.min, range.max, range.step, range.value]).toEqual(['0', '360', '5', '45'])
    expect(text()).toContain('45°')
    bg.updateGradientSettings.mockClear()
    range.value = '90'
    range.dispatchEvent(new Event('input'))
    await nextTick()
    expect(bg.gradientAngle.value).toBe(90)
    expect(bg.updateGradientSettings).toHaveBeenCalled()
    expect(text()).toContain('90°')
  })
})

describe('Hintergrund-Gradient – Ui-Bausteine und Sprache', () => {
  it('Schalter ist UiSwitch, Typ hat ein Label', async () => {
    mountGradient({ gradientEnabled: ref(true) })
    expect(toggle(c.enableGradient).getAttribute('role')).toBe('switch')
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
    const select = root().querySelector('select')
    expect(document.querySelector(`label[for="${select.id}"]`).textContent.trim()).toBe(c.type)
  })

  it('Texte folgen der Sprache', async () => {
    await setLocale('en')
    mountGradient({ gradientEnabled: ref(true), gradientType: ref('linear') })
    expect(toggle(en.canvasControl.enableGradient)).toBeTruthy()
    expect(text()).toContain(en.canvasControl.angle)
    expect(text()).toContain(en.canvasControl.linear)
  })
})

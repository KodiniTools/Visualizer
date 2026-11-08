// @vitest-environment jsdom
// Charakterisierung der Beat-Drop-Sektion (Canvas-Steuerung). Zugriff über
// Texte, Werte und Rollen statt CSS-Klassen, damit die Tests den Wechsel auf
// die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import BeatDropSection from '../../components/canvas-control/BeatDropSection.vue'
import { useBeatDropStore } from '../../stores/beatDropStore'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const B = de.beatDrop
let wrapper
let store

beforeEach(() => {
  setActivePinia(createPinia())
  store = useBeatDropStore()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountSection(enabled = true) {
  store.enabled = enabled
  wrapper = mount(BeatDropSection, { attachTo: document.body })
  await nextTick()
  return wrapper
}

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')
const isOn = (el) =>
  el.type === 'checkbox' ? el.checked : el.getAttribute('aria-checked') === 'true'

/** Hauptschalter: Switch mit dem Titel als Namen, sonst erste Checkbox. */
const mainToggle = () =>
  root().querySelector(`[role="switch"][aria-label="${B.title}"]`) ??
  root().querySelector('input[type="checkbox"]')

/** Schalter eines Effekts über seinen sichtbaren Namen. */
function effectToggle(name) {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find((i) =>
    i.closest('label')?.textContent.includes(name),
  )
  if (cb) return cb
  const label = [...root().querySelectorAll('label')].find((l) => l.textContent.trim() === name)
  return label ? document.getElementById(label.htmlFor) : undefined
}

const ranges = () => [...root().querySelectorAll('input[type="range"]')]
const select = () => root().querySelector('select')

describe('Beat-Drop – Hauptschalter', () => {
  it('aus: nur Titel und Schalter, keine Einstellungen', async () => {
    await mountSection(false)
    expect(text()).toContain(B.title)
    expect(isOn(mainToggle())).toBe(false)
    expect(select()).toBeNull()
    expect(ranges()).toHaveLength(0)
  })

  it('Schalter aktiviert die Effekte im Store', async () => {
    await mountSection(false)
    mainToggle().click()
    await nextTick()
    expect(store.enabled).toBe(true)
    expect(select()).toBeTruthy()
  })
})

describe('Beat-Drop – Quelle', () => {
  it('bietet alle Quellen inkl. Onset-Gruppe, Auswahl geht in den Store', async () => {
    await mountSection()
    const values = [...select().querySelectorAll('option')].map((o) => o.value)
    expect(values).toEqual([
      'bass',
      'mid',
      'treble',
      'volume',
      'dynamic',
      'bassOnset',
      'midOnset',
      'trebleOnset',
      'allOnset',
    ])
    expect(select().querySelectorAll('optgroup')).toHaveLength(1)
    expect(select().value).toBe('bass')
    select().value = 'midOnset'
    select().dispatchEvent(new Event('change'))
    await nextTick()
    expect(store.source).toBe('midOnset')
  })

  it('Quellen-Beschriftung', async () => {
    await mountSection()
    expect(text()).toContain(B.source)
  })
})

describe('Beat-Drop – Effekte', () => {
  it('vier Effekt-Schalter; Standard: nur Flash an', async () => {
    await mountSection()
    const states = [B.flash, B.colorBurst, B.strobe, B.vignette].map((n) => isOn(effectToggle(n)))
    expect(states).toEqual([true, false, false, false])
  })

  it('Flash zeigt Intensität und Abklingen mit Prozentwert', async () => {
    await mountSection()
    expect(ranges().map((r) => r.value)).toEqual(['70', '60'])
    expect(text()).toContain(B.intensity)
    expect(text()).toContain(B.decay)
    expect(text()).toContain('70%')
    expect(text()).toContain('60%')
  })

  it('Effekt einschalten blendet seine Regler ein', async () => {
    await mountSection()
    effectToggle(B.strobe).click()
    await nextTick()
    expect(store.strobeEnabled).toBe(true)
    expect(ranges().map((r) => r.value)).toEqual(['70', '60', '8', '80'])
    expect(text()).toContain('8 Hz')
    effectToggle(B.colorBurst).click()
    effectToggle(B.vignette).click()
    await nextTick()
    expect(ranges()).toHaveLength(6)
  })

  it('Regler schreibt in den Store', async () => {
    await mountSection()
    const r = ranges()[0]
    r.value = '40'
    r.dispatchEvent(new Event('input'))
    await nextTick()
    expect(store.flashIntensity).toBe(40)
  })

  it('Farbfelder für Flash, Color Burst und Vignette', async () => {
    await mountSection()
    const swatches = root().querySelectorAll('.color-field, [class*="color-field"]')
    expect(swatches.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Beat-Drop – Sprache', () => {
  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      await mountSection()
      expect(text()).toContain(en.beatDrop.title)
      expect(text()).toContain(en.beatDrop.vignette)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Beat-Drop – Ui-Bausteine', () => {
  it('Schalter sind Switches, Hauptschalter mit Titel als Namen', async () => {
    await mountSection()
    const switches = [...root().querySelectorAll('[role="switch"]')]
    expect(switches).toHaveLength(5)
    expect(switches[0].getAttribute('aria-label')).toBe(B.title)
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('Quellen übersetzt, Onset-Gruppe beschriftet', async () => {
    await mountSection()
    const labels = [...select().querySelectorAll('option')].map((o) => o.textContent.trim())
    expect(labels).toEqual(
      [
        'bass',
        'mid',
        'treble',
        'volume',
        'dynamic',
        'bassOnset',
        'midOnset',
        'trebleOnset',
        'allOnset',
      ].map((k) => B.sources[k]),
    )
    expect(select().querySelector('optgroup').getAttribute('label')).toBe(B.sources.onsetGroup)
  })

  it('Regler-Beschriftung ohne Wert im Label, Wert separat', async () => {
    await mountSection()
    const labels = [...root().querySelectorAll('.control-group.slider > label')].map((l) =>
      l.textContent.trim(),
    )
    expect(labels).toEqual([B.intensity, B.decay])
  })

  it('Farbfelder tragen den Effektnamen', async () => {
    await mountSection()
    const names = [...root().querySelectorAll('.color-field__sr')].map(
      (el) => el.textContent.trim().split(' #')[0],
    )
    expect(names).toEqual([B.flash, B.colorBurst, B.vignette])
  })
})

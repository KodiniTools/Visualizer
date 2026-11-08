// @vitest-environment jsdom
// Charakterisierung „Audio-Reaktive Effekte“ (Canvas-Steuerung): Aufklappen,
// Hauptschalter, Effekt-Schalter, Quelle, Regler und Farben schreiben in den
// audioFxStore. Zugriff über sichtbare Texte und Rollen statt CSS-Klassen,
// damit die Tests den Wechsel auf die Ui-Bausteine und i18n überstehen.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import AudioFxPanel from '../../components/AudioFxPanel.vue'
import { useAudioFxStore } from '../../stores/audioFxStore'
import { setLocale } from '../../lib/i18n'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const TITLE = 'Audio-Reaktive Effekte'
const EFFECTS = [
  'Helligkeit',
  'Sättigung',
  'Kontrast',
  'Farbton-Rotation',
  'Pulsierung',
  'Glow',
  'Farb-Tint',
  'Vignette',
  'Zoom-Punch (Beat)',
  'Vignette-Puls (Beat)',
  'BPM-Puls',
  'Frequenz-Split',
]
let wrapper
let store

beforeEach(() => {
  setActivePinia(createPinia())
  store = useAudioFxStore()
})

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  await setLocale('de')
})

function mountPanel() {
  wrapper = mount(AudioFxPanel, { attachTo: document.body })
  return wrapper
}

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')
/** Innerstes Element mit genau diesem Text (Kopfzeile zum Aufklappen). */
const header = (title = TITLE) =>
  [...root().querySelectorAll('div, button')].filter((el) => el.textContent.trim() === title).pop()

async function open() {
  header().click()
  await nextTick()
}

/** Schalter über seinen Text: Checkbox (im Label oder in der Zeile) oder Switch. */
function toggle(name) {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find(
    (i) =>
      i.closest('label')?.textContent.trim() === name ||
      i.closest('div')?.textContent.trim() === name,
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
const ranges = () => [...root().querySelectorAll('input[type="range"]')]
async function slide(el, value) {
  el.value = String(value)
  el.dispatchEvent(new Event('input'))
  await nextTick()
}

describe('Audio-FX – Aufklappen und Hauptschalter', () => {
  it('ist zu Beginn zugeklappt und klappt per Kopf auf', async () => {
    mountPanel()
    expect(text().trim()).toBe(TITLE)
    await open()
    expect(toggle('Effekte aktiv')).toBeTruthy()
    await open()
    expect(toggle('Effekte aktiv')).toBeFalsy()
  })

  it('Hauptschalter schaltet den Store und zeigt alle Effekte', async () => {
    mountPanel()
    await open()
    expect(isOn(toggle('Effekte aktiv'))).toBe(false)
    expect(text()).not.toContain('Helligkeit')
    await flip('Effekte aktiv')
    expect(store.enabled).toBe(true)
    for (const name of EFFECTS) expect(toggle(name), name).toBeTruthy()
    expect(text()).toContain('Rhythmus & Kamera')
  })
})

describe('Audio-FX – Effekte', () => {
  beforeEach(() => {
    store.enabled = true
  })

  it('Effekt-Schalter spiegeln den Store, Regler nur bei aktivem Effekt', async () => {
    mountPanel()
    await open()
    // Standard: nur Helligkeit an (Min, Max)
    expect(isOn(toggle('Helligkeit'))).toBe(true)
    expect(isOn(toggle('Kontrast'))).toBe(false)
    expect(ranges()).toHaveLength(2)
    await flip('Kontrast')
    expect(store.contrastEnabled).toBe(true)
    expect(ranges()).toHaveLength(4)
    await flip('Helligkeit')
    expect(store.brightnessEnabled).toBe(false)
    expect(ranges()).toHaveLength(2)
  })

  it('Regler zeigen Wert mit Einheit und schreiben Zahlen', async () => {
    store.brightnessEnabled = false
    store.hueEnabled = true
    mountPanel()
    await open()
    expect(text()).toContain('Bereich: 60°')
    const [range] = ranges()
    expect(range.max).toBe('360')
    await slide(range, 90)
    expect(store.hueRange).toBe(90)
    expect(text()).toContain('Bereich: 90°')
  })

  it('Min/Max der Helligkeit', async () => {
    mountPanel()
    await open()
    expect(text()).toContain('Min: 80')
    expect(text()).toContain('Max: 130')
    const [min, max] = ranges()
    expect([min.max, max.max]).toEqual(['200', '300'])
    await slide(min, 50)
    await slide(max, 250)
    expect([store.brightnessMin, store.brightnessMax]).toEqual([50, 250])
  })

  it('Quelle mit Bändern und Onset-Gruppe schreibt in den Store', async () => {
    mountPanel()
    await open()
    const select = root().querySelector('select')
    const values = [...select.querySelectorAll('option')].map((o) => o.value)
    expect(values).toEqual([
      'bass',
      'mid',
      'treble',
      'volume',
      'bassOnset',
      'midOnset',
      'trebleOnset',
      'allOnset',
    ])
    expect(select.querySelector('optgroup')).toBeTruthy()
    expect(select.value).toBe('volume')
    select.value = 'bassOnset'
    select.dispatchEvent(new Event('change'))
    await nextTick()
    expect(store.brightnessSource).toBe('bassOnset')
  })

  it('Glow und Tint haben Farbe und Intensität, Beat-Effekte keine Quelle', async () => {
    store.brightnessEnabled = false
    store.glowEnabled = true
    store.zoomPunchEnabled = true
    mountPanel()
    await open()
    expect(text()).toContain('Farbe')
    expect(text()).toContain('Intensität: 50')
    expect(text()).toContain('Stärke: 50')
    // Glow hat eine Quelle, Zoom-Punch nicht
    expect(root().querySelectorAll('select')).toHaveLength(1)
    expect(ranges()).toHaveLength(2)
  })
})

describe('Audio-FX – Ui-Bausteine und Sprache', () => {
  it('Kopf ist ein Knopf mit aria-expanded', async () => {
    mountPanel()
    const btn = header()
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    await open()
    expect(btn.getAttribute('aria-expanded')).toBe('true')
  })

  it('Schalter sind UiSwitch, Quelle hat ein Label', async () => {
    store.enabled = true
    mountPanel()
    await open()
    expect(root().querySelectorAll('[role="switch"]').length).toBe(EFFECTS.length + 1)
    const select = root().querySelector('select')
    expect(document.querySelector(`label[for="${select.id}"]`).textContent.trim()).toBe(
      de.audioFx.source,
    )
  })

  it('Texte folgen der Sprache', async () => {
    await setLocale('en')
    store.enabled = true
    mountPanel()
    header(en.audioFx.title).click()
    await nextTick()
    expect(text()).toContain(en.audioFx.active)
    expect(text()).toContain(en.audioFx.effects.brightness)
    expect(text()).toContain(en.audioFx.rhythmGroup)
    expect(text()).not.toContain('Helligkeit')
  })
})

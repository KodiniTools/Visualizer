// @vitest-environment jsdom
// Charakterisierung des Effekte-Panels (Post-Processing global und je Ebene).
// Zugriff über sichtbare Texte und Rollen statt CSS-Klassen, damit die Tests
// den Wechsel auf die Ui-Bausteine und i18n unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import VisualizerEffectsPanel from '../../components/VisualizerEffectsPanel.vue'
import { useVisualizerStore } from '../../stores/visualizerStore'
import { useI18n } from '../../lib/i18n.js'

let wrapper
let store

beforeEach(() => {
  setActivePinia(createPinia())
  store = useVisualizerStore()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

function mountPanel(props = {}) {
  wrapper = mount(VisualizerEffectsPanel, { attachTo: document.body, props })
  return wrapper
}

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')
/** Schalter über seinen Text (Checkbox im Label oder Switch). */
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
  if (el.type === 'checkbox') {
    el.checked = !el.checked
    el.dispatchEvent(new Event('change'))
  } else el.click()
  await nextTick()
}
/** Quelle des Beat-Punch: Optionen eines select oder einer Radiogroup. */
function sourceOptions() {
  const rg = root().querySelector('[role="radiogroup"]')
  if (rg) return [...rg.querySelectorAll('[role="radio"]')].map((b) => b.textContent.trim())
  return [...root().querySelectorAll('select option')].map((o) => o.textContent.trim())
}
async function chooseSource(label) {
  const rg = root().querySelector('[role="radiogroup"]')
  if (rg) {
    ;[...rg.querySelectorAll('[role="radio"]')].find((b) => b.textContent.trim() === label).click()
  } else {
    const sel = root().querySelector('select')
    sel.value = [...sel.options].find((o) => o.textContent.trim() === label).value
    sel.dispatchEvent(new Event('change'))
  }
  await nextTick()
}

describe('Effekte – global', () => {
  it('Titel und vier Effekt-Schalter plus adaptive Qualität', () => {
    mountPanel()
    expect(text()).toContain('Effekte (Post-Processing)')
    for (const n of [
      'Bloom / Glühen',
      'Bewegungsspuren',
      'Beat-Punch',
      'Onset-Flourishes',
      'Adaptive Qualität',
    ]) {
      expect(toggle(n), n).toBeTruthy()
    }
    expect(text()).toContain('hält die Bildrate stabil')
  })

  it('Bloom an zeigt drei Regler mit Werten, Schalter schreibt in den Store', async () => {
    store.setBloomEnabled(false)
    mountPanel()
    expect(text()).not.toContain('Schwelle')
    await flip('Bloom / Glühen')
    expect(store.bloomEnabled).toBe(true)
    expect(isOn(toggle('Bloom / Glühen'))).toBe(true)
    expect(text()).toMatch(/Stärke: \d\.\d\d/)
    expect(text()).toMatch(/Schwelle: \d+%/)
    expect(text()).toMatch(/Radius: \d+px/)
  })

  it('Beat-Punch: Quelle Bass/Mitten/Höhen/Alle, Auswahl schreibt in den Store', async () => {
    store.setBeatPunchEnabled(true)
    mountPanel()
    expect(sourceOptions()).toEqual(['Bass', 'Mitten', 'Höhen', 'Alle'])
    await chooseSource('Höhen')
    expect(store.beatPunchSource).toBe('treble')
    expect(text()).toContain('Variation')
  })

  it('Spuren und Onset-Flourishes zeigen ihre Regler', async () => {
    store.setTrailsEnabled(true)
    store.setOnsetFlourishEnabled(true)
    mountPanel()
    expect(text()).toMatch(/Länge: \d+%/)
    expect(text()).toContain('Beat-getriggerte Effekte')
  })

  it('adaptive Qualität schreibt in den Store', async () => {
    mountPanel()
    const before = store.adaptiveQuality
    await flip('Adaptive Qualität')
    expect(store.adaptiveQuality).toBe(!before)
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountPanel()
      expect(text()).toContain('Effects (Post-Processing)')
      expect(toggle('Motion trails')).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Effekte – je Ebene', () => {
  it('ohne Titel und adaptive Qualität; Schalter wirkt nur auf die Ebene', async () => {
    store.setMultiLayerMode(true)
    store.addLayer()
    const layerId = store.visualizerLayers[0].id
    const globalBloom = store.bloomEnabled
    mountPanel({ layerId })
    expect(text()).not.toContain('Effekte (Post-Processing)')
    expect(toggle('Adaptive Qualität')).toBeUndefined()
    const before = store.layerEffects(store.visualizerLayers[0]).bloomEnabled
    await flip('Bloom / Glühen')
    expect(store.layerEffects(store.visualizerLayers[0]).bloomEnabled).toBe(!before)
    expect(store.bloomEnabled).toBe(globalBloom)
  })
})

describe('Effekte – Ui-Bausteine', () => {
  it('Schalter sind Switches, Quelle ist eine Radiogroup mit Namen', () => {
    store.setBeatPunchEnabled(true)
    mountPanel()
    expect(toggle('Bloom / Glühen').getAttribute('role')).toBe('switch')
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
    expect(root().querySelector('[role="radiogroup"]').getAttribute('aria-label')).toBe('Quelle')
  })
})

// @vitest-environment jsdom
// Charakterisierung der Ebenen-Steuerung (Foto-Panel, Bildbearbeitung). Zugriff
// über Texte, Namen und Rollen statt CSS-Klassen, damit die Tests den Wechsel
// auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'
import LayerControls from '../../components/foto-panel/image-filters/LayerControls.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useImageFilterControls } from '../../composables/useImageFilterControls.js'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const F = de.foto
let wrapper

function makeControls({ index = 1, count = 3 } = {}) {
  const layer = ref({ index, count })
  const renderBehindVisualizerRef = ref(false)
  return {
    layer,
    currentLayerInfo: computed(() =>
      layer.value.count ? `${layer.value.index + 1} / ${layer.value.count}` : '',
    ),
    canMoveUp: computed(() => layer.value.index < layer.value.count - 1),
    canMoveDown: computed(() => layer.value.index > 0),
    renderBehindVisualizerRef,
    onRenderBehindVisualizerChange: vi.fn((e) => {
      renderBehindVisualizerRef.value = typeof e === 'boolean' ? e : e.target.checked
    }),
    bringToFront: vi.fn(),
    moveUp: vi.fn(),
    moveDown: vi.fn(),
    sendToBack: vi.fn(),
  }
}

function mountControls(opts) {
  const ifc = makeControls(opts)
  wrapper = mount(LayerControls, {
    attachTo: document.body,
    global: { provide: { imageFilterControls: ifc } },
  })
  return ifc
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')
/** Knopf über seinen sichtbaren Text (ohne Pfeil-Glyphen). */
const button = (name) =>
  [...root().querySelectorAll('button')].find(
    (b) => b.textContent.replace(/[⬆⬇↑↓]/gu, '').trim() === name,
  )
const LAYER_NAMES = [F.bringToFront, F.moveUp, F.moveDown, F.sendToBack]

/** Schalter „Hinter Visualizer rendern“ (Checkbox im Label oder Switch). */
function behindToggle() {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find((i) =>
    i.closest('label')?.textContent.includes(F.renderBehindVisualizer),
  )
  if (cb) return cb
  const label = [...root().querySelectorAll('label')].find(
    (l) => l.textContent.trim() === F.renderBehindVisualizer,
  )
  return label ? document.getElementById(label.htmlFor) : undefined
}
const isOn = (el) =>
  el.type === 'checkbox' ? el.checked : el.getAttribute('aria-checked') === 'true'

describe('Ebenen – Anzeige', () => {
  it('Titel, Ebenen-Info und vier Knöpfe', () => {
    mountControls()
    expect(text()).toContain(F.layers)
    expect(text()).toContain('2 / 3')
    for (const n of LAYER_NAMES) expect(button(n), n).toBeTruthy()
  })

  it('ohne Ebenen-Info keine Info', () => {
    mountControls({ index: 0, count: 0 })
    expect(text()).not.toMatch(/\d+ \/ \d+/)
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountControls()
      expect(text()).toContain(en.foto.layers)
      expect(text()).toContain(en.foto.renderBehindVisualizer)
      expect(button(en.foto.bringToFront)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Ebenen – Bedienung', () => {
  it('Knöpfe rufen ihre Aktionen', () => {
    const ifc = mountControls()
    button(F.bringToFront).click()
    button(F.moveUp).click()
    button(F.moveDown).click()
    button(F.sendToBack).click()
    expect(ifc.bringToFront).toHaveBeenCalledTimes(1)
    expect(ifc.moveUp).toHaveBeenCalledTimes(1)
    expect(ifc.moveDown).toHaveBeenCalledTimes(1)
    expect(ifc.sendToBack).toHaveBeenCalledTimes(1)
  })

  it('oberste Ebene: nach oben gesperrt, nach unten frei', () => {
    mountControls({ index: 2, count: 3 })
    expect([F.bringToFront, F.moveUp].map((n) => button(n).disabled)).toEqual([true, true])
    expect([F.moveDown, F.sendToBack].map((n) => button(n).disabled)).toEqual([false, false])
  })

  it('unterste Ebene: nach unten gesperrt', () => {
    mountControls({ index: 0, count: 3 })
    expect([F.moveDown, F.sendToBack].map((n) => button(n).disabled)).toEqual([true, true])
    expect(button(F.moveUp).disabled).toBe(false)
  })

  it('„Hinter Visualizer rendern“ schaltet um', async () => {
    const ifc = mountControls()
    expect(isOn(behindToggle())).toBe(false)
    behindToggle().click()
    await nextTick()
    expect(ifc.onRenderBehindVisualizerChange).toHaveBeenCalledTimes(1)
    expect(ifc.renderBehindVisualizerRef.value).toBe(true)
    expect(isOn(behindToggle())).toBe(true)
  })
})

describe('Ebenen – Ui-Bausteine', () => {
  it('Knöpfe sind Ui-Buttons mit Symbol, ohne Pfeil-Glyphen', () => {
    mountControls()
    for (const n of LAYER_NAMES) {
      const b = button(n)
      expect(b.classList.contains('ui-button'), n).toBe(true)
      expect(b.querySelector('svg'), n).toBeTruthy()
    }
    expect(text()).not.toMatch(/[⬆⬇↑↓]/u)
  })

  it('Schalter ist ein Switch, keine Checkbox', () => {
    mountControls()
    expect(behindToggle().getAttribute('role')).toBe('switch')
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('Ebenen-Info hat einen Namen für Screenreader', () => {
    mountControls()
    const info = [...root().querySelectorAll('[aria-label]')].find((el) =>
      el.textContent.includes('2 / 3'),
    )
    expect(info.getAttribute('aria-label')).toBe(`${F.layers} 2 / 3`)
  })
})

describe('Ebenen – Schalter-Handler im Composable', () => {
  it('nimmt Boolean (Switch) und Event (Checkbox) an', () => {
    setActivePinia(createPinia())
    const emit = vi.fn()
    const c = useImageFilterControls({ currentActiveImage: null }, emit)
    c.onRenderBehindVisualizerChange(true)
    expect(c.renderBehindVisualizerRef.value).toBe(true)
    c.onRenderBehindVisualizerChange({ target: { checked: false } })
    expect(c.renderBehindVisualizerRef.value).toBe(false)
    expect(emit.mock.calls.map((a) => a[1].value)).toEqual([true, false])
  })
})

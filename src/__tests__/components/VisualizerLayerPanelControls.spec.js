// @vitest-environment jsdom
// Charakterisierung des Ebenen-Panels: Multi-Layer an/aus, Ebene hinzufügen,
// Ebenen-Kopf (Sichtbarkeit, Reihenfolge, Duplizieren, Löschen) und Details
// (Visualizer-Typ, Mischmodus, Reaktionsquelle). Zugriff über Beschriftungen,
// Titel und Rollen, damit die Tests den Wechsel auf die Ui-Bausteine überstehen.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import VisualizerLayerPanel from '../../components/VisualizerLayerPanel.vue'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { useI18n } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const V = de.visualizer
const C = de.common
let wrapper
let viz

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  viz = useVisualizerStore()
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountPanel() {
  wrapper = mount(VisualizerLayerPanel, {
    attachTo: document.body,
    global: {
      stubs: { VisualizerImagePicker: true, VisualizerEffectsPanel: true },
    },
  })
  await nextTick()
  return wrapper
}

const root = () => wrapper.element
const buttons = (scope = root()) => [...scope.querySelectorAll('button')]
const byText = (name, scope) => buttons(scope).find((b) => b.textContent.trim() === name)
const byTitle = (title, scope) => buttons(scope).find((b) => b.title === title)
const items = () => [...root().querySelectorAll('.layer-item')]
/** Multi-Layer-Schalter: Knopf „An/Aus“ oder Switch. */
function multiToggle() {
  return (
    root().querySelector('.layer-header [role="switch"]') ||
    byText(C.on, root().querySelector('.layer-header')) ||
    byText(C.off, root().querySelector('.layer-header'))
  )
}
/** Sichtbarkeit einer Ebene: Knopf mit Titel oder Switch. */
function visibilityToggle(item) {
  return (
    item.querySelector('[role="switch"]') ||
    byTitle(V.hideLayer, item) ||
    byTitle(V.showLayer, item)
  )
}
/** Select, das eine Option mit diesem Wert enthält. */
const selectWith = (value, scope = root()) =>
  [...scope.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === value))
async function choose(select, value) {
  select.value = value
  select.dispatchEvent(new Event('change'))
  await nextTick()
}

describe('Ebenen – Multi-Layer und Hinzufügen', () => {
  it('Multi-Layer schaltet den Modus um und zeigt die Ebenen', async () => {
    await mountPanel()
    expect(viz.multiLayerMode).toBe(false)
    expect(root().querySelector('.layer-list')).toBeNull()
    multiToggle().click()
    await nextTick()
    expect(viz.multiLayerMode).toBe(true)
    expect(items().length).toBeGreaterThan(0)
  })

  it('neue Ebene mit gewähltem Visualizer', async () => {
    viz.setMultiLayerMode(true)
    await mountPanel()
    const before = viz.visualizerLayers.length
    const add = selectWith('waveform', root().querySelector('.add-layer-section'))
    await choose(add, 'waveform')
    byText(V.addLayer).click()
    await nextTick()
    expect(viz.visualizerLayers).toHaveLength(before + 1)
    expect(viz.visualizerLayers.at(-1).visualizerId).toBe('waveform')
  })
})

describe('Ebenen – Kopf', () => {
  it('Sichtbarkeit, Reihenfolge, Duplizieren und Löschen', async () => {
    viz.setMultiLayerMode(true)
    viz.addLayer('waveform')
    await mountPanel()
    expect(items()).toHaveLength(2)
    const top = items()[0]
    const topId = viz.visualizerLayers[1].id

    visibilityToggle(top).click()
    await nextTick()
    expect(viz.visualizerLayers[1].visible).toBe(false)
    expect(viz.activeLayerId).not.toBe(null)

    byTitle(C.moveDown, items()[0]).click()
    await nextTick()
    expect(viz.visualizerLayers[0].id).toBe(topId)
    expect(byTitle(C.moveDown, items()[1]).disabled).toBe(true)

    byTitle(C.duplicate, items()[0]).click()
    await nextTick()
    expect(viz.visualizerLayers).toHaveLength(3)

    byText(C.delete, items()[0]).click()
    await nextTick()
    expect(viz.visualizerLayers).toHaveLength(2)
  })
})

describe('Ebenen – Details', () => {
  it('Visualizer-Typ, Mischmodus und Reaktionsquelle schreiben in die Ebene', async () => {
    viz.setMultiLayerMode(true)
    await mountPanel()
    const layer = () => viz.visualizerLayers[0]
    const details = () => root().querySelector('.layer-details')
    expect(details().textContent).toContain(V.visualizerType)
    expect(details().textContent).toContain(V.blendMode)

    await choose(selectWith('waveform', details()), 'waveform')
    expect(layer().visualizerId).toBe('waveform')

    await choose(selectWith('multiply', details()), 'multiply')
    expect(layer().blendMode).toBe('multiply')
    expect(
      [...selectWith('multiply', details()).options].map((o) => o.textContent.trim()),
    ).toContain('Multiplizieren')

    await choose(selectWith('bass', details()), 'bass')
    expect(layer().reactSource).toBe('bass')
    expect(details().textContent).toContain(V.reactSource.strength)
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      viz.setMultiLayerMode(true)
      await mountPanel()
      expect(byText(en.visualizer.addLayer)).toBeTruthy()
      expect(
        [...selectWith('multiply', root().querySelector('.layer-details')).options].map((o) =>
          o.textContent.trim(),
        ),
      ).toContain('Multiply')
    } finally {
      await setLocale('de')
    }
  })
})

describe('Ebenen – Ui-Bausteine', () => {
  it('Switches, Ui-Selects mit Namen, Ui-Buttons', async () => {
    viz.setMultiLayerMode(true)
    await mountPanel()
    expect(multiToggle().getAttribute('role')).toBe('switch')
    expect(visibilityToggle(items()[0]).getAttribute('role')).toBe('switch')
    const add = selectWith('waveform', root().querySelector('.add-layer-section'))
    expect(add.closest('.ui-select')).toBeTruthy()
    expect(document.querySelector(`label[for="${add.id}"]`)).toBeTruthy()
    expect(byText(V.addLayer).classList.contains('ui-button')).toBe(true)
    expect(byText(C.delete, items()[0]).classList.contains('ui-button--danger')).toBe(true)
    expect(selectWith('multiply').closest('.ui-select')).toBeTruthy()
  })
})

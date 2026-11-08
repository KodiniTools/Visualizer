// @vitest-environment jsdom
// Charakterisierung der Abschnitte „Text-Stil“ und „Position & Bereich“ im
// Formular für neue Texte. Zugriff über Beschriftungen, Titel und Rollen statt
// CSS-Klassen, damit die Tests den Wechsel auf die Ui-Bausteine überstehen.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'
import TextStyleSection from '../../components/text-manager/text-new-form/TextStyleSection.vue'
import PositionSection from '../../components/text-manager/text-new-form/PositionSection.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const T = de.textManager
let wrapper
let settings

beforeEach(() => {
  settings = reactive({
    fontSize: 48,
    fontFamily: 'Arial',
    color: '#ff0000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'center',
    opacity: 100,
    autoFit: false,
    autoFitPadding: 10,
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const root = () => wrapper.element
const buttons = () => [...root().querySelectorAll('button')]
const buttonByText = (name) => buttons().find((b) => b.textContent.trim() === name)
const buttonWithText = (part) => buttons().find((b) => b.textContent.includes(part))
const buttonByTitle = (title) => buttons().find((b) => b.title === title)

async function mountStyle() {
  wrapper = mount(TextStyleSection, {
    attachTo: document.body,
    props: { settings },
    global: {
      provide: {
        canvasManager: ref(null),
        fontManager: ref({ isInitialized: true, loadedFonts: new Set(['Roboto']) }),
      },
    },
  })
  wrapper.vm.populateNewTextFontDropdown()
  await nextTick()
  return wrapper
}

const fontSelect = () =>
  [...root().querySelectorAll('select')].find((s) =>
    [...s.options].some((o) => o.value === 'Roboto'),
  )
const fontValues = () => [...fontSelect().options].filter((o) => !o.disabled).map((o) => o.value)
/** Auto-Fit-Schalter: Checkbox im Label oder Switch mit Label. */
function autoFitToggle() {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find((i) =>
    i.closest('label')?.textContent.includes(T.autoFit),
  )
  if (cb) return cb
  const label = [...root().querySelectorAll('label')].find((l) => l.textContent.includes(T.autoFit))
  return document.getElementById(label.htmlFor)
}

describe('Neuer Text – Text-Stil', () => {
  it('Schriftwahl: Systemschriften, dann eigene; Auswahl setzt die Schrift', async () => {
    await mountStyle()
    const values = fontValues()
    expect(values[0]).toBe('Arial')
    expect(values.indexOf('Roboto')).toBeGreaterThan(values.indexOf('Trebuchet MS'))
    expect(fontSelect().value).toBe('Arial')
    fontSelect().value = 'Roboto'
    fontSelect().dispatchEvent(new Event('change'))
    await nextTick()
    expect(settings.fontFamily).toBe('Roboto')
  })

  it('Auto-Fit blendet den Rand-Regler ein', async () => {
    await mountStyle()
    expect(root().textContent).not.toContain(T.autoFitPadding)
    const toggle = autoFitToggle()
    if (toggle.type === 'checkbox') {
      toggle.checked = true
      toggle.dispatchEvent(new Event('change'))
    } else toggle.click()
    await nextTick()
    expect(settings.autoFit).toBe(true)
    expect(root().textContent).toMatch(new RegExp(`${T.autoFitPadding}: 10%`))
  })

  it('B, I und Ausrichtung schreiben in die Einstellungen', async () => {
    await mountStyle()
    buttonByText('B').click()
    buttonByText('I').click()
    buttonByText(T.left).click()
    await nextTick()
    expect(settings.fontWeight).toBe('bold')
    expect(settings.fontStyle).toBe('italic')
    expect(settings.textAlign).toBe('left')
  })

  it('Speichern und Zurücksetzen melden sich', async () => {
    await mountStyle()
    buttonWithText(T.saveAsDefault).click()
    buttonWithText(T.resetToDefault).click()
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('Texte folgen der Sprache, auch die Titel', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      await mountStyle()
      expect(buttonWithText(en.textManager.saveAsDefault).title).toBe(
        'Save current settings as default',
      )
      expect(buttonWithText(en.textManager.resetToDefault).title).toBe('Reset to factory settings')
    } finally {
      await setLocale('de')
    }
  })
})

const position = () => reactive({ x: 0.5, y: 0.5, xPixel: 960, yPixel: 540 })

function mountPosition(props = {}) {
  wrapper = mount(PositionSection, {
    attachTo: document.body,
    props: { position: position(), canvasWidth: 1920, canvasHeight: 1080, ...props },
  })
  return wrapper
}

describe('Neuer Text – Position & Bereich', () => {
  it('Bereich markieren, Pixel-Eingabe und Schnellauswahl melden sich', async () => {
    mountPosition()
    buttonWithText('Bereich auf Canvas markieren').click()
    expect(wrapper.emitted('start-selection')).toHaveLength(1)
    const x = root().querySelector('input[placeholder="0 - 1920"]')
    x.value = '100'
    x.dispatchEvent(new Event('input'))
    expect(wrapper.emitted('update-pixel')[0]).toEqual(['x'])
    buttonByTitle(T.quickPos.bottomRight).click()
    expect(wrapper.emitted('quick-position')[0]).toEqual(['bottom-right'])
  })

  it('beim Zeichnen gesperrt; mit Auswahl Größe und Löschen', async () => {
    mountPosition({ isSelecting: true, selectionBounds: { width: 400.4, height: 200.6 } })
    expect(buttonWithText('Zeichnen Sie ein Rechteck').disabled).toBe(true)
    expect(root().textContent).toMatch(/400 × 201 px/)
    buttonByText(T.layout.clearSelection).click()
    expect(wrapper.emitted('clear-selection')).toHaveLength(1)
  })
})

describe('Neuer Text – Ui-Bausteine', () => {
  it('Text-Stil: Select, Switch, Umschalter, Radiogroup, keine Emoji', async () => {
    await mountStyle()
    expect(fontSelect().closest('.ui-select')).toBeTruthy()
    expect([...fontSelect().options].some((o) => /──/.test(o.textContent))).toBe(false)
    expect(autoFitToggle().getAttribute('role')).toBe('switch')
    expect(buttonByText('B').getAttribute('aria-pressed')).toBe('false')
    expect(root().querySelector(`[role="radiogroup"][aria-label="${T.alignment}"]`)).toBeTruthy()
    expect(root().textContent).not.toMatch(/[💾🔄📐]/u)
  })

  it('Position: Ui-Buttons, Pixel-Felder mit Namen, keine Emoji', () => {
    mountPosition({ selectionBounds: { width: 10, height: 10 } })
    expect(buttonWithText('Bereich auf Canvas markieren').classList.contains('ui-button')).toBe(
      true,
    )
    expect(root().querySelector('input[placeholder="0 - 1920"]').getAttribute('aria-label')).toBe(
      T.layout.pixelX,
    )
    expect(root().textContent).not.toMatch(/🖱️/u)
  })
})

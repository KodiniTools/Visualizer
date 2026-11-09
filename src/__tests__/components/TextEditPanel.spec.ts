// @vitest-environment jsdom
// Charakterisierung des Text-Editors (Inhalt, Schrift, Stil, Ausrichtung,
// Position, Standard speichern, Löschen). Zugriff über Beschriftungen, Titel
// und Rollen statt CSS-Klassen, damit die Tests den Wechsel auf die
// Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, reactive, ref, type Ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import TextEditPanel from '../../components/text-manager/TextEditPanel.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'
import type { TextObject } from '../../lib/textManager/types'
import { stub } from '../helpers/canvasStubs'

const T = de.textManager
let wrapper: VueWrapper<InstanceType<typeof TextEditPanel>> | null
let canvasManager: Ref<{ redrawCallback: Mock; deleteActiveObject: Mock }>
let fontManager: Ref<{ isInitialized: boolean; loadedFonts: Set<string> }>
let text: TextObject

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  canvasManager = ref({ redrawCallback: vi.fn(), deleteActiveObject: vi.fn() })
  fontManager = ref({ isInitialized: true, loadedFonts: new Set(['Roboto']) })
  text = stub(
    reactive({
      content: 'Hallo',
      fontFamily: 'Georgia',
      fontSize: 48,
      opacity: 100,
      color: '#ffffff',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      relX: 0.5,
      relY: 0.5,
    }),
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountPanel() {
  wrapper = mount(TextEditPanel, {
    attachTo: document.body,
    props: { selectedText: text, canvasWidth: 1000, canvasHeight: 500 },
    global: {
      provide: { canvasManager, fontManager },
      stubs: {
        TextSpacingStrokeSection: true,
        TextShadowSection: true,
        TextRotationSection: true,
        TextAnimationsPanel: true,
      },
    },
  })
  await nextTick()
  await nextTick()
  return wrapper
}

const root = () => wrapper!.element
const buttons = () => [...root().querySelectorAll('button')]
const buttonByText = (name: string) => buttons().find((b) => b.textContent.trim() === name)
const buttonByTitle = (title: string) => buttons().find((b) => b.title === title)
const fontSelect = () =>
  [...root().querySelectorAll('select')].find((s) =>
    [...s.options].some((o) => o.value === 'Roboto'),
  )
const fontValues = () => [...fontSelect().options].filter((o) => !o.disabled).map((o) => o.value)
const textarea = () => root().querySelector('textarea')
/** Pixel-Eingaben der Position (Platzhalter „0 - Breite/Höhe“). */
const pixelInputs = () => [
  root().querySelector('input[placeholder="0 - 1000"]'),
  root().querySelector('input[placeholder="0 - 500"]'),
]

describe('Text-Editor – Inhalt', () => {
  it('Textfeld zeigt den Inhalt, Eingabe schreibt und zeichnet neu', async () => {
    await mountPanel()
    expect(textarea().value).toBe('Hallo')
    expect(root().textContent).toContain(de.textManager.layout.multilineHint)
    textarea().value = 'Zeile 1\nZeile 2'
    textarea().dispatchEvent(new Event('input'))
    await nextTick()
    expect(text.content).toBe('Zeile 1\nZeile 2')
    expect(canvasManager.value.redrawCallback).toHaveBeenCalled()
    expect(root().textContent).toContain('2 Zeilen')
  })

  it('stellt das Textfeld für Fokus und Cursor bereit', async () => {
    await mountPanel()
    expect(wrapper!.vm.editTextInput).toBe(textarea())
  })
})

describe('Text-Editor – Schrift', () => {
  it('aktuelle Schrift zuerst, dann System- und eigene Schriften', async () => {
    await mountPanel()
    const values = fontValues()
    expect(values[0]).toBe('Georgia')
    expect(values.filter((v) => v === 'Georgia')).toHaveLength(1)
    expect(values).toContain('Arial')
    expect(values.indexOf('Roboto')).toBeGreaterThan(values.indexOf('Trebuchet MS'))
    expect(fontSelect().value).toBe('Georgia')
  })

  it('Auswahl setzt die Schrift des Textes', async () => {
    await mountPanel()
    fontSelect().value = 'Roboto'
    fontSelect().dispatchEvent(new Event('change'))
    await nextTick()
    expect(text.fontFamily).toBe('Roboto')
  })
})

describe('Text-Editor – Stil und Ausrichtung', () => {
  it('B und I schalten Fett und Kursiv um', async () => {
    await mountPanel()
    buttonByText('B').click()
    buttonByText('I').click()
    await nextTick()
    expect(text.fontWeight).toBe('bold')
    expect(text.fontStyle).toBe('italic')
    buttonByText('B').click()
    expect(text.fontWeight).toBe('normal')
  })

  it('Ausrichtung Links/Mitte/Rechts', async () => {
    await mountPanel()
    for (const name of [T.left, T.center, T.right]) expect(buttonByText(name), name).toBeTruthy()
    buttonByText(T.right).click()
    expect(text.textAlign).toBe('right')
  })
})

describe('Text-Editor – Position', () => {
  it('Prozent-Anzeige und Pixel-Eingabe', async () => {
    await mountPanel()
    expect(root().textContent).toMatch(/Position X:\s*50%/)
    const [x, y] = pixelInputs()
    expect(x.value).toBe('500')
    expect(y.value).toBe('250')
    x.value = '250'
    x.dispatchEvent(new Event('input'))
    expect(text.relX).toBe(0.25)
  })

  it('Schnellauswahl setzt die Position', async () => {
    await mountPanel()
    buttonByTitle(de.textManager.quickPos.topLeft).click()
    expect(text.relX).toBe(0.1)
    expect(text.relY).toBe(0.1)
    buttonByTitle(de.textManager.quickPos.bottomRight).click()
    expect(text.relX).toBe(0.9)
    expect(text.relY).toBe(0.9)
  })
})

describe('Text-Editor – Aktionen', () => {
  it('Als Standard speichern, zurücksetzen und löschen', async () => {
    await mountPanel()
    buttons()
      .find((b) => b.textContent.includes(T.saveAsDefault))
      .click()
    expect(Object.keys(localStorage).length).toBeGreaterThan(0)
    buttonByTitle(T.resetDefault).click()
    expect(Object.keys(localStorage)).toHaveLength(0)
    buttonByText(T.deleteText).click()
    expect(canvasManager.value.deleteActiveObject).toHaveBeenCalled()
    expect(wrapper!.emitted('delete')).toHaveLength(1)
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      await mountPanel()
      expect(buttonByText(en.textManager.deleteText)).toBeTruthy()
      expect(buttonByText(en.textManager.right)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Text-Editor – Ui-Bausteine', () => {
  it('Textfeld, Schriftwahl, Stil-Umschalter, Ausrichtung und Löschen', async () => {
    await mountPanel()
    expect(textarea().closest('.ui-textarea')).toBeTruthy()
    expect(fontSelect().closest('.ui-select')).toBeTruthy()
    expect([...fontSelect().options].some((o) => /✨|aktuell|──/.test(o.textContent))).toBe(false)
    expect(buttonByText('B').getAttribute('aria-label')).toBe(T.bold)
    expect(buttonByText('B').getAttribute('aria-pressed')).toBe('false')
    expect(root().querySelector(`[role="radiogroup"][aria-label="${T.alignment}"]`)).toBeTruthy()
    expect(buttonByText(T.deleteText).classList.contains('ui-button--danger')).toBe(true)
    expect(pixelInputs()[0].getAttribute('aria-label')).toBeTruthy()
  })
})

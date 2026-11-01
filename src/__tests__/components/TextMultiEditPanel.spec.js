// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import TextMultiEditPanel from '../../components/text-manager/TextMultiEditPanel.vue'

function makeTexts() {
  return [
    reactive({ id: 1, relX: 0.2, relY: 0.3, color: '#000000', fontSize: 20, opacity: 50 }),
    reactive({ id: 2, relX: 0.6, relY: 0.7, color: '#000000', fontSize: 30, opacity: 80 }),
  ]
}

let canvasManager
let texts

function mountPanel(props = {}) {
  return mount(TextMultiEditPanel, {
    props: { texts, ...props },
    global: { provide: { canvasManager } },
  })
}

function buttonByLabel(w, label) {
  return w.findAll('button').find((b) => b.attributes('aria-label') === label || b.text() === label)
}

beforeEach(() => {
  texts = makeTexts()
  canvasManager = ref({
    redrawCallback: vi.fn(),
    selectAllTexts: vi.fn(),
    deleteTexts: vi.fn(),
  })
})

describe('TextMultiEditPanel', () => {
  it('zeigt Anzahl und Löschen-Text über i18n', () => {
    const w = mountPanel()
    expect(w.text()).toContain('2 Texte ausgewählt')
    expect(w.text()).toContain('Alle 2 löschen')
  })

  it('nutzt keine nativen select/input-number mehr', () => {
    const w = mountPanel()
    expect(w.find('input[type="number"].num-input').exists()).toBe(false)
    expect(w.find('select.font-select').exists()).toBe(false)
  })

  it('Ausrichten links setzt alle relX auf das Minimum und zeichnet neu', async () => {
    const w = mountPanel()
    await buttonByLabel(w, 'Linksbündig').trigger('click')
    expect(texts.map((t) => t.relX)).toEqual([0.2, 0.2])
    expect(canvasManager.value.redrawCallback).toHaveBeenCalled()
  })

  it('Vertikal zentrieren setzt relY auf den Mittelwert', async () => {
    const w = mountPanel()
    await buttonByLabel(w, 'Vertikal zentrieren').trigger('click')
    expect(texts[0].relY).toBeCloseTo(0.5)
    expect(texts[1].relY).toBeCloseTo(0.5)
  })

  it('Fein-Verschieben nach rechts addiert 0.01 auf relX', async () => {
    const w = mountPanel()
    await buttonByLabel(w, 'Nach rechts schieben').trigger('click')
    expect(texts[0].relX).toBeCloseTo(0.21)
    expect(texts[1].relX).toBeCloseTo(0.61)
  })

  it('Schriftart: Anwenden erst nach Auswahl, dann für alle', async () => {
    const w = mountPanel()
    const select = w.find('select')
    const applyFont = w
      .findAll('button')
      .filter((b) => b.text() === 'Anwenden')
      .at(-1)
    expect(applyFont.attributes('disabled')).toBeDefined()
    await select.setValue('Georgia')
    await applyFont.trigger('click')
    expect(texts.every((t) => t.fontFamily === 'Georgia')).toBe(true)
  })

  it('Audio kopieren ist ohne aktives Audio-Reaktiv gesperrt und kopiert sonst tief', async () => {
    let w = mountPanel()
    expect(buttonByLabel(w, 'Audio-Einstellungen kopieren').attributes('disabled')).toBeDefined()

    texts[0].audioReactive = { enabled: true, effects: { scale: { amount: 2 } } }
    w = mountPanel({ activeText: texts[0] })
    await buttonByLabel(w, 'Audio-Einstellungen kopieren').trigger('click')
    expect(texts[1].audioReactive).toEqual(texts[0].audioReactive)
    expect(texts[1].audioReactive).not.toBe(texts[0].audioReactive)
  })

  it('Alle auswählen, Auswahl aufheben und Löschen gehen an den Canvas-Manager', async () => {
    const w = mountPanel()
    await buttonByLabel(w, 'Alle').trigger('click')
    expect(canvasManager.value.selectAllTexts).toHaveBeenCalled()

    await buttonByLabel(w, 'Auswahl aufheben').trigger('click')
    expect(w.emitted('clear')).toHaveLength(1)

    await buttonByLabel(w, 'Alle 2 löschen').trigger('click')
    expect(canvasManager.value.deleteTexts).toHaveBeenCalledWith(texts)
    expect(w.emitted('clear')).toHaveLength(2)
  })
})

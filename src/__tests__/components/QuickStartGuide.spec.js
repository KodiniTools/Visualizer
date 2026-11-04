// @vitest-environment jsdom
// Schnellstart-Anleitung: Öffnen/Schließen per Knopf, „?“ und Esc, Reiter,
// Sprache (folgt der App, DE/EN im Panel), Inhalte in beiden Sprachen
// gleich aufgebaut und passend zu den echten Tastenkürzeln.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import QuickStartGuide from '../../components/QuickStartGuide.vue'
import { QUICK_START_CONTENT, QUICK_START_TABS } from '../../data/quickStartGuide.js'
import { SHORTCUT_RULES, shortcutContext } from '../../lib/keyboard/shortcutRules.js'
import { setLocale } from '../../lib/i18n.js'

let wrapper

beforeEach(async () => {
  await setLocale('de')
  wrapper = mount(QuickStartGuide, { attachTo: document.body })
})

afterEach(async () => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  await setLocale('de')
})

const panel = () => document.querySelector('.quick-start-panel')
const helpButton = () => wrapper.find('.help-button')
const press = (key, init = {}, target = document.body) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
const tabButtons = () => [...panel().querySelectorAll('.tab-nav [role="radio"]')]

describe('QuickStartGuide – Öffnen und Schließen', () => {
  it('Hilfe-Knopf öffnet und schließt, Titel wechselt', async () => {
    expect(panel()).toBeNull()
    expect(helpButton().attributes('title')).toBe('Schnellstart-Hilfe')
    await helpButton().trigger('click')
    expect(panel()).not.toBeNull()
    expect(helpButton().attributes('title')).toBe('Schließen')
    panel().querySelector('.close-btn').click()
    await nextTick()
    expect(panel()).toBeNull()
  })

  it('„?“ schaltet um, Esc schließt, in Eingabefeldern passiert nichts', async () => {
    press('?')
    await nextTick()
    expect(panel()).not.toBeNull()
    press('Escape')
    await nextTick()
    expect(panel()).toBeNull()

    const input = document.createElement('input')
    document.body.appendChild(input)
    press('?', {}, input)
    await nextTick()
    expect(panel()).toBeNull()
  })

  it('show/hide/toggleGuide sind von außen nutzbar', async () => {
    wrapper.vm.show()
    await nextTick()
    expect(panel()).not.toBeNull()
    wrapper.vm.hide()
    await nextTick()
    expect(panel()).toBeNull()
  })

  it('nach dem Entfernen reagiert „?“ nicht mehr', async () => {
    wrapper.unmount()
    press('?')
    await nextTick()
    expect(panel()).toBeNull()
    wrapper = null
  })
})

describe('QuickStartGuide – Reiter und Sprache', () => {
  it('Reiter wechseln den Inhalt', async () => {
    wrapper.vm.show()
    await nextTick()
    expect(tabButtons()).toHaveLength(QUICK_START_TABS.length)
    expect(panel().querySelectorAll('.workflow-step')).toHaveLength(
      QUICK_START_CONTENT.de.workflow.length,
    )
    tabButtons()[2].click()
    await nextTick()
    expect(tabButtons()[2].getAttribute('aria-checked')).toBe('true')
    expect(panel().querySelectorAll('.shortcut-group')).toHaveLength(
      QUICK_START_CONTENT.de.shortcuts.length,
    )
    tabButtons()[3].click()
    await nextTick()
    expect(panel().querySelectorAll('.tip-item')).toHaveLength(QUICK_START_CONTENT.de.tips.length)
  })

  it('DE/EN im Panel schaltet die Anleitung um', async () => {
    wrapper.vm.show()
    await nextTick()
    expect(panel().textContent).toContain('Schnellstart-Anleitung')
    const en = [...panel().querySelectorAll('.lang-toggle button')].find(
      (b) => b.textContent.trim() === 'EN',
    )
    en.click()
    await nextTick()
    expect(panel().textContent).toContain('Quick-Start Guide')
    expect(panel().textContent).toContain(QUICK_START_CONTENT.en.workflow[0].title)
  })

  it('folgt einem Sprachwechsel der App', async () => {
    await setLocale('en')
    await nextTick()
    expect(helpButton().attributes('title')).toBe('Quick-Start Guide')
    wrapper.vm.show()
    await nextTick()
    expect(tabButtons()[1].textContent).toContain('Features')
  })
})

describe('QuickStartGuide – Ui-Bausteine', () => {
  it('Hilfe-Knopf ist ein Umschalter, Schließen hat ein Label', async () => {
    expect(helpButton().classes()).toContain('ui-icon-button')
    expect(helpButton().attributes('aria-pressed')).toBe('false')
    expect(helpButton().attributes('aria-label')).toBe('Schnellstart-Hilfe')
    await helpButton().trigger('click')
    expect(helpButton().attributes('aria-pressed')).toBe('true')
    const close = panel().querySelector('.close-btn')
    expect(close.classList).toContain('ui-icon-button')
    expect(close.getAttribute('aria-label')).toBe('Schließen')
  })

  it('Reiter und Sprache sind Radiogruppen, Tasten als UiKbd', async () => {
    wrapper.vm.show()
    await nextTick()
    const groups = [...panel().querySelectorAll('[role="radiogroup"]')]
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual([
      'Sprache der Anleitung',
      'Bereiche der Anleitung',
    ])
    expect(tabButtons().map((b) => b.textContent.trim())).toEqual([
      'Workflow',
      'Funktionen',
      'Tasten',
      'Tipps',
    ])
    tabButtons()[2].click()
    await nextTick()
    const keys = QUICK_START_CONTENT.de.shortcuts.flatMap((g) => g.items.flatMap((i) => i.keys))
    expect(panel().querySelectorAll('kbd.ui-kbd')).toHaveLength(keys.length)
  })

  it('Beschriftungen in DE und EN vollständig', () => {
    const keys = (l) => Object.keys(QUICK_START_CONTENT[l].labels).sort()
    expect(keys('en')).toEqual(keys('de'))
    for (const id of QUICK_START_TABS) {
      expect(QUICK_START_CONTENT.de.labels[id]).toBeTruthy()
      expect(QUICK_START_CONTENT.en.labels[id]).toBeTruthy()
    }
  })
})

describe('QuickStartGuide – Inhalte', () => {
  const shape = (c) => ({
    workflow: c.workflow.length,
    features: c.features.map((f) => f.bullets.length),
    shortcuts: c.shortcuts.map((g) => g.items.map((i) => i.keys.length)),
    tips: c.tips.length,
  })

  it('DE und EN sind gleich aufgebaut', () => {
    expect(shape(QUICK_START_CONTENT.en)).toEqual(shape(QUICK_START_CONTENT.de))
  })

  it('jede Einzeltaste aus der Liste löst ein echtes Kürzel aus', () => {
    // Nur Kürzel aus der Regel-Tabelle; M (Beat-Marker) behandelt useBeatMarkers.
    const KEY = { Space: ' ', Entf: 'Delete', '←': 'ArrowLeft', '→': 'ArrowRight', Esc: 'Escape' }
    const MOD = new Set(['Strg', 'Shift'])
    const handled = (combo) => {
      const key = KEY[combo.at(-1)] ?? combo.at(-1).toLowerCase()
      const event = {
        key,
        ctrlKey: combo.includes('Strg'),
        shiftKey: combo.includes('Shift'),
        altKey: false,
        metaKey: false,
      }
      const ctx = shortcutContext(event, {
        canvasManager: { activeObject: {} },
        copiedObject: {},
      })
      // Mit Auswahl: Pfeile verschieben; ohne Auswahl: Titelwechsel
      const ctxNoSel = { ...ctx, hasSelection: false }
      return SHORTCUT_RULES.some((r) => r.when(ctx) || r.when(ctxNoSel))
    }
    const combos = QUICK_START_CONTENT.de.shortcuts
      .flatMap((g) => g.items.map((i) => i.keys))
      .filter((keys) => keys.every((k) => MOD.has(k) || k.length === 1 || k in KEY))
      .filter((keys) => keys.at(-1) !== 'M' || keys.includes('Shift'))
    expect(combos.length).toBeGreaterThan(8)
    for (const combo of combos) expect(handled(combo), combo.join('+')).toBe(true)
  })
})

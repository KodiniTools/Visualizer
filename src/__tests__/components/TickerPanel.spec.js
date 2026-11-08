// @vitest-environment jsdom
// Charakterisierung des Lauftext-Panels (linke Seitenleiste). Zugriff über
// Texte, Werte und Rollen statt CSS-Klassen, damit die Tests den Wechsel auf
// die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import TickerPanel from '../../components/TickerPanel.vue'
import { useTickerStore } from '../../stores/tickerStore'
import { useI18n } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const T = de.ticker
let wrapper
let store

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  store = useTickerStore()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountPanel(enabled = true) {
  store.enabled = enabled
  wrapper = mount(TickerPanel, {
    attachTo: document.body,
    global: { stubs: { TickerAudioReactive: true } },
  })
  // alle Unter-Sektionen aufklappen
  for (const d of wrapper.element.querySelectorAll('details')) d.open = true
  await nextTick()
  return wrapper
}

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')
const isOn = (el) =>
  el.type === 'checkbox' ? el.checked : el.getAttribute('aria-checked') === 'true'
const ranges = () => [...root().querySelectorAll('input[type="range"]')]
const rangeValues = () => ranges().map((r) => r.value)

/** Ein-/Aus-Schalter über den sichtbaren Namen (Checkbox im Label oder Switch). */
function toggle(name) {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find(
    (i) => i.closest('label')?.textContent.trim() === name,
  )
  if (cb) return cb
  const label = [...root().querySelectorAll('label')].find((l) => l.textContent.trim() === name)
  return label ? document.getElementById(label.htmlFor) : undefined
}

/** Aktivieren: alter Knopf („Deaktiviert“/„✓ Aktiviert“) oder Switch „Aktiviert“. */
const enableControl = () =>
  toggle(T.on) ??
  [...root().querySelectorAll('button')].find((b) =>
    [T.off, `✓ ${T.on}`].includes(b.textContent.trim()),
  )

/** Select nach seinem Label (Text vor dem Doppelpunkt oder ui-select-Label). */
function selectFor(name) {
  const label = [...root().querySelectorAll('label')].find(
    (l) => l.textContent.trim().replace(/:$/, '') === name,
  )
  if (!label) return undefined
  if (label.htmlFor) return document.getElementById(label.htmlFor)
  return label.parentElement.querySelector('select')
}

const resetButtons = () =>
  [...root().querySelectorAll('button')].filter(
    (b) => (b.getAttribute('aria-label') || b.getAttribute('title')) === T.reset,
  )

describe('Lauftext – Kopf und Aktivierung', () => {
  it('aus: Titel, kein Status, keine Einstellungen', async () => {
    await mountPanel(false)
    expect(text()).toContain(T.title)
    expect(ranges()).toHaveLength(0)
    expect(resetButtons()).toHaveLength(0)
  })

  it('Aktivieren schaltet den Store und zeigt den Status', async () => {
    await mountPanel(false)
    enableControl().click()
    await nextTick()
    expect(store.enabled).toBe(true)
    expect(root().querySelector('summary').textContent).toContain(T.on)
  })
})

describe('Lauftext – Unter-Sektionen', () => {
  it('fünf Sektionen mit je einem Zurücksetzen-Knopf', async () => {
    await mountPanel()
    for (const k of [
      'sectionText',
      'sectionOutline',
      'sectionBackground',
      'sectionMotion',
      'sectionAudio',
    ]) {
      expect(text()).toContain(T[k])
    }
    const spy = vi.spyOn(store, 'resetSection')
    const buttons = resetButtons()
    expect(buttons).toHaveLength(5)
    buttons.forEach((b) => b.click())
    expect(spy.mock.calls.map((c) => c[0])).toEqual([
      'text',
      'outline',
      'background',
      'motion',
      'audio',
    ])
  })

  it('Zurücksetzen klappt die Sektion nicht auf oder zu', async () => {
    await mountPanel()
    const details = resetButtons()[1].closest('details')
    details.open = false
    resetButtons()[1].click()
    await nextTick()
    expect(details.open).toBe(false)
  })
})

describe('Lauftext – Text & Schrift', () => {
  it('Text-Eingabe schreibt in den Store', async () => {
    await mountPanel()
    const input = root().querySelector('input[type="text"]')
    expect(input.value).toBe(store.text)
    input.value = 'Hallo'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    expect(store.text).toBe('Hallo')
  })

  it('Schriftart: System-Schriften, unbekannte Schrift wird ergänzt', async () => {
    store.fontFamily = 'Exotisch'
    await mountPanel()
    const sel = selectFor(T.fontFamily)
    const values = [...sel.querySelectorAll('option')].map((o) => o.value)
    expect(values[0]).toBe('Exotisch')
    expect(values).toContain('Arial')
    expect(values).toContain('Impact')
    expect(sel.value).toBe('Exotisch')
    sel.value = 'Georgia'
    sel.dispatchEvent(new Event('change'))
    await nextTick()
    expect(store.fontFamily).toBe('Georgia')
  })

  it('Fett schaltet um, Regler für Abstand und Größe mit px', async () => {
    await mountPanel()
    expect(isOn(toggle(T.bold))).toBe(true)
    toggle(T.bold).click()
    await nextTick()
    expect(store.bold).toBe(false)
    expect(text()).toContain(T.letterSpacing)
    expect(text()).toContain('48px')
  })
})

describe('Lauftext – Umrandung, Hintergrund, Bewegung', () => {
  it('Umrandung und Schatten blenden ihre Regler ein', async () => {
    await mountPanel()
    const before = ranges().length
    toggle(T.stroke).click()
    toggle(T.shadow).click()
    await nextTick()
    expect(store.strokeEnabled).toBe(true)
    expect(store.shadowEnabled).toBe(true)
    expect(ranges().length).toBe(before + 2)
    expect(text()).toContain(T.strokeWidth)
    expect(text()).toContain(T.shadowBlur)
  })

  it('Standard-Regler: Abstand, Größe, Transparenz, Position, Tempo', async () => {
    await mountPanel()
    expect(rangeValues()).toEqual(['0', '48', '70', '100', '120'])
    expect(text()).toContain('70%')
    expect(text()).toContain('120 px/s')
  })

  it('„Zentrieren“ setzt die Position auf 50 %', async () => {
    await mountPanel()
    const btn = [...root().querySelectorAll('button')].find(
      (b) => b.textContent.trim() === T.center,
    )
    btn.click()
    await nextTick()
    expect(store.positionY).toBe(50)
  })

  it('Laufrichtung: vier Richtungen, vertikal ändert Positions-Beschriftung', async () => {
    await mountPanel()
    const sel = selectFor(T.direction)
    expect([...sel.querySelectorAll('option')].map((o) => o.value)).toEqual([
      'left',
      'right',
      'up',
      'down',
    ])
    expect(text()).toContain(T.positionY)
    sel.value = 'up'
    sel.dispatchEvent(new Event('change'))
    await nextTick()
    expect(store.direction).toBe('up')
    expect(text()).toContain(T.positionX)
    expect(text()).toContain(T.positionXHint)
  })
})

describe('Lauftext – Sprache', () => {
  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      await mountPanel()
      expect(text()).toContain(en.ticker.title)
      expect(text()).toContain(en.ticker.sectionMotion)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Lauftext – Ui-Bausteine', () => {
  it('Schalter sind Switches, keine Checkboxen', async () => {
    await mountPanel()
    const names = [...root().querySelectorAll('[role="switch"]')].map((s) =>
      root().querySelector(`label[for="${s.id}"]`)?.textContent.trim(),
    )
    expect(names).toEqual([T.on, T.bold, T.stroke, T.shadow])
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('Zurücksetzen als Icon-Button, Zentrieren zeigt seinen Zustand', async () => {
    await mountPanel()
    for (const b of resetButtons()) expect(b.classList.contains('ui-icon-button')).toBe(true)
    const center = [...root().querySelectorAll('button')].find(
      (b) => b.textContent.trim() === T.center,
    )
    expect(center.getAttribute('aria-pressed')).toBe('false')
    center.click()
    await nextTick()
    expect(center.getAttribute('aria-pressed')).toBe('true')
  })

  it('Laufrichtung übersetzt, eigene Schriften als übersetzte Gruppe', async () => {
    await mountPanel()
    const dir = [...selectFor(T.direction).querySelectorAll('option')].map((o) =>
      o.textContent.trim(),
    )
    expect(dir).toEqual([T.left, T.right, T.up, T.down])
    const font = selectFor(T.fontFamily).querySelector('option[value="Impact"]')
    expect(font.style.fontFamily).toBe('Impact')
  })

  it('Status im Kopf lesbar (eigene Schriftfarbe auf Erfolgsfläche)', async () => {
    await mountPanel()
    expect(read()).toMatch(/\.status-badge\s*{[^}]*color:\s*var\(--ds-on-success\)/)
  })
})

function read() {
  return readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../components/TickerPanel.vue'),
    'utf8',
  )
}

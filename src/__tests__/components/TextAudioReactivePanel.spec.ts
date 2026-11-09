// @vitest-environment jsdom
// Charakterisierung der text-spezifischen Audio-Reaktiv-Einstellungen
// (Reaktions-Presets, Schwellenwert/Attack/Release, Blinken, Zurücksetzen).
// Das gemeinsame AudioReactivePanel ist gestubbt; Zugriff über Beschriftungen
// und Rollen, damit die Tests den Wechsel auf die Ui-Bausteine überstehen.
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, reactive, ref, type Ref, type SetupContext } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import TextAudioReactivePanel from '../../components/text-manager/TextAudioReactivePanel.vue'
import { createTextAudioReactiveConfig } from '../../lib/audio/audioReactiveConfig'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'
import type { TextObject } from '../../lib/textManager/types'
import { stub } from '../helpers/canvasStubs'

const T = de.textManager
let wrapper: VueWrapper | null
let text: TextObject
let canvasManager: Ref<{ redrawCallback: Mock }>

const PanelStub = {
  template: '<div class="ar-panel-stub" />',
  setup(_: unknown, { expose }: SetupContext) {
    expose({ loadSettings: vi.fn(), audioLevelBarRef: null })
  },
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  canvasManager = ref({ redrawCallback: vi.fn() })
  text = stub(
    reactive({ id: 't1', audioReactive: createTextAudioReactiveConfig({ enabled: true }) }),
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountPanel() {
  wrapper = mount(TextAudioReactivePanel, {
    attachTo: document.body,
    props: { selectedText: text },
    global: { provide: { canvasManager }, stubs: { AudioReactivePanel: PanelStub } },
  })
  await nextTick()
  return wrapper
}

const root = () => wrapper!.element
const ar = () => text.audioReactive
const buttons = () => [...root().querySelectorAll('button')]
const buttonWithText = (part: string) => buttons().find((b) => b.textContent.includes(part))
/** Range-Regler der Gruppe, deren Label mit `name` beginnt. */
function range(name: string) {
  const group = [...root().querySelectorAll('.control-group')].find((g) =>
    g.textContent.trim().startsWith(name),
  )
  return group?.querySelector('input[type="range"]')
}
async function slide(name: string, value: number) {
  const el = range(name)
  el.value = String(value)
  el.dispatchEvent(new Event('input'))
  await nextTick()
}
/** Ease-Schalter: Checkbox im Label oder Switch mit Label. */
function easeToggle() {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find((i) =>
    i.closest('label')?.textContent.includes(T.easeCurve),
  )
  if (cb) return cb
  const label = [...root().querySelectorAll('label')].find(
    (l) => l.textContent.trim() === T.easeCurve,
  )
  return label && document.getElementById(label.htmlFor)
}

describe('Text-Audio-Reaktiv – Reaktions-Presets', () => {
  it('vier Presets mit Titel, Klick übernimmt die Werte', async () => {
    await mountPanel()
    for (const key of ['presetPunchy', 'presetSmooth', 'presetSubtle', 'presetExtreme'] as const) {
      expect(buttonWithText(T[key])?.title, key).toBe(T[`${key}Title`])
    }
    buttonWithText(T.presetExtreme).click()
    await nextTick()
    expect(ar().attack).toBe(100)
    expect(ar().release).toBe(85)
    expect(ar().threshold).toBe(0)
  })
})

describe('Text-Audio-Reaktiv – Regler', () => {
  it('Schwellenwert, Attack und Release zeigen Werte und schreiben sie', async () => {
    await mountPanel()
    expect(root().textContent).toMatch(new RegExp(`${T.threshold}:\\s*0%`))
    expect(root().textContent).toMatch(new RegExp(`${T.attack}:\\s*90%`))
    await slide(T.threshold, 20)
    await slide(T.attack, 40)
    await slide(T.release, 60)
    expect(ar().threshold).toBe(20)
    expect(ar().attack).toBe(40)
    expect(ar().release).toBe(60)
    expect(canvasManager.value.redrawCallback).toHaveBeenCalled()
  })

  it('Blinken: Minimum und Ease nur bei aktivem Blinken', async () => {
    await mountPanel()
    expect(root().textContent).not.toContain(T.easeCurve)
    ar().effects.opacity!.enabled = true
    await nextTick()
    await slide(`${T.blink} – ${T.minimum}`, 30)
    expect(ar().effects.opacity!.minimum).toBe(30)
    const ease = easeToggle()
    if (ease.type === 'checkbox') {
      ease.checked = true
      ease.dispatchEvent(new Event('change'))
    } else ease.click()
    await nextTick()
    expect(ar().effects.opacity!.ease).toBe(true)
  })
})

describe('Text-Audio-Reaktiv – Zurücksetzen', () => {
  it('Einstellungen und alle Effekte zurücksetzen', async () => {
    await mountPanel()
    Object.assign(ar(), { threshold: 30, attack: 20 })
    ar().effects.opacity!.enabled = true
    buttons()
      .find((b) => b.textContent.trim().endsWith(T.reset))
      .click()
    expect(ar().threshold).toBe(0)
    expect(ar().attack).toBe(90)
    buttonWithText(T.resetAllEffects).click()
    expect(ar().effects.opacity!.enabled).toBe(false)
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      await mountPanel()
      expect(buttonWithText(en.textManager.presetPunchy)).toBeTruthy()
      expect(buttonWithText(en.textManager.resetAllEffects)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Text-Audio-Reaktiv – Ui-Bausteine', () => {
  it('Ui-Buttons ohne Emoji, Regler mit Standardwert, Ease als Switch', async () => {
    ar().effects.opacity!.enabled = true
    await mountPanel()
    const preset = buttonWithText(T.presetPunchy)
    expect(preset.classList.contains('ui-button')).toBe(true)
    expect(preset.textContent).not.toMatch(/[⚡🌊🎭🔥]/u)
    expect(buttonWithText(T.resetAllEffects).textContent).not.toMatch(/🔄/u)
    expect(range(T.threshold).closest('.slider-field')).toBeTruthy()
    expect(easeToggle().getAttribute('role')).toBe('switch')
  })
})

// @vitest-environment jsdom
// Charakterisierung „Audio-Reaktiv“ (gemeinsames Panel für Bild, Text,
// Hintergrund, Kacheln, Form, Lauftext, Video): Hauptschalter, Master-Regler,
// Effekte, loadSettings und das Event-Format, das die Verwender lesen
// (`event.target.value` / `event.target.checked`). Zugriff über sichtbare
// Texte, Rollen und `data-effect-id` statt Styling-Klassen, damit die Tests den
// Wechsel auf die Ui-Bausteine überstehen.
import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import AudioReactivePanel from '../../components/foto-panel/AudioReactivePanel.vue'
import { EFFECT_NAMES } from '../../lib/audio/AudioReactiveEffects'
import { setLocale } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

let wrapper: VueWrapper<InstanceType<typeof AudioReactivePanel>> | null

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  await setLocale('de')
})

function mountPanel(props = {}) {
  wrapper = mount(AudioReactivePanel, {
    props: { hasActiveImage: true, ...props },
    attachTo: document.body,
  })
  return wrapper
}

const root = () => wrapper!.element
const text = () => root().textContent.replace(/\s+/g, ' ')
const tick = async () => {
  await nextTick()
  await nextTick()
}

/** Schalter über seinen Text: Checkbox im Label oder Switch mit label[for]. */
function toggle(name: string, scope = root()) {
  const cb = [...scope.querySelectorAll('input[type="checkbox"]')].find(
    (i) => i.closest('label')?.textContent.trim() === name,
  )
  if (cb) return cb
  const label = [...scope.querySelectorAll('label')].find((l) => l.textContent.trim() === name)
  return label ? document.getElementById(label.htmlFor) : undefined
}
const isOn = (el: HTMLInputElement) =>
  el.type === 'checkbox' ? el.checked : el.getAttribute('aria-checked') === 'true'
async function flipEl(el: HTMLInputElement) {
  if (el.type === 'checkbox') {
    el.checked = !el.checked
    el.dispatchEvent(new Event('change'))
  } else el.click()
  await tick()
}
async function flip(name: string) {
  const el = toggle(name)
  expect(el, `Schalter „${name}“`).toBeTruthy()
  await flipEl(el)
}

/** Kleinstes <div>, das den Text und ein passendes Steuerelement enthält. */
function rowOf(label: string, selector: string) {
  return [...root().querySelectorAll('div')]
    .filter((d) => d.querySelector(selector) && d.textContent.includes(label))
    .sort((a, b) => a.textContent.length - b.textContent.length)[0]
}
const rangeRow = (label: string) => rowOf(label, 'input[type="range"]')
const rangeOf = (label: string) => rangeRow(label).querySelector('input[type="range"]')
const selectOf = (label: string) => rowOf(label, 'select').querySelector('select')
const rowText = (el: Element) => el.textContent!.replace(/\s+/g, ' ')

async function slide(el: HTMLInputElement, value: number) {
  el.value = String(value)
  el.dispatchEvent(new Event('input'))
  await tick()
}
async function choose(select: HTMLSelectElement, value: string) {
  select.value = value
  select.dispatchEvent(new Event('change'))
  await tick()
}
/** Event-Format der Verwender: `event.target.value` / `event.target.checked` */
type TargetEvent = { target: { value: string; checked: boolean } }
const lastEmit = <T extends unknown[] = [TargetEvent]>(name: string) =>
  wrapper!.emitted<T>(name)?.at(-1)

const effectRow = (id: string) => root().querySelector(`[data-effect-id="${id}"]`)
const effectSwitch = (id: string) =>
  effectRow(id).querySelector('input[type="checkbox"], [role="switch"]')

async function enableMaster() {
  await flip(de.foto.audioReactive)
}

describe('Audio-Reaktiv – Hauptschalter', () => {
  it('ist aus, zeigt nur den Schalter und meldet das Einschalten', async () => {
    mountPanel()
    const sw = toggle(de.foto.audioReactive)
    expect(isOn(sw)).toBe(false)
    expect(text()).not.toContain(de.foto.smoothing)
    expect(root().querySelector('[data-effect-id]')).toBeNull()

    await enableMaster()
    expect(lastEmit('audio-reactive-toggle')![0].target.checked).toBe(true)
    expect(isOn(toggle(de.foto.audioReactive))).toBe(true)
    for (const label of [
      de.foto.audioLevel,
      de.foto.audioSource,
      de.foto.smoothing,
      de.foto.easing,
      de.foto.beatBoost,
      de.foto.phase,
      de.foto.presets,
      de.foto.effects,
    ])
      expect(text(), label).toContain(label)
    expect(root().querySelectorAll('[data-effect-id]')).toHaveLength(EFFECT_NAMES.length)

    await flip(de.foto.audioReactive)
    expect(lastEmit('audio-reactive-toggle')![0].target.checked).toBe(false)
    expect(text()).not.toContain(de.foto.smoothing)
  })

  it('stellt den Pegelbalken für die Verwender bereit', async () => {
    mountPanel()
    await enableMaster()
    expect(wrapper!.vm.audioLevelBarRef).toBeInstanceOf(HTMLElement)
  })
})

describe('Audio-Reaktiv – Master-Regler', () => {
  it('Quelle mit Bändern und Onset-Gruppe', async () => {
    mountPanel()
    await enableMaster()
    const select = selectOf(de.foto.audioSource)
    expect([...select.querySelectorAll('option')].map((o) => o.value)).toEqual([
      'bass',
      'mid',
      'treble',
      'volume',
      'bassOnset',
      'midOnset',
      'trebleOnset',
      'allOnset',
    ])
    expect(select.querySelector('optgroup').label).toBe(de.foto.onsetGroup)
    expect(select.value).toBe('bass')
    await choose(select, 'trebleOnset')
    expect(lastEmit('source-change')![0].target.value).toBe('trebleOnset')
  })

  it('Übergang (Easing) mit allen Kurven', async () => {
    mountPanel()
    await enableMaster()
    const select = selectOf(de.foto.easing)
    expect([...select.querySelectorAll('option')].map((o) => o.value)).toEqual([
      'linear',
      'easeIn',
      'easeOut',
      'easeInOut',
      'bounce',
      'elastic',
      'punch',
    ])
    expect(select.value).toBe('linear')
    await choose(select, 'elastic')
    expect(lastEmit('easing-change')![0].target.value).toBe('elastic')
  })

  it('Glättung, Pegel, Beat-Verstärkung und Phase zeigen den Wert und melden ihn', async () => {
    mountPanel()
    await enableMaster()

    expect(rowText(rangeRow(de.foto.smoothing))).toContain('50%')
    await slide(rangeOf(de.foto.smoothing), 70)
    expect(parseInt(lastEmit('smoothing-change')![0].target.value)).toBe(70)
    expect(rowText(rangeRow(de.foto.smoothing))).toContain('70%')

    expect(rowText(rangeRow(de.foto.audioGain))).toContain('100%')
    expect(rangeOf(de.foto.audioGain).max).toBe('2')
    await slide(rangeOf(de.foto.audioGain), 1.5)
    expect(parseFloat(lastEmit('gain-change')![0].target.value)).toBe(1.5)
    expect(rowText(rangeRow(de.foto.audioGain))).toContain('150%')

    expect(rowText(rangeRow(de.foto.beatBoost))).toContain(de.foto.beatBoostOff)
    await slide(rangeOf(de.foto.beatBoost), 1.5)
    expect(parseFloat(lastEmit('beat-boost-change')![0].target.value)).toBe(1.5)
    expect(rowText(rangeRow(de.foto.beatBoost))).toContain('50%')

    expect(rowText(rangeRow(de.foto.phase))).toContain('0°')
    await slide(rangeOf(de.foto.phase), 90)
    expect(parseInt(lastEmit('phase-change')![0].target.value)).toBe(90)
    expect(rowText(rangeRow(de.foto.phase))).toContain('90°')
  })
})

describe('Audio-Reaktiv – Effekte', () => {
  it('Schalter, Quelle und Intensität melden Effekt-ID und Wert', async () => {
    mountPanel()
    await enableMaster()
    expect(isOn(effectSwitch('hue'))).toBe(false)

    await flipEl(effectSwitch('hue'))
    expect(lastEmit('effect-toggle')).toEqual(['hue', true])
    expect(isOn(effectSwitch('hue'))).toBe(true)

    const select = effectRow('hue').querySelector('select')
    expect(select.value).toBe('')
    expect([...select.querySelectorAll('option')].map((o) => o.value)).toEqual([
      '',
      'bass',
      'mid',
      'treble',
      'volume',
      'bassOnset',
      'midOnset',
      'trebleOnset',
      'allOnset',
    ])
    await choose(select, 'mid')
    expect(lastEmit('effect-source-change')).toEqual(['hue', 'mid'])

    const range = effectRow('hue').querySelector('input[type="range"]')
    expect(range.value).toBe('80')
    await slide(range, 55)
    const [id, value] = lastEmit<[string, string]>('effect-intensity-change')!
    expect([id, Number(value)]).toEqual(['hue', 55])

    await flipEl(effectSwitch('hue'))
    expect(lastEmit('effect-toggle')).toEqual(['hue', false])
  })

  it('Standard-Intensität je Kategorie', async () => {
    mountPanel()
    await enableMaster()
    const expected = { hue: '80', scale: '50', shake: '50', glow: '60', beatPulse: '70' }
    for (const [id, value] of Object.entries(expected)) {
      await flipEl(effectSwitch(id))
      expect(effectRow(id).querySelector('input[type="range"]').value, id).toBe(value)
    }
  })

  it('allowedEffects filtert, extraCategories ergänzen', async () => {
    mountPanel({
      allowedEffects: ['hue', 'scale', 'gradientShift'],
      extraCategories: [
        { title: 'Verlauf', effects: [{ id: 'gradientShift', name: 'Verschieben' }] },
      ],
    })
    await enableMaster()
    const ids = [...root().querySelectorAll('[data-effect-id]')].map((e) => e.dataset.effectId)
    expect(ids).toEqual(['hue', 'scale', 'gradientShift'])
    expect(text()).toContain('Verlauf')
    expect(text()).not.toContain(de.foto.movementEffects)
  })
})

describe('Audio-Reaktiv – loadSettings', () => {
  const config = {
    enabled: true,
    source: 'mid',
    smoothing: 30,
    easing: 'bounce',
    beatBoost: 2,
    phase: 180,
    gain: 0.5,
    effects: {
      hue: { enabled: true, intensity: 40, source: 'treble' },
      glow: { enabled: false, intensity: 20 },
    },
  }

  it('füllt Schalter, Regler und Effekte aus einem Bild', async () => {
    mountPanel()
    wrapper!.vm.loadSettings({ fotoSettings: { audioReactive: config } })
    await tick()
    expect(isOn(toggle(de.foto.audioReactive))).toBe(true)
    expect(selectOf(de.foto.audioSource).value).toBe('mid')
    expect(selectOf(de.foto.easing).value).toBe('bounce')
    expect(rangeOf(de.foto.smoothing).value).toBe('30')
    expect(rowText(rangeRow(de.foto.smoothing))).toContain('30%')
    expect(rowText(rangeRow(de.foto.beatBoost))).toContain('100%')
    expect(rowText(rangeRow(de.foto.phase))).toContain('180°')
    expect(rowText(rangeRow(de.foto.audioGain))).toContain('50%')

    expect(isOn(effectSwitch('hue'))).toBe(true)
    expect(effectRow('hue').querySelector('select').value).toBe('treble')
    expect(effectRow('hue').querySelector('input[type="range"]').value).toBe('40')
    expect(rowText(effectRow('hue'))).toContain('40%')
    expect(isOn(effectSwitch('glow'))).toBe(false)
    expect(isOn(effectSwitch('scale'))).toBe(false)
  })

  it('nimmt auch eine Konfiguration direkt; null schaltet aus', async () => {
    mountPanel()
    wrapper!.vm.loadSettings(config)
    await tick()
    expect(isOn(toggle(de.foto.audioReactive))).toBe(true)
    expect(wrapper!.vm.isEnabled).toBe(true)

    wrapper!.vm.loadSettings(null)
    await tick()
    expect(isOn(toggle(de.foto.audioReactive))).toBe(false)
    expect(wrapper!.vm.isEnabled).toBe(false)
    expect(text()).not.toContain(de.foto.smoothing)
  })
})

describe('Audio-Reaktiv – Presets und Aktionen', () => {
  it('Preset-Knöpfe und Speichern/Anwenden melden sich', async () => {
    mountPanel({ hasSavedSettings: true })
    await enableMaster()
    const btn = (label: string) =>
      [...root().querySelectorAll('button')].find((b) => b.textContent.includes(label))
    btn(de.foto.noPreset).click()
    expect(wrapper!.emitted('clear-preset')).toHaveLength(1)
    btn(de.foto.save).click()
    btn(de.foto.apply).click()
    expect(wrapper!.emitted('save-settings')).toHaveLength(1)
    expect(wrapper!.emitted('apply-settings')).toHaveLength(1)
  })
})

describe('Audio-Reaktiv – Ui-Bausteine und Sprache', () => {
  it('Haupt- und Effekt-Schalter sind UiSwitch', async () => {
    mountPanel()
    await enableMaster()
    expect(root().querySelectorAll('[role="switch"]').length).toBe(EFFECT_NAMES.length + 1)
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('Effekt-Intensität zeigt den aktuellen Wert (vorher blieb die Anzeige stehen)', async () => {
    mountPanel()
    await enableMaster()
    await flipEl(effectSwitch('hue'))
    await slide(effectRow('hue').querySelector('input[type="range"]'), 55)
    expect(rowText(effectRow('hue'))).toContain('55%')
  })

  it('Auswahlfelder haben ein Label', async () => {
    mountPanel()
    await enableMaster()
    const labelFor = (select: HTMLSelectElement) =>
      document.querySelector(`label[for="${select.id}"]`)
    expect(labelFor(selectOf(de.foto.audioSource))!.textContent!.trim()).toBe(de.foto.audioSource)
    expect(labelFor(selectOf(de.foto.easing))!.textContent!.trim()).toBe(de.foto.easing)
    await flipEl(effectSwitch('hue'))
    const fxSelect = effectRow('hue').querySelector('select')
    expect(labelFor(fxSelect)!.textContent).toContain(de.foto.effectSource)
  })

  it('Easing-Kurven und „Aus“ folgen der Sprache', async () => {
    await setLocale('en')
    mountPanel()
    await flip(en.foto.audioReactive)
    const labels = [...selectOf(en.foto.easing).querySelectorAll('option')].map((o) =>
      o.textContent.trim(),
    )
    expect(labels).toEqual(Object.values(en.foto.easings))
    expect(rowText(rangeRow(en.foto.beatBoost))).toContain(en.foto.beatBoostOff)
    expect(text()).not.toContain('Aus')
  })
})

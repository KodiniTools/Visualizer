// @vitest-environment jsdom
// Charakterisierung der Slideshow-Zeiteinstellungen (Übergang, Ein-/Ausblenden,
// Anzeigedauer, Audio-Reaktiv, Endlos). Zugriff über Beschriftungen und Rollen
// statt CSS-Klassen, damit die Tests den Wechsel auf die Ui-Bausteine
// unverändert überstehen.
import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import SlideshowTimingSettings from '../../components/foto-panel/slideshow/SlideshowTimingSettings.vue'
import { SLIDESHOW_TRANSITIONS } from '../../lib/slideshowTransitions'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const S = de.slideshow
let wrapper: VueWrapper | null

function mountSettings(props = {}) {
  wrapper = mount(SlideshowTimingSettings, {
    attachTo: document.body,
    props: {
      fadeInDuration: 1000,
      displayDuration: 3000,
      fadeOutDuration: 1000,
      applyAudioReactive: true,
      loopSlideshow: false,
      transition: 'fade',
      hasSavedSettings: true,
      ...props,
    },
  })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const root = () => wrapper!.element
const text = () => root().textContent.replace(/\s+/g, ' ')
const select = () => {
  const label = [...root().querySelectorAll('label')].find(
    (l) => l.textContent.trim() === S.defaultTransitionLabel,
  )
  return document.getElementById(label.htmlFor) as HTMLSelectElement | null
}
/** Schalter über seinen Text (Checkbox im Label oder Switch). */
function toggle(name: string) {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find(
    (i) => i.closest('label')?.textContent.trim() === name,
  )
  if (cb) return cb
  const label = [...root().querySelectorAll('label')].find((l) => l.textContent.trim() === name)
  return label ? document.getElementById(label.htmlFor) : undefined
}
const isOn = (el: HTMLInputElement) =>
  el.type === 'checkbox' ? el.checked : el.getAttribute('aria-checked') === 'true'
const lastEmit = (name: string) => wrapper!.emitted(name)?.at(-1)?.[0]

describe('Slideshow-Zeiten – Übergang und Dauer', () => {
  it('Überschrift, Übergang mit allen Varianten, Auswahl wird gemeldet', async () => {
    mountSettings()
    expect(text()).toContain(S.timing)
    const sel = select()
    expect([...sel!.querySelectorAll('option')].map((o) => o.value)).toEqual(
      SLIDESHOW_TRANSITIONS.map((tr) => tr.id),
    )
    expect(sel!.value).toBe('fade')
    sel!.value = 'slideLeft'
    sel!.dispatchEvent(new Event('change'))
    await nextTick()
    expect(lastEmit('update:transition')).toBe('slideLeft')
  })

  it('Übergangsnamen übersetzt', () => {
    mountSettings()
    const labels = [...select()!.querySelectorAll('option')].map((o) => o.textContent!.trim())
    for (const [i, tr] of SLIDESHOW_TRANSITIONS.entries()) {
      expect(labels[i]).toContain(S.transitions[tr.id as keyof typeof S.transitions])
    }
  })

  it('drei Regler mit Sekunden-Anzeige, Regler meldet Wert', async () => {
    mountSettings({ displayDuration: 4500 })
    expect(text()).toContain(S.fadeIn)
    expect(text()).toContain(S.display)
    expect(text()).toContain(S.fadeOut)
    expect(text()).toContain('1.0s')
    expect(text()).toContain('4.5s')
    const ranges = [...root().querySelectorAll('input[type="range"]')]
    expect(ranges.map((r) => r.value)).toEqual(['1000', '4500', '1000'])
    ranges[1].value = '6000'
    ranges[1].dispatchEvent(new Event('input'))
    await nextTick()
    expect(lastEmit('update:displayDuration')).toBe(6000)
  })
})

describe('Slideshow-Zeiten – Optionen', () => {
  it('Audio-Reaktiv an, Endlos aus; Umschalten wird gemeldet', async () => {
    mountSettings()
    expect(isOn(toggle(S.applyAudioReactive))).toBe(true)
    expect(isOn(toggle(S.loop))).toBe(false)
    toggle(S.loop).click()
    await nextTick()
    expect(lastEmit('update:loopSlideshow')).toBe(true)
    toggle(S.applyAudioReactive).click()
    await nextTick()
    expect(lastEmit('update:applyAudioReactive')).toBe(false)
  })

  it('Warnung nur bei Audio-Reaktiv ohne gespeicherte Einstellungen', async () => {
    mountSettings({ hasSavedSettings: false })
    expect(text()).toContain(S.noSavedSettings)
    await wrapper!.setProps({ hasSavedSettings: true })
    expect(text()).not.toContain(S.noSavedSettings)
    await wrapper!.setProps({ hasSavedSettings: false, applyAudioReactive: false })
    expect(text()).not.toContain(S.noSavedSettings)
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountSettings()
      expect(text()).toContain(en.slideshow.timing)
      expect(text()).toContain(en.slideshow.loop)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Slideshow-Zeiten – Ui-Bausteine', () => {
  it('Übergang als Ui-Select', () => {
    mountSettings()
    expect(select()!.closest('.ui-select')).toBeTruthy()
  })

  it('Schalter sind Switches, keine Checkboxen', () => {
    mountSettings()
    for (const n of [S.applyAudioReactive, S.loop]) {
      expect(toggle(n).getAttribute('role'), n).toBe('switch')
    }
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('Warnung als Ui-Callout', () => {
    mountSettings({ hasSavedSettings: false })
    const note = root().querySelector('[role="note"]')
    expect(note.classList.contains('ui-callout--warning')).toBe(true)
    expect(note.textContent).toContain(S.noSavedSettings)
  })
})

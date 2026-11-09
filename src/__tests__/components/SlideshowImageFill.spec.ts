// @vitest-environment jsdom
// Charakterisierung von „Eigenes Bild als Fläche“ in der Slideshow (Canvas und
// Workspace). Zugriff über Beschriftungen und Rollen statt CSS-Klassen, damit
// die Tests den Wechsel auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import SlideshowImageFill from '../../components/foto-panel/slideshow/SlideshowImageFill.vue'
import {
  SLIDESHOW_IMAGE_FILL_DEFAULT,
  type SlideshowImageFill as ImageFill,
  type SlideshowImageFillAudio,
} from '../../lib/slideshowImageFill'
import type { ImageFillCandidateItem } from '../../components/foto-panel/slideshow/useSlideshowImageFills'
import { stub } from '../helpers/canvasStubs'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const S = de.slideshow
const candidates = [
  { id: 'u1', name: 'urlaub.jpg', thumb: 'data:,u', source: 'upload', raw: { id: 'u1' } },
  { id: 's1', name: 'Wald', thumb: 'data:,s', source: 'stock', raw: { id: 's1' } },
]
let wrapper: VueWrapper | null

function fillOf(
  over: Partial<Omit<ImageFill, 'audio'>> & { audio?: Partial<SlideshowImageFillAudio> } = {},
) {
  return {
    ...SLIDESHOW_IMAGE_FILL_DEFAULT,
    enabled: true,
    ...over,
    audio: { ...SLIDESHOW_IMAGE_FILL_DEFAULT.audio, ...(over.audio || {}) },
  }
}

function mountFill(props = {}) {
  wrapper = mount(SlideshowImageFill, {
    attachTo: document.body,
    props: { fill: fillOf(), candidates: stub<ImageFillCandidateItem[]>(candidates), ...props },
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
const buttons = () => [...root().querySelectorAll('button')]
const button = (name: string) => buttons().find((b) => b.textContent.trim() === name)
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
/** Auswahl über ihre Beschriftung (umschließendes Label oder label[for]). */
function selectNamed(name: string) {
  const label = [...root().querySelectorAll('label')].find(
    (l) => l.textContent.trim().startsWith(name) || l.querySelector('span')?.textContent === name,
  )
  return label.querySelector('select') ?? document.getElementById(label.htmlFor)
}
const lastUpdate = () => wrapper!.emitted<[Partial<ImageFill>]>('update')?.at(-1)?.[0]

describe('Bild als Fläche – Schalter', () => {
  it('aus: nur der Schalter, keine Optionen', () => {
    mountFill({ fill: fillOf({ enabled: false }) })
    expect(isOn(toggle(S.imageFill))).toBe(false)
    expect(button(S.imageFillChoose)).toBeUndefined()
    expect(text()).not.toContain(S.imageFillFit)
  })

  it('Umschalten meldet enabled', async () => {
    mountFill({ fill: fillOf({ enabled: false }) })
    toggle(S.imageFill).click()
    await nextTick()
    expect(lastUpdate()).toEqual({ enabled: true })
  })

  it('gesperrt: Schalter und Knöpfe deaktiviert', () => {
    mountFill({ disabled: true })
    expect(toggle(S.imageFill).disabled).toBe(true)
    expect(button(S.imageFillChoose).disabled).toBe(true)
  })
})

describe('Bild als Fläche – Bild wählen', () => {
  it('ohne Bild: „Kein Bild gewählt“, beim Laden Ladehinweis', async () => {
    mountFill()
    expect(text()).toContain(S.imageFillNone)
    expect(button(S.imageFillRemove)).toBeUndefined()
    await wrapper!.setProps({ loading: true })
    expect(text()).toContain(S.imageFillLoading)
  })

  it('mit Bild: Vorschau, Name und „Entfernen“', () => {
    mountFill({ thumb: 'data:,t', fill: fillOf({ upload: { key: 'k', name: 'mein.png' } }) })
    expect(root().querySelector('img[src="data:,t"]')).toBeTruthy()
    expect(text()).toContain('mein.png')
    button(S.imageFillRemove).click()
    expect(wrapper!.emitted('clear')).toHaveLength(1)
  })

  it('„Bild wählen“ klappt die Auswahl auf, Klick wählt und schließt', async () => {
    mountFill()
    const choose = button(S.imageFillChoose)
    expect(choose.getAttribute('aria-expanded')).toBe('false')
    choose.click()
    await nextTick()
    expect(choose.getAttribute('aria-expanded')).toBe('true')
    const opt = buttons().find((b) => b.getAttribute('aria-label') === 'Wald')
    expect(opt.querySelector('img').getAttribute('src')).toBe('data:,s')
    opt.click()
    await nextTick()
    expect(wrapper!.emitted('select')![0]).toEqual([{ id: 's1' }])
    expect(buttons().find((b) => b.getAttribute('aria-label') === 'Wald')).toBeUndefined()
  })

  it('keine Bilder: Hinweis in der Auswahl', async () => {
    mountFill({ candidates: [] })
    button(S.imageFillChoose).click()
    await nextTick()
    expect(text()).toContain(S.imageFillNoImages)
  })
})

describe('Bild als Fläche – Darstellung und Audio', () => {
  it('Darstellung Füllen/Einpassen meldet fit', async () => {
    mountFill()
    const sel = selectNamed(S.imageFillFit)
    expect([...sel.options].map((o) => o.textContent.trim())).toEqual([
      S.imageFillCover,
      S.imageFillContain,
    ])
    sel.value = 'contain'
    sel.dispatchEvent(new Event('change'))
    await nextTick()
    expect(lastUpdate()).toEqual({ fit: 'contain' })
  })

  it('Audio-reaktiv zeigt Quelle und drei Regler, Änderungen ergänzen audio', async () => {
    mountFill()
    expect(text()).not.toContain(S.imageFillZoom)
    toggle(S.imageFillAudio).click()
    await nextTick()
    expect(lastUpdate()!.audio).toMatchObject({ enabled: true, source: 'bass' })
    await wrapper!.setProps({ fill: fillOf({ audio: { enabled: true } }) })
    expect(text()).toContain(S.gradientAudioSource)
    expect(text()).toContain(S.fillAudioBrightness)
    expect(text()).toContain(S.fillAudioHue)
    expect(text()).toContain(S.imageFillZoom)
    const ranges = [...root().querySelectorAll('input[type="range"]')]
    expect(ranges).toHaveLength(3)
    ranges[2].value = '90'
    ranges[2].dispatchEvent(new Event('input'))
    await nextTick()
    expect(lastUpdate()!.audio).toMatchObject({ enabled: true, zoom: 90, brightness: 60 })
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountFill()
      expect(text()).toContain(en.slideshow.imageFill)
      expect(button(en.slideshow.imageFillChoose)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Bild als Fläche – Ui-Bausteine', () => {
  it('Schalter sind Switches, keine Checkboxen', async () => {
    mountFill({ fill: fillOf({ audio: { enabled: true } }) })
    for (const n of [S.imageFill, S.imageFillAudio]) {
      expect(toggle(n).getAttribute('role'), n).toBe('switch')
    }
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('Knöpfe sind Ui-Buttons, Darstellung Ui-Select, Auswahl ohne Glyphen', async () => {
    mountFill({ thumb: 'data:,t', fill: fillOf({ upload: { key: 'k', name: 'mein.png' } }) })
    for (const n of [S.imageFillChoose, S.imageFillRemove]) {
      expect(button(n).classList.contains('ui-button'), n).toBe(true)
    }
    expect(selectNamed(S.imageFillFit).closest('.ui-select')).toBeTruthy()
    button(S.imageFillChoose).click()
    await nextTick()
    const group = root().querySelector('[role="group"]')
    expect(group.getAttribute('aria-label')).toBe(S.imageFillChoose)
    expect(text()).not.toMatch(/[🗂⬆]/u)
  })
})

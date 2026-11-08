// @vitest-environment jsdom
// Charakterisierung der Slideshow-Steuerung (Start/Pause/Fortsetzen/Stopp und
// Fortschritt). Zugriff über Texte statt CSS-Klassen, damit die Tests den
// Wechsel auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import SlideshowControls from '../../components/foto-panel/slideshow/SlideshowControls.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const S = de.slideshow
let wrapper

function mountControls(props = {}) {
  wrapper = mount(SlideshowControls, { attachTo: document.body, props })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ').trim()
const buttons = () => [...root().querySelectorAll('button')]
const names = () => buttons().map((b) => b.textContent.trim())
const button = (name) => buttons().find((b) => b.textContent.trim() === name)

describe('Slideshow-Steuerung – Knöpfe', () => {
  it('bereit: nur „Slideshow starten“, ohne Fortschritt', () => {
    mountControls()
    expect(names()).toEqual([S.start])
    expect(text()).not.toContain(S.image)
  })

  it('Start erst ab zwei Bildern (canStart)', () => {
    mountControls({ canStart: false })
    expect(button(S.start).disabled).toBe(true)
    button(S.start).click()
    expect(wrapper.emitted('start')).toBeUndefined()
  })

  it('Start meldet start', () => {
    mountControls()
    button(S.start).click()
    expect(wrapper.emitted('start')).toHaveLength(1)
  })

  it('läuft: Pause und Stoppen', () => {
    mountControls({ isActive: true })
    expect(names()).toEqual([S.pause, S.stop])
    button(S.pause).click()
    button(S.stop).click()
    expect(wrapper.emitted('pause')).toHaveLength(1)
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  it('pausiert: Fortsetzen und Stoppen', () => {
    mountControls({ isActive: true, isPaused: true })
    expect(names()).toEqual([S.resume, S.stop])
    button(S.resume).click()
    expect(wrapper.emitted('resume')).toHaveLength(1)
  })
})

describe('Slideshow-Steuerung – Fortschritt', () => {
  it('zeigt Bildnummer, Gesamtzahl und Phase', () => {
    mountControls({ isActive: true, currentImageIndex: 2, totalImages: 7, currentPhase: 'display' })
    expect(text()).toContain(`${S.image} 3 / 7`)
    expect(text()).toContain('Anzeige')
  })

  it('Phasen: Einblenden, Anzeige, Ausblenden; unbekannt leer', async () => {
    mountControls({ isActive: true, totalImages: 3 })
    expect(text()).toContain('Einblenden')
    await wrapper.setProps({ currentPhase: 'fadeOut' })
    expect(text()).toContain('Ausblenden')
    await wrapper.setProps({ currentPhase: 'idle' })
    for (const phase of ['Einblenden', 'Anzeige', 'Ausblenden']) {
      expect(text()).not.toContain(phase)
    }
    expect(text()).toContain(`${S.image} 1 / 3`)
  })
})

describe('Slideshow-Steuerung – Sprache', () => {
  it('Knöpfe und Phasen folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountControls({ isActive: true, totalImages: 2, currentPhase: 'fadeOut' })
      expect(names()).toEqual([en.slideshow.pause, en.slideshow.stop])
      expect(text()).toContain('Fading Out')
    } finally {
      await setLocale('de')
    }
  })
})

describe('Slideshow-Steuerung – Ui-Bausteine', () => {
  it('Start primär, Pause/Fortsetzen secondary, Stoppen danger', async () => {
    mountControls()
    expect(button(S.start).classList.contains('ui-button--primary')).toBe(true)
    await wrapper.setProps({ isActive: true })
    expect(button(S.pause).classList.contains('ui-button--secondary')).toBe(true)
    expect(button(S.stop).classList.contains('ui-button--danger')).toBe(true)
    await wrapper.setProps({ isPaused: true })
    expect(button(S.resume).classList.contains('ui-button--secondary')).toBe(true)
  })

  it('Phasen-Texte aus i18n (DE und EN)', () => {
    for (const k of ['fadeIn', 'display', 'fadeOut']) {
      expect(S.phases[k]).toBeTruthy()
      expect(en.slideshow.phases[k]).toBeTruthy()
    }
    const src = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../components/foto-panel/slideshow/SlideshowControls.vue',
      ),
      'utf8',
    )
    expect(src).not.toMatch(/locale\.value === 'de'/)
  })

  it('Phase als neutraler Text mit farbigem Punkt (lesbar in beiden Themes)', () => {
    const src = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../components/foto-panel/slideshow/SlideshowControls.vue',
      ),
      'utf8',
    )
    expect(src).not.toMatch(/color:\s*#fff/)
    expect(src).toMatch(/\.phase-indicator::before/)
  })
})

/**
 * Funktionen-Seite (/blog): Inhalte vollständig aus i18n, DE und EN gleich
 * aufgebaut, alle wichtigen Funktionen (inkl. Slideshow) erfasst, Zahlen
 * passend zum Code, Navigation im eigenen Scroll-Container.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'
import { setLocale } from '../../lib/i18n.js'
import { SLIDESHOW_TRANSITIONS } from '../../lib/slideshowTransitions.js'
import BlogPage from '../../components/BlogPage.vue'

const shape = (o) => JSON.stringify(o, (k, v) => (typeof v === 'string' ? '' : v))

let wrapper
afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  await setLocale('de')
})

function mountPage() {
  wrapper = mount(BlogPage, {
    attachTo: document.body,
    global: { stubs: { 'router-link': { template: '<a><slot /></a>' }, teleport: true } },
  })
  return wrapper
}

describe('Funktionen-Seite – Inhalte', () => {
  it('DE und EN haben identische Struktur', () => {
    expect(shape(de.blog)).toBe(shape(en.blog))
  })

  it('erfasst alle wichtigen Funktionsbereiche, Slideshow als neu markiert', () => {
    const ids = de.blog.sections.map((s) => s.id)
    for (const id of [
      'audio',
      'visualizers',
      'layers',
      'text',
      'ticker',
      'images',
      'slideshow',
      'background',
      'video',
      'presets',
      'reactivity',
      'recording',
      'screenshot',
      'workflow',
      'shortcuts',
    ]) {
      expect(ids, id).toContain(id)
    }
    expect(new Set(ids).size).toBe(ids.length)
    expect(de.blog.sections.find((s) => s.id === 'slideshow').isNew).toBe(true)
    // Übersichtskarten verweisen auf vorhandene Abschnitte
    for (const card of de.blog.overview) expect(ids).toContain(card.id)
  })

  it('Slideshow-Übergänge entsprechen dem Code (Anzahl und Bezeichnungen)', () => {
    for (const lang of [de, en]) {
      const tags = lang.blog.sections.find((s) => s.id === 'slideshow').tags.items
      expect(tags).toEqual(SLIDESHOW_TRANSITIONS.map((tr) => lang.slideshow.transitions[tr.id]))
    }
    const stat = de.blog.stats.find((s) => /Übergänge/.test(s.label))
    expect(Number(stat.value)).toBe(SLIDESHOW_TRANSITIONS.length)
  })

  it('keine Umlaut-Ersatzschreibweisen im deutschen Text', () => {
    const text = JSON.stringify(de.blog)
    expect(text).not.toMatch(
      /Uberblick|\bfur\b|Vollstandig|Unterstutz|Lautstark|Grosse\b|Ruckgangig|Qualitat\b/,
    )
  })
})

describe('Funktionen-Seite – Darstellung', () => {
  it('rendert Kennzahlen, Karten, Inhaltsverzeichnis und alle Abschnitte aus i18n', async () => {
    const w = mountPage()
    await nextTick()
    expect(w.findAll('.stat-item')).toHaveLength(de.blog.stats.length)
    expect(w.findAll('.stat-divider')).toHaveLength(de.blog.stats.length - 1)
    expect(w.findAll('.overview-card')).toHaveLength(de.blog.overview.length)
    expect(w.findAll('.toc-link').map((l) => l.text())).toEqual(de.blog.sections.map((s) => s.nav))
    const sections = w.findAll('.blog-section[id]')
    expect(sections.map((s) => s.attributes('id'))).toEqual(de.blog.sections.map((s) => s.id))
    // jedes Abschnitts-Icon ist ein SVG
    for (const s of sections) expect(s.find('.section-icon svg').exists()).toBe(true)
    const slideshow = w.find('#slideshow')
    expect(slideshow.find('.new-badge').text()).toBe('Neu')
    expect(slideshow.findAll('.preset-pill')).toHaveLength(SLIDESHOW_TRANSITIONS.length)
    expect(w.find('#shortcuts').findAll('.shortcut-item').length).toBeGreaterThan(10)
  })

  it('wechselt vollständig auf Englisch', async () => {
    const w = mountPage()
    await setLocale('en')
    await flushPromises()
    expect(w.find('.hero-badge').text()).toContain('All features at a glance')
    expect(w.find('.toc-title').text()).toBe('Contents')
    expect(w.findAll('.toc-link').map((l) => l.text())).toEqual(en.blog.sections.map((s) => s.nav))
    expect(w.find('#slideshow .new-badge').text()).toBe('New')
  })

  it('Sprung aus Karte/Inhaltsverzeichnis nutzt den eigenen Scroll-Container der Seite', async () => {
    const w = mountPage()
    const page = w.element
    Object.defineProperty(page, 'scrollHeight', { configurable: true, value: 5000 })
    Object.defineProperty(page, 'clientHeight', { configurable: true, value: 800 })
    page.scrollTop = 200
    const calls = []
    page.scrollTo = (opts) => calls.push(opts)
    const target = page.querySelector('#slideshow')
    target.getBoundingClientRect = () => ({ top: 1000, bottom: 1400, left: 0, right: 0 })
    await w.find('.overview-card[href="#slideshow"]').trigger('click')
    expect(calls).toEqual([{ top: 200 + 1000 - 110, behavior: 'smooth' }])
    await w.find('.toc-link[href="#slideshow"]').trigger('click')
    expect(calls).toHaveLength(2)
  })
})

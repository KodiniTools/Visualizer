import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LandingPage from '../../components/LandingPage.vue'
import { setLocale } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

// Hero-Visual der Landing-Page: Live-Vorschau ausgewählter Visualizer.
const stubs = { AdminPanel: true, LoginModal: true }

let wrapper: VueWrapper

async function mountLanding() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: LandingPage },
      { path: '/app', component: { template: '<div />' } },
      { path: '/blog', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  wrapper = mount(LandingPage, { global: { plugins: [router], stubs } })
  await flushPromises()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline'))),
  )
  await setLocale('de')
  await mountLanding()
})

afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('LandingPage – Hero-Visual', () => {
  it('zeigt die Live-Vorschau im Bildrahmen statt eines statischen Bilds', () => {
    expect(wrapper.find('.lp-hero-media .hero-showcase').exists()).toBe(true)
    expect(wrapper.find('.lp-hero-media canvas').exists()).toBe(true)
    expect(wrapper.find('.lp-hero-media img').exists()).toBe(false)
  })

  it('beschriftet die Vorschau passend zur Sprache', async () => {
    const fig = () => wrapper.find('.hero-showcase')
    expect(fig().attributes('aria-label')).toBe(de.hero.showcase.label)

    await setLocale('en')
    await flushPromises()
    expect(fig().attributes('aria-label')).toBe(en.hero.showcase.label)
  })
})

describe('LandingPage – Hero und Vorteile nach Muster Audio Normalizer', () => {
  it('Hero: Titel, Cyan-Unterzeile, Beschreibung (DE/EN)', async () => {
    expect(wrapper.find('h1.lp-hero-title').text()).toBe(de.hero.badge)
    expect(wrapper.find('.lp-hero-subtitle').text()).toBe(de.hero.tagline)
    expect(wrapper.find('.lp-hero-description').text()).toBe(de.hero.subtitle)
    await setLocale('en')
    await flushPromises()
    expect(wrapper.find('.lp-hero-subtitle').text()).toBe(en.hero.tagline)
    expect(wrapper.find('.lp-hero-description').text()).toBe(en.hero.subtitle)
  })

  it('Hero-Titel zweifarbig: erstes Wort Gold, Rest Blau, Text unverändert', async () => {
    const h1 = wrapper.find('h1.lp-hero-title')
    expect(h1.text()).toBe(de.hero.badge)
    expect(h1.find('.lp-hero-title-gold').text()).toBe('Audio')
    expect(h1.find('.lp-hero-title-blue').text()).toBe('Visualizer')
    await setLocale('en')
    await flushPromises()
    expect(wrapper.find('h1.lp-hero-title').text()).toBe(en.hero.badge)
  })

  it('Vorteile: sechs Karten in DE und EN', async () => {
    const titles = () => wrapper.findAll('.lp-benefit-card h3').map((h) => h.text())
    expect(wrapper.find('.lp-benefits .lp-section-title').text()).toBe(de.benefits.title)
    expect(titles()).toEqual(de.benefits.items.map((i) => i.title))
    expect(titles()).toHaveLength(6)
    await setLocale('en')
    await flushPromises()
    expect(wrapper.find('.lp-benefits .lp-section-title').text()).toBe(en.benefits.title)
    expect(titles()).toEqual(en.benefits.items.map((i) => i.title))
  })
})

describe('LandingPage – Podcast-Abschnitt', () => {
  it('zeigt den Podcast-Text statt des Tutorial-Texts und ein beschriebenes Bild', async () => {
    const section = () => wrapper.find('.video-section')
    expect(section().find('.section-title').text()).toBe(de.video.title)
    expect(section().find('.section-subtitle').text()).toBe(de.video.subtitle)
    expect(section().find('img').attributes('alt')).toBe(de.video.imageAlt)
    expect(de.video.title).not.toMatch(/funktioniert/)

    await setLocale('en')
    await flushPromises()
    expect(section().find('.section-title').text()).toBe(en.video.title)
    expect(section().find('img').attributes('alt')).toBe(en.video.imageAlt)
  })
})

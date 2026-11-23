// @vitest-environment jsdom
// Navigation im Kopf der Landing-Page. Regression: „Startseite“ tat auf der
// Startseite nichts (gleiche Route, und gescrollt wird in `.landing-page`,
// nicht im Fenster); ein Sprung zum FAQ-Abschnitt fehlte.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LandingPage from '../../components/LandingPage.vue'
import { setLocale } from '../../lib/i18n'

const stubs = { AdminPanel: true, LoginModal: true, HeroVisualizerShowcase: true }

let wrapper: VueWrapper
let pageScroll: ReturnType<typeof vi.fn>

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline'))),
  )
  vi.stubGlobal('scrollTo', vi.fn())
  await setLocale('de')
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
  pageScroll = vi.fn()
  ;(wrapper.element as HTMLElement).scrollTo = pageScroll as unknown as HTMLElement['scrollTo']
})

afterEach(async () => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
  await setLocale('de')
})

const navTexts = () => wrapper.findAll('.header-nav .nav-link').map((l) => l.text())

describe('LandingPage – Kopf-Navigation', () => {
  it('Reihenfolge: Startseite, Funktionen, FAQ, Blog', () => {
    expect(navTexts()).toEqual(['Startseite', 'Funktionen', 'FAQ', 'Blog'])
  })

  it('„Startseite“ scrollt die Seite nach oben', async () => {
    await wrapper.find('.header-nav .nav-link').trigger('click')
    expect(pageScroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  // Seit Landingpage Etappe 2 springt „Funktionen“ zum Abschnitt auf der Seite statt nach /blog.
  it('„Funktionen“ springt zum Abschnitt #features', () => {
    expect(wrapper.findAll('.header-nav .nav-link')[1]!.attributes('href')).toBe('#features')
  })

  // Kodini 22.11.2026: Logo und Schriftzug kommen aus der globalen SSI-Navigation.
  it('Kopfzeile zeigt kein eigenes Logo und keinen Schriftzug', () => {
    const header = wrapper.find('.landing-header')
    expect(header.find('img').exists()).toBe(false)
    expect(header.find('.header-logo').exists()).toBe(false)
    expect(header.text()).not.toContain('KodiniTools')
  })

  it('Start-Knopf im Kopf führt zur App', () => {
    const cta = wrapper.find('.landing-header .landing-header-cta')
    expect(cta.attributes('href')).toBe('/app')
    expect(wrapper.find('.lp-hero .lp-btn-hero').text()).toContain(cta.text())
  })

  it('„FAQ“ springt zum FAQ-Abschnitt, der die Fragen enthält', () => {
    expect(wrapper.find('a.nav-link[href="#faq"]').exists()).toBe(true)
    const section = wrapper.find('section#faq')
    expect(section.exists()).toBe(true)
    expect(section.findAll('.lp-faq-item').length).toBeGreaterThan(0)
  })

  it('FAQ: Frage ist ein Knopf, klappt die Antwort auf und wieder zu', async () => {
    const q = () => wrapper.find('.lp-faq-item .lp-faq-question')
    const answer = () => wrapper.find('.lp-faq-item .lp-faq-answer')
    expect(q().element.tagName).toBe('BUTTON')
    expect(q().attributes('aria-expanded')).toBe('false')
    const hidden = () => (answer().attributes('style') ?? '').includes('display: none')
    expect(hidden()).toBe(true)
    await q().trigger('click')
    expect(q().attributes('aria-expanded')).toBe('true')
    expect(hidden()).toBe(false)
    expect(q().find('.lp-faq-icon').text()).toBe('−')
    await q().trigger('click')
    expect(hidden()).toBe(true)
  })

  // Kodini 23.11.2026 (Muster Audio Normalizer): ein einziger Knopf im Hero.
  it('Hero hat genau einen Knopf, er führt zur App; #features existiert', () => {
    const buttons = wrapper.findAll('.lp-hero a, .lp-hero button:not(.hero-showcase-btn)')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]!.attributes('href')).toBe('/app')
    expect(wrapper.find('section#features').exists()).toBe(true)
  })

  it('EN: Home, Features, FAQ, Blog', async () => {
    await setLocale('en')
    await flushPromises()
    expect(navTexts()).toEqual(['Home', 'Features', 'FAQ', 'Blog'])
  })
})

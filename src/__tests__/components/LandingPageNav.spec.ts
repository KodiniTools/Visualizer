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

  it('„Funktionen“ führt zur Funktionsseite', () => {
    expect(wrapper.findAll('.header-nav .nav-link')[1]!.attributes('href')).toBe('/blog')
  })

  it('„FAQ“ springt zum FAQ-Abschnitt, der die Fragen enthält', () => {
    expect(wrapper.find('a.nav-link[href="#faq"]').exists()).toBe(true)
    const section = wrapper.find('section#faq')
    expect(section.exists()).toBe(true)
    expect(section.findAll('.faq-item').length).toBeGreaterThan(0)
  })

  it('Hero-Knöpfe: Start führt zur App, „Mehr erfahren“ zum Abschnitt #features', () => {
    expect(wrapper.find('.hero-actions .btn-primary').attributes('href')).toBe('/app')
    expect(wrapper.find('.hero-actions .btn-secondary').attributes('href')).toBe('#features')
    expect(wrapper.find('section#features').exists()).toBe(true)
  })

  it('EN: Home, Features, FAQ, Blog', async () => {
    await setLocale('en')
    await flushPromises()
    expect(navTexts()).toEqual(['Home', 'Features', 'FAQ', 'Blog'])
  })
})

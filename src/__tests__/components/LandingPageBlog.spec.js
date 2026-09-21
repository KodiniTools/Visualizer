import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LandingPage from '../../components/LandingPage.vue'
import { blogArticles } from '../../data/blogArticles.js'
import { setLocale } from '../../lib/i18n.js'

// Getestet wird nur der Blog-Abschnitt der Landing-Page. Admin-Komponenten
// werden gestubbt, Server-Aufrufe des Landing-Content-Stores schlagen fehl
// (der Store fängt das ab und nutzt die i18n-Standardtexte).
const stubs = { AdminPanel: true, LoginModal: true }

let wrapper
let router

async function mountLanding() {
  router = createRouter({
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
  vi.useRealTimers()
})

describe('LandingPage – Blog-Abschnitt', () => {
  it('rendert einen Abschnitt #blog mit einer Karte pro Beitrag', () => {
    const section = wrapper.find('section#blog')
    expect(section.exists()).toBe(true)
    expect(section.findAll('.blog-card')).toHaveLength(blogArticles.length)
  })

  it('verlinkt den Nav-Eintrag „Blog" auf den Abschnitt', () => {
    const navBlog = wrapper.find('a.nav-link[href="#blog"]')
    expect(navBlog.exists()).toBe(true)
    expect(navBlog.text()).toBe('Blog')
  })

  it('zeigt den neuesten Beitrag zuerst und öffnet Beiträge in neuem Tab', () => {
    const cards = wrapper.findAll('.blog-card')
    expect(cards[0].attributes('href')).toBe('https://kodinitools.com/blog/visualizer-effekte/')
    for (const card of cards) {
      expect(card.attributes('target')).toBe('_blank')
      expect(card.attributes('rel')).toContain('noopener')
      expect(card.find('img').attributes('src')).toMatch(/^https:\/\/kodinitools\.com\/image\//)
    }
  })

  it('zeigt deutsche Texte und Datumsformat', () => {
    const first = wrapper.find('.blog-card')
    expect(first.find('.blog-card-title').text()).toBe(blogArticles[0].title.de)
    expect(first.find('.blog-card-meta').text()).toBe('21. September 2026 · 7 Min.')
    expect(first.find('.blog-card-link').text()).toBe('Artikel lesen')
  })

  it('wechselt bei Sprachumschaltung auf englische Texte, URLs und Datumsformat', async () => {
    await setLocale('en')
    await flushPromises()
    const first = wrapper.find('.blog-card')
    expect(first.attributes('href')).toBe('https://kodinitools.com/en/blog/visualizer-effects/')
    expect(first.find('.blog-card-title').text()).toBe(blogArticles[0].title.en)
    expect(first.find('.blog-card-meta').text()).toBe('September 21, 2026 · 7 min')
    expect(first.find('.blog-card-link').text()).toBe('Read article')
  })
})

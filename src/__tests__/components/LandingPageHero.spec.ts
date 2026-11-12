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
  it('zeigt die Live-Vorschau statt des statischen Bilds', () => {
    expect(wrapper.find('.hero-visual .hero-showcase').exists()).toBe(true)
    expect(wrapper.find('.hero-visual canvas').exists()).toBe(true)
    expect(wrapper.find('.hero-visual img').exists()).toBe(false)
  })

  it('beschriftet die Vorschau passend zur Sprache', async () => {
    const fig = () => wrapper.find('.hero-showcase')
    expect(fig().attributes('aria-label')).toBe(de.hero.showcase.label)

    await setLocale('en')
    await flushPromises()
    expect(fig().attributes('aria-label')).toBe(en.hero.showcase.label)
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LandingPage from '../../components/LandingPage.vue'
import { setLocale } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

// Hero-Visual der Landing-Page: statisches Bild statt animierter Balken.
const stubs = { AdminPanel: true, LoginModal: true }

let wrapper

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

describe('LandingPage – Hero-Bild', () => {
  it('zeigt visualizer.webp statt der Balken-Animation', () => {
    const img = wrapper.find('.hero-visual img.hero-image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toMatch(/visualizer\.webp$/)
    expect(img.attributes('width')).toBe('1200')
    expect(img.attributes('height')).toBe('670')
    expect(wrapper.find('.wave-bar').exists()).toBe(false)
    expect(wrapper.find('.visualizer-preview').exists()).toBe(false)
  })

  it('setzt den alt-Text passend zur Sprache', async () => {
    const img = () => wrapper.find('.hero-image')
    expect(de.hero.imageAlt).toBeTruthy()
    expect(img().attributes('alt')).toBe(de.hero.imageAlt)

    await setLocale('en')
    await flushPromises()
    expect(en.hero.imageAlt).toBeTruthy()
    expect(img().attributes('alt')).toBe(en.hero.imageAlt)
  })
})

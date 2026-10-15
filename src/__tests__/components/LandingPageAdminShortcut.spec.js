import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LandingPage from '../../components/LandingPage.vue'
import { setLocale } from '../../lib/i18n.js'

// Admin-Zugang der Landing-Page: kein sichtbarer Button, nur Ctrl+Alt+Shift+V.
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
  wrapper = mount(LandingPage, { global: { plugins: [router], stubs }, attachTo: document.body })
  await flushPromises()
}

function press(init) {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  return flushPromises()
}

const SHORTCUT = { code: 'KeyV', key: 'V', ctrlKey: true, altKey: true, shiftKey: true }

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline'))),
  )
  await setLocale('de')
})

afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('LandingPage – Admin-Tastenkürzel', () => {
  it('zeigt keinen Admin-Button mehr', async () => {
    await mountLanding()
    expect(wrapper.find('.admin-fab').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Admin')
  })

  it('öffnet den Login mit Ctrl+Alt+Shift+V', async () => {
    await mountLanding()
    expect(wrapper.findComponent({ name: 'LoginModal' }).exists()).toBe(false)
    await press(SHORTCUT)
    expect(wrapper.findComponent({ name: 'LoginModal' }).exists()).toBe(true)
  })

  it('reagiert nicht auf unvollständige Kombinationen oder Wiederholungen', async () => {
    await mountLanding()
    await press({ ...SHORTCUT, shiftKey: false })
    await press({ ...SHORTCUT, altKey: false })
    await press({ ...SHORTCUT, ctrlKey: false })
    await press({ ...SHORTCUT, code: 'KeyB' })
    await press({ ...SHORTCUT, metaKey: true })
    await press({ ...SHORTCUT, repeat: true })
    expect(wrapper.findComponent({ name: 'LoginModal' }).exists()).toBe(false)
  })

  it('schaltet eingeloggt den Bearbeitungs-Drawer um und schließt ihn per ✕', async () => {
    localStorage.setItem('visualizer_auth_token', 'test-token')
    await mountLanding()
    expect(wrapper.find('.admin-drawer').exists()).toBe(false)

    await press(SHORTCUT)
    expect(wrapper.find('.admin-drawer').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LoginModal' }).exists()).toBe(false)

    await press(SHORTCUT)
    expect(wrapper.find('.admin-drawer').exists()).toBe(false)

    await press(SHORTCUT)
    await wrapper.find('.admin-drawer-bar button').trigger('click')
    expect(wrapper.find('.admin-drawer').exists()).toBe(false)
  })

  it('entfernt den Listener beim Unmount', async () => {
    await mountLanding()
    wrapper.unmount()
    wrapper = null
    const spy = vi.spyOn(window, 'removeEventListener')
    await mountLanding()
    wrapper.unmount()
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
    spy.mockRestore()
    wrapper = null
  })
})

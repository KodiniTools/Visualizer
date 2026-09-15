import { describe, it, expect, afterEach } from 'vitest'
import { KeepAlive } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../App.vue'

// App.vue ist nur ein Wrapper um router-view + keep-alive. Getestet wird mit
// einem Test-Router und Stub-Seiten, damit die echten Seiten (Canvas, Audio)
// nicht geladen werden müssen.
const HomeStub = { name: 'HomeStub', template: '<h1>Home-Seite</h1>' }
const OtherStub = { name: 'OtherStub', template: '<h1>Andere Seite</h1>' }

let wrapper
afterEach(() => wrapper?.unmount())

async function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeStub },
      { path: '/other', component: OtherStub },
    ],
  })
  await router.push('/')
  await router.isReady()

  wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
  return { wrapper, router }
}

describe('App', () => {
  it('rendert die aktive Route über router-view', async () => {
    const { wrapper } = await mountApp()
    expect(wrapper.text()).toContain('Home-Seite')
  })

  it('wechselt bei Navigation die gerenderte Seite', async () => {
    const { wrapper, router } = await mountApp()
    await router.push('/other')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Andere Seite')
    expect(wrapper.text()).not.toContain('Home-Seite')
  })

  it('cached ausschließlich VisualizerApp per keep-alive', async () => {
    const { wrapper } = await mountApp()
    const keepAlive = wrapper.findComponent(KeepAlive)
    expect(keepAlive.exists()).toBe(true)
    expect(keepAlive.props('include')).toEqual(['VisualizerApp'])
  })
})

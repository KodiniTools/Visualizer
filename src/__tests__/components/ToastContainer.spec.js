// @vitest-environment jsdom
// Toast-Container und toastStore: Anzeige je Typ, Schließen, Aktion,
// automatisches Ausblenden, Stapel mit Zähler (max. 5 sichtbar).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ToastContainer from '../../components/ToastContainer.vue'
import { useToastStore } from '../../stores/toastStore'
import de from '../../lib/i18n/de'

let wrapper
let toasts

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  toasts = useToastStore()
  wrapper = mount(ToastContainer, { attachTo: document.body })
})

afterEach(() => {
  wrapper.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const items = () => [...document.querySelectorAll('.toast')]

describe('ToastContainer', () => {
  it('zeigt Nachricht, Titel und Typ', async () => {
    toasts.error('Kaputt', { title: 'Fehler' })
    await nextTick()
    const [toast] = items()
    expect(toast.classList).toContain('toast--error')
    expect(toast.getAttribute('role')).toBe('alert')
    expect(toast.querySelector('.toast__title').textContent).toBe('Fehler')
    expect(toast.querySelector('.toast__message').textContent).toBe('Kaputt')
  })

  it('verschwindet nach der Dauer, Dauer 0 bleibt stehen', async () => {
    toasts.success('Kurz', { duration: 1000 })
    toasts.info('Bleibt', { duration: 0 })
    await nextTick()
    expect(items()).toHaveLength(2)
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(toasts.activeToasts.map((t) => t.message)).toEqual(['Bleibt'])
  })

  it('Schließen-Knopf nur, wenn schließbar', async () => {
    toasts.info('Fest', { duration: 0, dismissible: false })
    toasts.info('Weg', { duration: 0 })
    await nextTick()
    const close = document.querySelectorAll(`button[aria-label="${de.common.close}"]`)
    expect(close).toHaveLength(1)
    close[0].click()
    await nextTick()
    expect(toasts.activeToasts.map((t) => t.message)).toEqual(['Fest'])
  })

  it('Aktion ruft den Handler und schließt den Toast', async () => {
    const handler = vi.fn()
    toasts.warning('Rückgängig?', { duration: 0, action: { label: 'Ja', handler } })
    await nextTick()
    const btn = [...document.querySelectorAll('.toast button')].find(
      (b) => b.textContent.trim() === 'Ja',
    )
    btn.click()
    await nextTick()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(toasts.activeToasts).toHaveLength(0)
  })

  it('neuester oben, höchstens 5 sichtbar, Zähler ab 2', async () => {
    for (let i = 1; i <= 7; i++) toasts.info(`T${i}`, { duration: 0 })
    await nextTick()
    expect(items()).toHaveLength(5)
    expect(items()[0].textContent).toContain('T7')
    expect(document.querySelector('.toast-stack-badge').textContent).toBe('7')
    toasts.clearAll()
    toasts.info('allein', { duration: 0 })
    await nextTick()
    expect(document.querySelector('.toast-stack-badge')).toBeNull()
  })
})

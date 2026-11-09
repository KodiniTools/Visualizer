// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import HelpTooltip from '../../components/HelpTooltip.vue'
import { stub } from '../helpers/canvasStubs'

let wrapper: VueWrapper<InstanceType<typeof HelpTooltip>> | null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('HelpTooltip', () => {
  it('zeigt den Tooltip nach der Verzögerung beim Hovern (echtes Event, currentTarget danach null)', async () => {
    vi.useFakeTimers()
    wrapper = mount(HelpTooltip, {
      props: { title: 'Titel', text: 'Hilfetext', position: 'bottom', delay: 300 },
      attachTo: document.body,
    })
    const el = wrapper.find('.tooltip-wrapper').element
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
      stub({
        left: 100,
        top: 50,
        right: 120,
        bottom: 70,
        width: 20,
        height: 20,
      }),
    )
    // Echtes Event: currentTarget ist nur während des Dispatch gesetzt
    el.dispatchEvent(new MouseEvent('mouseenter'))
    expect(() => vi.advanceTimersByTime(300)).not.toThrow()
    await nextTick()
    const tip = document.body.querySelector<HTMLElement>('.tooltip-content')
    expect(tip).not.toBeNull()
    expect(tip!.textContent).toContain('Hilfetext')
    expect(tip!.style.left).toBe('110px')
    expect(tip!.style.top).toBe('82px')

    el.dispatchEvent(new MouseEvent('mouseleave'))
    vi.advanceTimersByTime(100)
    await nextTick()
    expect((wrapper.vm as unknown as { isVisible: boolean }).isVisible).toBe(false)
  })

  it('verlassen vor Ablauf der Verzögerung zeigt nichts', async () => {
    vi.useFakeTimers()
    wrapper = mount(HelpTooltip, { props: { text: 'x' }, attachTo: document.body })
    const el = wrapper.find('.tooltip-wrapper').element
    el.dispatchEvent(new MouseEvent('mouseenter'))
    vi.advanceTimersByTime(100)
    el.dispatchEvent(new MouseEvent('mouseleave'))
    vi.advanceTimersByTime(500)
    await nextTick()
    expect(document.body.querySelector('.tooltip-content')).toBeNull()
  })
})

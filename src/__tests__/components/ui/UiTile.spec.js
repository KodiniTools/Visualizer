import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiTile from '../../../components/ui/UiTile.vue'

describe('UiTile', () => {
  it('braucht ein Label (aria-label und title) und rendert den Slot', () => {
    const wrapper = mount(UiTile, {
      props: { label: 'Stern hinzufügen' },
      slots: { default: '<svg class="icon"></svg>' },
    })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.attributes('aria-label')).toBe('Stern hinzufügen')
    expect(wrapper.attributes('title')).toBe('Stern hinzufügen')
    expect(wrapper.attributes('aria-pressed')).toBeUndefined()
    expect(wrapper.find('.icon').exists()).toBe(true)
    expect(wrapper.classes()).toContain('ui-tile--md')
  })

  it('wird mit pressed zum Umschalter, active markiert nur optisch', async () => {
    const wrapper = mount(UiTile, { props: { label: 'Stift', pressed: false } })
    expect(wrapper.attributes('aria-pressed')).toBe('false')
    expect(wrapper.classes()).not.toContain('ui-tile--active')
    await wrapper.setProps({ pressed: true })
    expect(wrapper.attributes('aria-pressed')).toBe('true')
    expect(wrapper.classes()).toContain('ui-tile--active')

    const active = mount(UiTile, { props: { label: 'Emoji', active: true, size: 'sm' } })
    expect(active.attributes('aria-pressed')).toBeUndefined()
    expect(active.classes()).toEqual(expect.arrayContaining(['ui-tile--active', 'ui-tile--sm']))
  })

  it('leitet Klicks weiter und sperrt deaktiviert', async () => {
    let clicks = 0
    const wrapper = mount(UiTile, { props: { label: 'A' }, attrs: { onClick: () => clicks++ } })
    await wrapper.trigger('click')
    expect(clicks).toBe(1)
    await wrapper.setProps({ disabled: true })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})

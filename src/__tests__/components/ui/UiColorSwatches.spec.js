import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiColorSwatches from '../../../components/ui/UiColorSwatches.vue'

describe('UiColorSwatches', () => {
  it('rendert ohne Farben nichts', () => {
    const wrapper = mount(UiColorSwatches, { props: { label: 'Zuletzt verwendet' } })
    expect(wrapper.find('.ui-swatches').exists()).toBe(false)
  })

  it('zeigt die Farben als Gruppe, markiert die aktuelle und meldet Klicks', async () => {
    const wrapper = mount(UiColorSwatches, {
      props: {
        label: 'Zuletzt verwendet',
        colors: ['#ff0000', '#00ff00'],
        modelValue: '#FF0000',
      },
    })
    expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe('Zuletzt verwendet')
    const swatches = wrapper.findAll('button')
    expect(swatches).toHaveLength(2)
    expect(swatches[0].attributes('aria-label')).toBe('Zuletzt verwendet: #ff0000')
    expect(swatches[0].attributes('aria-pressed')).toBe('true')
    expect(swatches[0].classes()).toContain('ui-swatches__swatch--active')
    expect(swatches[1].attributes('aria-pressed')).toBe('false')

    await swatches[1].trigger('click')
    expect(wrapper.emitted('pick')).toEqual([['#00ff00']])
  })
})

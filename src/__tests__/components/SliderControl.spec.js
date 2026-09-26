import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SliderControl from '../../components/ui/SliderControl.vue'

describe('SliderControl', () => {
  it('Aufbau wie die Bild-Filter: Label · Regler + Spinner + ↺ · Wert', async () => {
    const w = mount(SliderControl, {
      props: {
        label: 'Anzeigedauer',
        modelValue: 3000,
        min: 500,
        max: 30000,
        step: 500,
        defaultValue: 3000,
        valueText: '3.0s',
        inputClass: 'my-range',
      },
    })
    expect(w.classes()).toEqual(expect.arrayContaining(['control-group', 'slider']))
    expect(w.find('label').text()).toBe('Anzeigedauer')
    const range = w.find('input[type="range"]')
    expect(range.classes()).toContain('my-range')
    expect(range.attributes('aria-label')).toBe('Anzeigedauer')
    expect(w.find('input[type="number"]').exists()).toBe(true)
    expect(w.find('.slider-field__reset').exists()).toBe(true)
    expect(w.find('.slider-control__value').text()).toBe('3.0s')

    range.element.value = '5000'
    await range.trigger('input')
    expect(w.emitted('update:modelValue').at(-1)).toEqual([5000])
  })
})

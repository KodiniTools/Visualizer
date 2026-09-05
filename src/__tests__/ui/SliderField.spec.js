// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SliderField from '../../components/ui/SliderField.vue'
import ScopedSliderHost from './fixtures/ScopedSliderHost.vue'

let wrapper
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountField(props = {}, attrs = {}) {
  wrapper = mount(SliderField, {
    props: { modelValue: 40, min: 0, max: 100, step: 1, defaultValue: 50, ...props },
    attrs,
  })
  return wrapper
}

function setInput(el, value, type = 'input') {
  el.value = value
  el.dispatchEvent(new Event(type, { bubbles: true }))
}

describe('SliderField', () => {
  it('renders range, spinner and reset button; forwards class/attrs to the range input', () => {
    const w = mountField({}, { class: 'slider', title: 'Speed', id: 'speed' })
    const range = w.find('input[type="range"]')
    expect(range.classes()).toContain('slider')
    expect(range.attributes('title')).toBe('Speed')
    expect(range.attributes('id')).toBe('speed')
    expect(range.element.value).toBe('40')
    expect(w.find('.slider-field').classes()).not.toContain('slider')
    expect(w.find('input[type="number"]').element.value).toBe('40')
    expect(w.find('button.slider-field__reset').exists()).toBe(true)
  })

  it('hides the reset button without defaultValue', () => {
    const w = mountField({ defaultValue: undefined })
    expect(w.find('button.slider-field__reset').exists()).toBe(false)
  })

  it('range input emits numbers live, start once and change on release', () => {
    const w = mountField()
    const range = w.find('input[type="range"]').element
    range.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    setInput(range, '55')
    setInput(range, '60')
    setInput(range, '60', 'change')
    expect(w.emitted('start')).toEqual([[40]])
    expect(w.emitted('update:modelValue')).toEqual([[55], [60]])
    expect(w.emitted('change')).toEqual([[60]])
  })

  it('spinner clamps into [min,max], rounds to step and ignores partial input', async () => {
    const w = mountField({ step: 0.1 })
    const num = w.find('input[type="number"]').element
    expect(num.value).toBe('40.0')
    setInput(num, '150')
    expect(w.emitted('update:modelValue').at(-1)).toEqual([100])
    setInput(num, '12.345')
    expect(w.emitted('update:modelValue').at(-1)).toEqual([12.3])
    const count = w.emitted('update:modelValue').length
    setInput(num, '')
    setInput(num, '-')
    setInput(num, 'abc')
    expect(w.emitted('update:modelValue')).toHaveLength(count)
    // Blur stellt die Anzeige auf den Modellwert zurück
    await w.setProps({ modelValue: 12.3 })
    num.dispatchEvent(new Event('blur'))
    expect(num.value).toBe('12.3')
  })

  it('reset emits start, update, change and reset with the default value', () => {
    const w = mountField()
    w.find('button.slider-field__reset').trigger('click')
    expect(w.emitted('start')).toEqual([[40]])
    expect(w.emitted('update:modelValue')).toEqual([[50]])
    expect(w.emitted('change')).toEqual([[50]])
    expect(w.emitted('reset')).toEqual([[50]])
  })

  it('disables the reset button when the value equals the default', async () => {
    const w = mountField({ modelValue: 50 })
    expect(w.find('button.slider-field__reset').attributes('disabled')).toBeDefined()
    await w.setProps({ modelValue: 51 })
    expect(w.find('button.slider-field__reset').attributes('disabled')).toBeUndefined()
  })

  it('accepts string model values and follows external updates', async () => {
    const w = mountField({ modelValue: '25' })
    expect(w.find('input[type="range"]').element.value).toBe('25')
    await w.setProps({ modelValue: 70 })
    expect(w.find('input[type="range"]').element.value).toBe('70')
    expect(w.find('input[type="number"]').element.value).toBe('70')
  })

  it('copies the parent scope attribute onto the range input so scoped parent CSS applies', () => {
    wrapper = mount(ScopedSliderHost)
    const host = wrapper.find('.host').element
    const scopeAttr = [...host.attributes].map((a) => a.name).find((n) => n.startsWith('data-v-'))
    expect(scopeAttr).toBeTruthy()
    const range = wrapper.find('input[type="range"]')
    expect(range.attributes(scopeAttr)).toBe('')
    expect(range.classes()).toContain('slider')

    // v-model + nachgestellter Handler: Modell ist zuerst aktualisiert
    setInput(range.element, '120')
    expect(wrapper.vm.value).toBe(120)
    expect(wrapper.vm.seen).toEqual([120])
  })
})

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import SliderField from '../../components/ui/SliderField.vue'
import ScopedSliderHost from './fixtures/ScopedSliderHost.vue'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountField(props = {}, attrs = {}) {
  const w = mount(SliderField, {
    props: { modelValue: 40, min: 0, max: 100, step: 1, defaultValue: 50, ...props },
    attrs,
  })
  wrapper = w
  return w
}

function setInput(el: Element | null | undefined, value: string, type = 'input') {
  if (!(el instanceof HTMLInputElement)) throw new Error('kein Eingabefeld')
  el.value = value
  el.dispatchEvent(new Event(type, { bubbles: true }))
}

describe('SliderField', () => {
  it('renders range, spinner and reset button; forwards class/attrs to the range input', () => {
    const w = mountField({}, { class: 'slider', title: 'Speed', id: 'speed' })
    const range = w.find<HTMLInputElement>('input[type="range"]')
    expect(range.classes()).toContain('slider')
    expect(range.attributes('title')).toBe('Speed')
    expect(range.attributes('id')).toBe('speed')
    expect(range.element.value).toBe('40')
    expect(w.find('.slider-field').classes()).not.toContain('slider')
    expect(w.find<HTMLInputElement>('input[type="number"]').element.value).toBe('40')
    expect(w.find('button.slider-field__reset').exists()).toBe(true)
  })

  it('hides the reset button without defaultValue', () => {
    const w = mountField({ defaultValue: undefined })
    expect(w.find('button.slider-field__reset').exists()).toBe(false)
  })

  it('range input emits numbers live, start once and change on release', () => {
    const w = mountField()
    const range = w.find<HTMLInputElement>('input[type="range"]').element
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
    const num = w.find<HTMLInputElement>('input[type="number"]').element
    expect(num.value).toBe('40.0')
    setInput(num, '150')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([100])
    setInput(num, '12.345')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([12.3])
    const count = w.emitted('update:modelValue')!.length
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
    expect(w.find<HTMLInputElement>('input[type="range"]').element.value).toBe('25')
    await w.setProps({ modelValue: 70 })
    expect(w.find<HTMLInputElement>('input[type="range"]').element.value).toBe('70')
    expect(w.find<HTMLInputElement>('input[type="number"]').element.value).toBe('70')
  })

  it('copies the parent scope attribute onto the range input so scoped parent CSS applies', () => {
    const sw = mount(ScopedSliderHost)
    wrapper = sw
    const host = sw.find('.host').element
    const scopeAttr = [...host.attributes].map((a) => a.name).find((n) => n.startsWith('data-v-'))
    expect(scopeAttr).toBeTruthy()
    const range = sw.find<HTMLInputElement>('input[type="range"]')
    expect(range.attributes(scopeAttr!)).toBe('')
    expect(range.classes()).toContain('slider')

    // v-model + nachgestellter Handler: Modell ist zuerst aktualisiert
    setInput(range.element, '120')
    expect(sw.vm.value).toBe(120)
    expect(sw.vm.seen).toEqual([120])
  })

  it('spinner steps do not flutter: the typed/stepped value survives the re-render', async () => {
    const sw = mount(ScopedSliderHost, { attachTo: document.body })
    wrapper = sw
    const num = sw.find<HTMLInputElement>('input[type="number"]').element
    num.focus()
    expect(num.value).toBe('80')
    // Zwei Spinner-Klicks (↑) hintereinander: 81, 82 – jeweils mit Re-Render dazwischen
    setInput(num, '81')
    await nextTick()
    expect(sw.vm.value).toBe(81)
    expect(num.value).toBe('81')
    setInput(num, '82')
    await nextTick()
    expect(sw.vm.value).toBe(82)
    expect(num.value).toBe('82')
    // Tippen unterhalb von min wird nicht während der Eingabe zurückgeschrieben …
    setInput(num, '-5')
    await nextTick()
    expect(sw.vm.value).toBe(0)
    expect(num.value).toBe('-5')
    // … erst beim Verlassen des Feldes normalisiert
    num.dispatchEvent(new Event('blur'))
    expect(num.value).toBe('0')
    // Externe Änderung ohne Fokus wird übernommen
    sw.vm.value = 33
    await nextTick()
    expect(num.value).toBe('33')
    document.body.innerHTML = ''
  })
})

describe('SliderField – zugänglicher Name', () => {
  const host = (labelNode: () => VNode, sliderAttrs = {}) =>
    defineComponent({
      render: () =>
        h('div', { class: 'control-group' }, [
          labelNode(),
          h(SliderField, { modelValue: 5, ...sliderAttrs }),
        ]),
    })

  it('verknüpft ein vorangestelltes <label> per aria-labelledby', async () => {
    wrapper = mount(
      host(() => h('label', 'Helligkeit')),
      { attachTo: document.body },
    )
    await nextTick()
    const range = wrapper.find<HTMLInputElement>('input[type="range"]').element
    const label = wrapper.find('label').element
    expect(label.id).toMatch(/^slider-label-/)
    expect(range.getAttribute('aria-labelledby')).toBe(label.id)
  })

  it('nutzt .label-text aus einem vorangestellten .modern-label', async () => {
    wrapper = mount(
      host(() =>
        h('div', { class: 'modern-label' }, [
          h('span', { class: 'label-text' }, 'Unschärfe'),
          h('span', { class: 'label-value' }, '3px'),
        ]),
      ),
      { attachTo: document.body },
    )
    await nextTick()
    const range = wrapper.find<HTMLInputElement>('input[type="range"]').element
    const text = wrapper.find('.label-text').element
    expect(range.getAttribute('aria-labelledby')).toBe(text.id)
  })

  it('lässt einen vom Aufrufer gesetzten Namen unverändert', async () => {
    wrapper = mount(
      host(() => h('label', 'Helligkeit'), { 'aria-label': 'Eigener Name' }),
      {
        attachTo: document.body,
      },
    )
    await nextTick()
    const range = wrapper.find<HTMLInputElement>('input[type="range"]').element
    expect(range.getAttribute('aria-label')).toBe('Eigener Name')
    expect(range.hasAttribute('aria-labelledby')).toBe(false)
    expect(wrapper.find('label').element.id).toBe('')
  })

  it('setzt nichts ohne vorangestellte Beschriftung', async () => {
    wrapper = mount(
      host(() => h('div', 'kein Label')),
      { attachTo: document.body },
    )
    await nextTick()
    expect(
      wrapper.find<HTMLInputElement>('input[type="range"]').attributes('aria-labelledby'),
    ).toBeUndefined()
  })
})

describe('SliderField – Breite des Zahlenfelds', () => {
  it('bleibt bei bis zu 5 Zeichen unverändert', () => {
    const w = mountField({ min: 500, max: 30000, modelValue: 5000, defaultValue: 5000 })
    expect(w.get('input[type="number"]').attributes('style')).toBeUndefined()
  })

  it('wird bei 6-stelligen Grenzwerten um die fehlenden Zeichen breiter', () => {
    const w = mountField({ min: 500, max: 120000, modelValue: 120000, defaultValue: 5000 })
    expect(w.get('input[type="number"]').attributes('style')).toContain(
      '--slider-field-num-extra: 1.5ch',
    )
  })
})

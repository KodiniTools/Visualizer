// @vitest-environment jsdom
// Slideshow: Schalter, Auswahlfelder und Farbfelder sind Ui-Bausteine
// (UiSwitch, UiSelect, ColorField) – keine nativen Checkboxen/Selects/Farbfelder.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SlideshowFillAudio from '../../components/foto-panel/slideshow/SlideshowFillAudio.vue'
import SlideshowImageEditor from '../../components/foto-panel/slideshow/SlideshowImageEditor.vue'
import SlideshowOrderList from '../../components/foto-panel/slideshow/SlideshowOrderList.vue'
import SlideshowPanel from '../../components/foto-panel/SlideshowPanel.vue'
import ColorField from '../../components/ui/ColorField.vue'
import { setLocale } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

vi.mock('../../lib/slideshowImagePersistence.js', () => ({
  persistUploadImage: vi.fn(async () => null),
  restoreUploadImage: vi.fn(async () => null),
  loadPersistedImage: vi.fn(async () => null),
}))

const images = [
  { id: 'a', name: 'Eins', imageObject: { src: 'data:,a' } },
  { id: 'b', name: 'Zwei', imageObject: { src: 'data:,b' } },
]

let wrapper
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  await setLocale('de')
})

const labelFor = (el) => document.querySelector(`label[for="${el.id}"]`)?.textContent.trim()

describe('Slideshow – Ui-Bausteine', () => {
  it('Flächen-Audio: Schalter und beschriftete Quelle', async () => {
    wrapper = mount(SlideshowFillAudio, {
      props: { modelValue: { enabled: false, source: 'bass', brightness: 60 }, prefix: 'base' },
      attachTo: document.body,
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    const sw = wrapper.find('.base-fill-audio-toggle [role="switch"]')
    expect(sw.attributes('aria-checked')).toBe('false')
    await sw.trigger('click')
    expect(wrapper.emitted('update:modelValue').at(-1)[0].enabled).toBe(true)

    await wrapper.setProps({ modelValue: { enabled: true, source: 'mid', brightness: 60 } })
    const select = wrapper.find('select.base-fill-audio-source')
    expect(labelFor(select.element)).toBe(de.slideshow.gradientAudioSource)
  })

  it('Bild-Einstellungen: Übergang, Audio und Quelle als UiSelect, Seitenverhältnis als Schalter', async () => {
    wrapper = mount(SlideshowImageEditor, {
      props: {
        image: { name: 'a.png' },
        index: 0,
        total: 2,
        size: { width: 0.4, height: 0.2, defaultWidth: 0.4, defaultHeight: 0.2 },
        hasSavedSettings: false,
      },
      attachTo: document.body,
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.findAll('.ui-select')).toHaveLength(3)
    expect(wrapper.find('.editor-keep-aspect [role="switch"]').exists()).toBe(true)

    const transition = wrapper.find('select.editor-transition')
    expect(labelFor(transition.element)).toBe(de.slideshow.transition)
    expect(transition.element.value).toBe('default')
    await transition.setValue('zoomIn')
    expect(wrapper.emitted('update:transition').at(-1)).toEqual(['zoomIn'])
    await transition.setValue('default')
    expect(wrapper.emitted('update:transition').at(-1)).toEqual([null])

    const audio = wrapper.find('select.editor-audio')
    expect(labelFor(audio.element)).toBe(de.slideshow.perImageAudioHint)
    // „Gespeichert“ nur mit gespeicherten Einstellungen
    expect(audio.find('option[value="saved"]').element.disabled).toBe(true)
    await audio.setValue('off')
    expect(wrapper.emitted('update:audioMode').at(-1)).toEqual(['off'])

    const source = wrapper.find('select.editor-audio-source')
    expect(labelFor(source.element)).toBe(de.slideshow.perImageAudioSource)
  })

  it('Reihenfolge-Liste: beschriftete Auswahlfelder, eigener Wert markiert', async () => {
    wrapper = mount(SlideshowOrderList, {
      props: {
        modelValue: images,
        transitions: { b: 'zoomIn' },
        audioSources: { a: 'bassOnset' },
      },
      attachTo: document.body,
    })
    const transitions = wrapper.findAll('select.order-transition')
    expect(transitions).toHaveLength(2)
    expect(labelFor(transitions[0].element)).toBe(de.slideshow.fieldTransition)
    expect(transitions[0].classes()).not.toContain('is-own')
    expect(transitions[1].classes()).toContain('is-own')
    expect(wrapper.findAll('select.order-audio-source')[0].classes()).toContain('is-own')
    expect(labelFor(wrapper.findAll('select.order-audio')[0].element)).toBe(de.slideshow.fieldAudio)

    await transitions[0].setValue('rotate')
    expect(wrapper.emitted('update:transitions').at(-1)[0]).toEqual({ a: 'rotate', b: 'zoomIn' })
    await wrapper.findAll('select.order-audio')[1].setValue('off')
    expect(wrapper.emitted('update:audioModes').at(-1)[0]).toEqual({ b: 'off' })
  })

  it('Panel: Schalter und Farbfelder statt nativer Eingaben', async () => {
    wrapper = mount(SlideshowPanel, {
      props: { images, hasSavedSettings: true, hasWorkspace: false },
      attachTo: document.body,
    })
    await wrapper.find('.bg-mode-canvas').setValue(true)
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.find('input[type="color"]').exists()).toBe(false)
    expect(wrapper.find('.render-behind-toggle [role="switch"]').exists()).toBe(true)
    expect(wrapper.find('.move-whole-checkbox [role="switch"]').exists()).toBe(true)
    const base = wrapper
      .findAllComponents(ColorField)
      .find((c) => c.classes().includes('slideshow-base-color'))
    expect(base.props('label')).toBe(de.slideshow.baseColor)
  })

  it('Texte folgen der Sprache', async () => {
    await setLocale('en')
    wrapper = mount(SlideshowImageEditor, {
      props: { image: { name: 'a.png' }, index: 0, total: 1 },
      attachTo: document.body,
    })
    expect(labelFor(wrapper.find('select.editor-transition').element)).toBe(en.slideshow.transition)
    expect(wrapper.find('select.editor-audio option[value="off"]').text()).toBe(
      en.slideshow.audioModeOff,
    )
  })
})

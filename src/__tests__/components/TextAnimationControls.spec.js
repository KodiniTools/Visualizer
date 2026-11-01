// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import FadeControls from '../../components/text-manager/text-animations/FadeControls.vue'
import SlideControls from '../../components/text-manager/text-animations/SlideControls.vue'
import TypewriterControls from '../../components/text-manager/text-animations/TypewriterControls.vue'
import AnimationEditSection from '../../components/text-manager/text-animations/AnimationEditSection.vue'
import AnimationNewSection from '../../components/text-manager/text-new-form/AnimationNewSection.vue'
import FadeSection from '../../components/text-manager/text-new-form/FadeSection.vue'

function fadeEffect(overrides = {}) {
  return reactive({
    enabled: true,
    direction: 'in',
    duration: 1000,
    startDelay: 0,
    easing: 'ease',
    loop: false,
    loopDelay: 1000,
    permanent: true,
    displayDuration: 5000,
    ...overrides,
  })
}

describe('Text-Animations-Controls (Edit-Panel und Neu-Formular)', () => {
  it('FadeControls schreibt die Richtung ins Effekt-Objekt und meldet change', async () => {
    const effect = fadeEffect()
    const w = mount(FadeControls, { props: { effect } })
    await w.findAll('select')[0].setValue('out')
    expect(effect.direction).toBe('out')
    expect(w.emitted('change')).toHaveLength(1)
  })

  it('Easing-Select setzt effect.easing', async () => {
    const effect = fadeEffect()
    const w = mount(FadeControls, { props: { effect } })
    await w.findAll('select')[1].setValue('linear')
    expect(effect.easing).toBe('linear')
  })

  it('Loop-Schalter blendet die Loop-Pause ein', async () => {
    const effect = fadeEffect()
    const w = mount(FadeControls, { props: { effect } })
    expect(w.text()).not.toContain('Pause zwischen Wiederholungen')
    const loopSwitch = w.findAll('[role="switch"]')[0]
    await loopSwitch.trigger('click')
    expect(effect.loop).toBe(true)
    expect(w.text()).toContain('Pause zwischen Wiederholungen')
  })

  it('Permanent aus zeigt die Anzeigedauer', async () => {
    const effect = fadeEffect({ permanent: false })
    const w = mount(FadeControls, { props: { effect } })
    expect(w.text()).toContain('Anzeigedauer: 5000ms')
  })

  it('SlideControls zeigt die Distanz in Prozent (slide.js rechnet in % des Canvas)', () => {
    const effect = fadeEffect({ from: 'left', distance: 100 })
    const w = mount(SlideControls, { props: { effect } })
    expect(w.text()).toContain('Distanz: 100%')
    expect(w.text()).not.toContain('100px')
  })

  it('TypewriterControls: Cursor-Zeichen nur bei aktivem Cursor', async () => {
    const effect = reactive({
      enabled: true,
      speed: 50,
      startDelay: 0,
      loop: false,
      loopDelay: 1000,
      showCursor: false,
      cursorChar: '|',
      permanent: true,
      displayDuration: 5000,
    })
    const w = mount(TypewriterControls, { props: { effect } })
    expect(w.text()).not.toContain('Cursor-Zeichen')
    effect.showCursor = true
    await nextTick()
    expect(w.text()).toContain('Cursor-Zeichen')
  })
})

describe('AnimationEditSection', () => {
  it('zeigt die Einstellungen nur bei aktivem Effekt und meldet toggle/restart', async () => {
    const effect = fadeEffect({ enabled: false })
    const w = mount(AnimationEditSection, {
      props: { label: 'Fade:', effect },
      slots: { default: '<div class="slot-body" />' },
    })
    expect(w.find('.slot-body').exists()).toBe(false)
    await w.find('button').trigger('click')
    expect(w.emitted('toggle')).toHaveLength(1)

    await w.setProps({ effect: fadeEffect({ enabled: true }) })
    expect(w.find('.slot-body').exists()).toBe(true)
    const buttons = w.findAll('button')
    await buttons[1].trigger('click')
    expect(w.emitted('restart')).toHaveLength(1)
  })

  it('ohne Effekt-Objekt (alter Text) bleibt die Sektion zu', () => {
    const w = mount(AnimationEditSection, {
      props: { label: 'Fade:', effect: null },
      slots: { default: '<div class="slot-body" />' },
    })
    expect(w.find('.slot-body').exists()).toBe(false)
  })
})

describe('Neu-Formular: AnimationNewSection / FadeSection', () => {
  it('An/Aus schaltet effect.enabled, Hinzufügen emittiert add', async () => {
    const effect = fadeEffect({ enabled: false })
    const w = mount(AnimationNewSection, {
      props: { effect, icon: 'x', title: 'Fade', addLabel: 'Mit Fade hinzufügen' },
      slots: { default: '<div class="slot-body" />' },
    })
    expect(w.find('.slot-body').exists()).toBe(false)
    await w.findAll('button')[0].trigger('click')
    expect(effect.enabled).toBe(true)
    expect(w.find('.slot-body').exists()).toBe(true)
    await w.findAll('button').at(-1).trigger('click')
    expect(w.emitted('add')).toHaveLength(1)
  })

  it('Hinzufügen ist bei canAdd=false gesperrt', () => {
    const w = mount(AnimationNewSection, {
      props: { effect: fadeEffect(), icon: 'x', title: 'Fade', addLabel: 'Add', canAdd: false },
    })
    expect(w.findAll('button').at(-1).attributes('disabled')).toBeDefined()
  })

  it('FadeSection bindet die gemeinsamen FadeControls an settings', async () => {
    const settings = fadeEffect()
    const w = mount(FadeSection, { props: { settings } })
    expect(w.findComponent(FadeControls).exists()).toBe(true)
    await w.findAll('select')[0].setValue('inOut')
    expect(settings.direction).toBe('inOut')
  })
})

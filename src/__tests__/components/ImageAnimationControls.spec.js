// @vitest-environment jsdom
// Bild-Animationen wie bei Texten: Abschnitte, Rahmen, Auswahl am Canvas-Bild
// und Vorgaben für neue Bilder im Upload-Bereich.
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive, toRaw } from 'vue'
import ImageAnimationSections from '../../components/foto-panel/image-animation/ImageAnimationSections.vue'
import ImageAnimationPanel from '../../components/foto-panel/image-animation/ImageAnimationPanel.vue'
import ImageAnimationControls from '../../components/foto-panel/image-animation/ImageAnimationControls.vue'
import ImageUploadSection from '../../components/foto-panel/ImageUploadSection.vue'
import {
  createImageAnimation,
  getImageAnimationTransform,
} from '../../lib/canvasObjects/imageAnimation'
import de from '../../lib/i18n/de'

const TM = de.textManager
const CANVAS = { width: 1000, height: 500 }
let wrapper

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

/** Knopf „Aktiviert/Deaktiviert“ des Abschnitts `key` */
const toggleOf = (w, key) => w.find(`[data-effect="${key}"] button`)

describe('ImageAnimationSections', () => {
  it('zeigt Fade, Scale und Slide mit den Text-Beschriftungen', () => {
    wrapper = mount(ImageAnimationSections, { props: { animation: createImageAnimation() } })
    const text = wrapper.text()
    expect(text).toContain(TM.fadeEffect)
    expect(text).toContain(TM.scaleEffect)
    expect(text).toContain(TM.slideEffect)
  })

  it('An/Aus schaltet enabled um, meldet toggle und zeigt die Regler', async () => {
    const animation = reactive(createImageAnimation())
    wrapper = mount(ImageAnimationSections, { props: { animation } })
    await toggleOf(wrapper, 'slide').trigger('click')
    expect(animation.slide.enabled).toBe(true)
    expect(wrapper.emitted('toggle')[0]).toEqual(['slide', true])
    expect(wrapper.text()).toContain(TM.slideFrom)
  })

  it('restartable=false: kein „Neu starten“', async () => {
    const animation = reactive(createImageAnimation())
    animation.fade.enabled = true
    wrapper = mount(ImageAnimationSections, { props: { animation, restartable: false } })
    const headerButtons = () => wrapper.find('[data-effect="fade"] .button-group').findAll('button')
    expect(headerButtons()).toHaveLength(1)
    await wrapper.setProps({ restartable: true })
    const buttons = headerButtons()
    await buttons[1].trigger('click')
    expect(wrapper.emitted('restart')[0]).toEqual(['fade'])
  })
})

describe('ImageAnimationPanel', () => {
  it('klappt auf, wenn schon ein Effekt aktiv ist, und zeigt Badges', () => {
    const animation = createImageAnimation()
    animation.scale.enabled = true
    wrapper = mount(ImageAnimationPanel, { props: { title: 'Animation', animation } })
    expect(wrapper.find('details').element.open).toBe(true)
    expect(wrapper.find('summary').text()).toContain('Scale')
  })

  it('ohne aktiven Effekt zugeklappt, Hinweis nur mit Text', () => {
    wrapper = mount(ImageAnimationPanel, {
      props: { title: 'Animation', animation: createImageAnimation() },
    })
    expect(wrapper.find('details').element.open).toBe(false)
    expect(wrapper.find('.image-animation-hint').exists()).toBe(false)
  })
})

describe('ImageAnimationControls (ausgewähltes Canvas-Bild)', () => {
  it('Auswahl allein ändert das Bild nicht; Einschalten legt timedAnimation an', async () => {
    const image = reactive({ id: 1 })
    wrapper = mount(ImageAnimationControls, { props: { image } })
    expect(image.timedAnimation).toBeUndefined()
    await toggleOf(wrapper, 'fade').trigger('click')
    expect(image.timedAnimation.fade.enabled).toBe(true)
    expect(image.timedAnimation.slide.enabled).toBe(false)
  })

  it('„Neu starten“ setzt den Ablauf des Bildes zurück', async () => {
    const timedAnimation = createImageAnimation()
    Object.assign(timedAnimation.fade, { enabled: true, easing: 'linear', duration: 1000 })
    const image = reactive({ id: 2, timedAnimation })
    const raw = toRaw(image)
    const t0 = Date.now()
    getImageAnimationTransform(raw, CANVAS, t0)
    expect(getImageAnimationTransform(raw, CANVAS, t0 + 5000).opacity).toBe(1)

    wrapper = mount(ImageAnimationControls, { props: { image } })
    const buttons = wrapper.find('[data-effect="fade"]').findAll('button')
    await buttons[1].trigger('click')
    expect(getImageAnimationTransform(raw, CANVAS, t0 + 6000).opacity).toBe(0)
  })

  it('Bildwechsel: Platzhalter neu, Bereich je nach Animation auf-/zugeklappt', async () => {
    const animated = createImageAnimation()
    animated.slide.enabled = true
    wrapper = mount(ImageAnimationControls, { props: { image: reactive({ id: 1 }) } })
    expect(wrapper.find('details').element.open).toBe(false)
    await wrapper.setProps({ image: reactive({ id: 2, timedAnimation: animated }) })
    await nextTick()
    expect(wrapper.find('details').element.open).toBe(true)
  })
})

describe('ImageUploadSection: Animation beim Hinzufügen', () => {
  const gallery = [{ id: '1', name: 'eins.webp', dimensions: '10×10', img: { src: 'data:,1' } }]
  const mountUpload = (selected, newImageAnimation) =>
    mount(ImageUploadSection, {
      props: {
        imageGallery: gallery,
        selectedImageIndices: new Set(selected),
        selectedImageCount: selected.length,
        newImageAnimation,
      },
      global: { stubs: { PlacementSettings: { template: '<div data-placement />' } } },
    })

  it('erscheint mit Auswahl, ohne „Neu starten“, und bearbeitet die Vorgaben', async () => {
    const anim = reactive(createImageAnimation())
    wrapper = mountUpload([0], anim)
    expect(wrapper.text()).toContain(de.foto.newImageAnimation)
    await toggleOf(wrapper, 'fade').trigger('click')
    expect(anim.fade.enabled).toBe(true)
    expect(wrapper.find('[data-effect="fade"]').text()).not.toContain(TM.restart)
  })

  it('ohne Auswahl oder ohne Vorgaben ausgeblendet', () => {
    wrapper = mountUpload([], reactive(createImageAnimation()))
    expect(wrapper.text()).not.toContain(de.foto.newImageAnimation)
    wrapper.unmount()
    wrapper = mountUpload([0], null)
    expect(wrapper.text()).not.toContain(de.foto.newImageAnimation)
  })
})

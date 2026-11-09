// @vitest-environment jsdom
// Formung der Visualizer-Reaktion: Übergang (Easing) und Beat-Verstärkung.
import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VisualizerReactShapeControls from '../../components/visualizer-panel/VisualizerReactShapeControls.vue'
import { REACT_EASINGS } from '../../lib/visualizers/core/reactSource'
import { setLocale } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

let wrapper: VueWrapper | null

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  await setLocale('de')
})

const mountShape = (settings = {}) =>
  (wrapper = mount(VisualizerReactShapeControls, {
    props: { settings },
    attachTo: document.body,
  }))

describe('VisualizerReactShapeControls', () => {
  it('Übergang listet alle Kurven und meldet die Auswahl', async () => {
    mountShape({ reactEasing: 'bounce' })
    const select = wrapper!.find('select')
    expect(select.findAll('option').map((o) => o.element.value)).toEqual([...REACT_EASINGS])
    expect(select.element.value).toBe('bounce')
    await select.setValue('punch')
    expect(wrapper!.emitted('update')!.at(-1)).toEqual(['reactEasing', 'punch'])
  })

  it('Beat-Verstärkung: „Aus“ bei 1, sonst Faktor', async () => {
    mountShape({ reactBeatBoost: 1 })
    expect(wrapper!.text()).toContain(de.visualizer.reactSource.beatBoostOff)
    await wrapper!.setProps({ settings: { reactBeatBoost: 2 } })
    expect(wrapper!.text()).toContain('×2.0')
  })

  it('Übergang hat ein Label; Kurven-Namen folgen der Sprache', async () => {
    await setLocale('en')
    mountShape()
    const select = wrapper!.find('select').element
    expect(document.querySelector(`label[for="${select.id}"]`)!.textContent!.trim()).toBe(
      en.visualizer.reactSource.easing,
    )
    expect([...select.options].map((o) => o.textContent!.trim())).toEqual(
      REACT_EASINGS.map((e) => en.foto.easings[e]),
    )
  })
})

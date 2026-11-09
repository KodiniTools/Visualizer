// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  SLIDESHOW_GRADIENT_AUDIO_SOURCES,
  computeSlideshowGradientAudio,
  normalizeSlideshowGradientAudio,
} from '../../lib/slideshowGradientAudio'
import {
  computeSlideshowFillAudio,
  normalizeSlideshowFillAudio,
} from '../../lib/slideshowFillAudio'
import {
  computeSlideshowImageFillAudio,
  normalizeSlideshowImageFill,
} from '../../lib/slideshowImageFill'
import SlideshowAudioSourceSelect from '../../components/foto-panel/slideshow/SlideshowAudioSourceSelect.vue'
import { sourceNames } from '../../lib/audio/AudioLevelCalculator'

const ONSETS = ['bassOnset', 'midOnset', 'trebleOnset', 'allOnset']
// Nur ein Onset aktiv, alle Bänder still
const onsetData = {
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  onsetBass: 0,
  onsetMid: 0,
  onsetTreble: 0,
  onsetAll: 1,
}

describe('Slideshow-Fläche – Audio-Quellen wie beim Bild', () => {
  it('Quellen: Bänder + Onsets, alle der Engine bekannt', () => {
    expect(SLIDESHOW_GRADIENT_AUDIO_SOURCES).toEqual([
      'bass',
      'mid',
      'treble',
      'volume',
      'dynamic',
      ...ONSETS,
    ])
    for (const s of SLIDESHOW_GRADIENT_AUDIO_SOURCES) expect(sourceNames).toContain(s)
  })

  it('Onset-Quellen werden von Verlauf, Farbe und Bild akzeptiert (ungültige → Bass)', () => {
    for (const s of ONSETS) {
      expect(normalizeSlideshowGradientAudio({ source: s }).source).toBe(s)
      expect(normalizeSlideshowFillAudio({ source: s }).source).toBe(s)
      expect(normalizeSlideshowImageFill({ audio: { source: s } }).audio.source).toBe(s)
    }
    expect(normalizeSlideshowFillAudio({ source: 'dynamic' }).source).toBe('dynamic')
    expect(normalizeSlideshowImageFill({ audio: { source: 'dynamic' } }).audio.source).toBe(
      'dynamic',
    )
    expect(normalizeSlideshowFillAudio({ source: 'foo' }).source).toBe('bass')
  })

  it('Alle-Onset reagiert, obwohl die Bänder still sind', () => {
    const g = computeSlideshowGradientAudio(
      normalizeSlideshowGradientAudio({
        enabled: true,
        source: 'allOnset',
        pulse: 100,
        rotation: 0,
      }),
      'workspace',
      onsetData,
    )
    expect(g.extent).toBeLessThan(1)
    const f = computeSlideshowFillAudio(
      normalizeSlideshowFillAudio({ enabled: true, source: 'allOnset', brightness: 100 }),
      'workspace',
      onsetData,
    )
    expect(f.lighten).toBeGreaterThan(0)
    const i = computeSlideshowImageFillAudio(
      normalizeSlideshowImageFill({ audio: { enabled: true, source: 'allOnset', zoom: 100 } })
        .audio,
      'workspace',
      onsetData,
    )
    expect(i.zoom).toBeGreaterThan(1)
    // Bass-Onset still → keine Wirkung
    const quiet = computeSlideshowFillAudio(
      normalizeSlideshowFillAudio({ enabled: true, source: 'bassOnset', brightness: 100 }),
      'canvas',
      onsetData,
    )
    expect(quiet.lighten).toBe(0)
  })

  it('Dynamisch (Auto-Blend) reagiert auf gemischte Bänder', () => {
    const f = computeSlideshowFillAudio(
      normalizeSlideshowFillAudio({ enabled: true, source: 'dynamic', brightness: 100 }),
      'canvas',
      { bass: 0, mid: 200, treble: 100, volume: 0 },
    )
    expect(f.lighten).toBeGreaterThan(0)
  })

  it('Auswahl zeigt Bänder und Onset-Gruppe wie das Bild-Panel', async () => {
    const w = mount(SlideshowAudioSourceSelect, {
      props: { modelValue: 'midOnset', label: 'Quelle' },
    })
    const values = w.findAll('option').map((o) => o.element.value)
    expect(values).toEqual(['bass', 'mid', 'treble', 'volume', 'dynamic', ...ONSETS])
    expect(w.findAll('optgroup optgroup').length).toBe(0)
    expect(w.findAll<HTMLInputElement>('optgroup option').map((o) => o.element.value)).toEqual(
      ONSETS,
    )
    expect(w.find('optgroup').attributes('label')).toBe('Onset (Beat, auto-normalisiert)')
    expect(w.find('option[value="dynamic"]').text()).toBe('Dynamisch (Auto-Blend)')
    expect(w.find<HTMLSelectElement>('select').element.value).toBe('midOnset')
    await w.find<HTMLSelectElement>('select').setValue('trebleOnset')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['trebleOnset'])
  })

  it('Ui-Baustein: Beschriftung, Klasse am select, „Wie Einstellung“ = null', async () => {
    const w = mount(SlideshowAudioSourceSelect, {
      props: { modelValue: null, label: 'Quelle', inheritLabel: 'Wie Einstellung' },
      attrs: { class: 'order-audio-source is-own' },
      attachTo: document.body,
    })
    const select = w.find<HTMLSelectElement>('select')
    expect(w.find('.ui-select').exists()).toBe(true)
    expect(select.classes()).toEqual(expect.arrayContaining(['order-audio-source', 'is-own']))
    expect(document.querySelector(`label[for="${select.element.id}"]`)!.textContent!.trim()).toBe(
      'Quelle',
    )
    expect(select.element.value).toBe('')
    expect(w.findAll('option')[0]!.text()).toBe('Wie Einstellung')
    await select.setValue('bass')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['bass'])
    await select.setValue('')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([null])
    w.unmount()
  })
})

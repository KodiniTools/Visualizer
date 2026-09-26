// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  SLIDESHOW_GRADIENT_AUDIO_SOURCES,
  computeSlideshowGradientAudio,
  normalizeSlideshowGradientAudio,
} from '../../lib/slideshowGradientAudio.js'
import {
  computeSlideshowFillAudio,
  normalizeSlideshowFillAudio,
} from '../../lib/slideshowFillAudio.js'
import {
  computeSlideshowImageFillAudio,
  normalizeSlideshowImageFill,
} from '../../lib/slideshowImageFill.js'
import SlideshowAudioSourceSelect from '../../components/foto-panel/slideshow/SlideshowAudioSourceSelect.vue'
import { sourceNames } from '../../lib/audio/AudioLevelCalculator.js'

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
    const w = mount(SlideshowAudioSourceSelect, { props: { modelValue: 'midOnset' } })
    const values = w.findAll('option').map((o) => o.element.value)
    expect(values).toEqual(['bass', 'mid', 'treble', 'volume', 'dynamic', ...ONSETS])
    expect(w.findAll('optgroup optgroup').length).toBe(0)
    expect(w.findAll('optgroup option').map((o) => o.element.value)).toEqual(ONSETS)
    expect(w.find('optgroup').attributes('label')).toBe('Onset (Beat, auto-normalisiert)')
    expect(w.find('option[value="dynamic"]').text()).toBe('Dynamisch (Auto-Blend)')
    expect(w.find('select').element.value).toBe('midOnset')
    await w.find('select').setValue('trebleOnset')
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['trebleOnset'])
  })
})

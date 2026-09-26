// @vitest-environment node
/**
 * Einheitliche Regler: Slideshow-Bereich und Position & Größe nutzen dieselbe
 * Regler-Zeile wie die Bild-Filter (ui/SliderControl + ui/slider-control.css).
 * Verhindert, dass wieder eigene Slider-Optiken (Farbe, Daumen, Höhe) entstehen.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../components')
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const SLIDESHOW_DIR = 'foto-panel/slideshow'
const slideshowFiles = readdirSync(join(root, SLIDESHOW_DIR))
  .filter((f) => f.endsWith('.vue'))
  .map((f) => `${SLIDESHOW_DIR}/${f}`)
const template = (src) => src.slice(0, src.indexOf('<script'))
const styles = (src) => src.slice(src.indexOf('<style'))

describe('Einheitliche Regler', () => {
  it('Slideshow-Komponenten: keine eigenen Range-Inputs oder SliderField-Zeilen', () => {
    for (const f of [...slideshowFiles, 'foto-panel/image-filters/PositionSizeControls.vue']) {
      const src = read(f)
      expect(template(src), f).not.toMatch(/type="range"/)
      expect(template(src), f).not.toMatch(/<SliderField\b/)
      expect(styles(src), f).not.toMatch(
        /slider-thumb|range-thumb|type='range'|accent-color: #6ea8fe/,
      )
    }
    const css = read(`${SLIDESHOW_DIR}/slideshow-shared.css`)
    expect(css).not.toMatch(/slider-thumb|\.slider-row/)
  })

  it('alle Slider der Slideshow laufen über SliderControl', () => {
    const users = slideshowFiles.filter((f) => /<SliderControl\b/.test(read(f)))
    expect(users.map((f) => f.split('/').pop()).sort()).toEqual([
      'SlideshowBaseGradient.vue',
      'SlideshowFillAudio.vue',
      'SlideshowImageEditor.vue',
      'SlideshowImageFill.vue',
      'SlideshowTimingSettings.vue',
      'SlideshowTransformSettings.vue',
    ])
  })

  it('SliderControl und Bild-Filter teilen dieselbe Stylesheet-Datei', () => {
    expect(read('ui/SliderControl.vue')).toMatch(/<style scoped src="\.\/slider-control\.css">/)
    for (const f of ['BasicFilters', 'ShadowControls', 'BorderControls', 'RotationControls']) {
      expect(read(`foto-panel/image-filters/${f}.vue`), f).toMatch(
        /<style scoped src="\.\.\/\.\.\/ui\/slider-control\.css">/,
      )
    }
    // Referenz-Regeln nur noch an einer Stelle
    const filtersCss = read('foto-panel/image-filters/image-filters-shared.css')
    expect(filtersCss).not.toMatch(/^input\[type='range'\]/m)
    expect(filtersCss).not.toMatch(/\.control-group\.slider/)
    const css = read('ui/slider-control.css')
    expect(css).toMatch(/\.control-group\.slider \{[^}]*grid-template-columns: 1fr auto/)
    expect(css).toMatch(/input\[type='range'\] \{[^}]*height: 3px/)
    expect(css).toMatch(/::-webkit-slider-thumb \{[^}]*width: 12px/)
    expect(css).toMatch(
      /\[data-theme='light'\] input\[type='range'\] \{[^}]*#4d6d8e 0%, #014f99 100%/,
    )
    expect(css).toMatch(
      /\[data-theme='light'\] input\[type='range'\]::-webkit-slider-thumb \{[^}]*#c9984d/,
    )
  })
})

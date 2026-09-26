// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Regressionstest: Jedes Auswahlfeld in der Bildzeile der Slideshow-Liste
 * hat einen Stil (dunkles UND helles Theme) – sonst erscheint es mit der
 * Standard-Darstellung des Browsers (so geschehen beim Feld „Quelle“).
 */
const sfc = readFileSync(
  fileURLToPath(
    new URL('../../components/foto-panel/slideshow/SlideshowOrderList.vue', import.meta.url),
  ),
  'utf8',
)
const template = sfc.slice(sfc.indexOf('<template>'), sfc.indexOf('<script'))
const styles = sfc.slice(sfc.indexOf('<style scoped>'))

// Klassen aller <select> bzw. <SlideshowAudioSourceSelect> im Template
const selectClasses = [
  ...template.matchAll(/<(?:select|SlideshowAudioSourceSelect)\b[^>]*?\sclass="([^"]+)"/g),
].map((m) => m[1].split(/\s+/)[0])

/** Regeln (Selektor → Deklarationen), deren Selektor die Klasse enthält */
function rulesFor(cls, { light }) {
  const rules = []
  for (const m of styles.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim())
    const hit = selectors.some(
      (s) =>
        new RegExp(`\\.${cls}(?![\\w-])`).test(s) &&
        s.includes("[data-theme='light']") === light &&
        !s.includes(':disabled'),
    )
    if (hit) rules.push(m[2])
  }
  return rules.join('\n')
}

describe('SlideshowOrderList – Stile der Auswahlfelder', () => {
  it('findet die Auswahlfelder der Bildzeile (Übergang, Audio, Quelle)', () => {
    expect(selectClasses).toEqual(['order-transition', 'order-audio', 'order-audio-source'])
  })

  it.each(selectClasses)('%s: Stil im dunklen Theme (Hintergrund, Rahmen, Schrift)', (cls) => {
    const css = rulesFor(cls, { light: false })
    for (const prop of ['background', 'border', 'color', 'font-size', 'padding']) {
      expect(css, `${cls} ohne ${prop}`).toMatch(new RegExp(`(^|[\\s;])${prop}\\s*:`))
    }
  })

  it.each(selectClasses)('%s: Stil im hellen Theme', (cls) => {
    const css = rulesFor(cls, { light: true })
    for (const prop of ['background', 'color', 'border-color']) {
      expect(css, `${cls} ohne ${prop} (hell)`).toMatch(new RegExp(`(^|[\\s;])${prop}\\s*:`))
    }
  })
})

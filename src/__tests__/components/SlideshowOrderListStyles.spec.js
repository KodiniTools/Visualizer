// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Regressionstest: Die Auswahlfelder der Bildzeile sind Ui-Bausteine
 * (UiSelect bzw. SlideshowAudioSourceSelect) – sie bringen Stil für helles
 * und dunkles Theme selbst mit. Früher erschien ein natives Feld („Quelle“)
 * in der Standard-Darstellung des Browsers.
 */
const sfc = readFileSync(
  fileURLToPath(
    new URL('../../components/foto-panel/slideshow/SlideshowOrderList.vue', import.meta.url),
  ),
  'utf8',
)
const template = sfc.slice(sfc.indexOf('<template>'), sfc.indexOf('<script'))
const styles = sfc.slice(sfc.indexOf('<style scoped>'))

// Auswahlfelder (Ui-Bausteine) im Template: Klasse + Tag
const fields = [...template.matchAll(/<(UiSelect|SlideshowAudioSourceSelect)\b([\s\S]*?)\/>/g)].map(
  (m) => ({ tag: m[1], attrs: m[2], cls: m[2].match(/\sclass="([^"]+)"/)?.[1] }),
)

describe('SlideshowOrderList – Auswahlfelder', () => {
  it('kein natives <select> mehr in der Bildzeile', () => {
    expect(template).not.toMatch(/<select\b/)
  })

  it('findet die Auswahlfelder der Bildzeile (Übergang, Audio, Quelle)', () => {
    expect(fields.map((f) => f.cls)).toEqual([
      'order-transition',
      'order-audio',
      'order-audio-source',
    ])
  })

  it.each(['order-transition', 'order-audio', 'order-audio-source'])(
    '%s: hat eine Beschriftung (label)',
    (cls) => {
      expect(fields.find((f) => f.cls === cls).attrs).toMatch(/\s:label="/)
    },
  )

  it('eigener Wert (is-own) wird auch am nativen select im UiSelect hervorgehoben', () => {
    expect(styles).toMatch(/:deep\(\.ui-select__native\.is-own\)[^{]*\{[^}]*border-color\s*:/)
  })
})

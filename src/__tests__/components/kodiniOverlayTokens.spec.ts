// @vitest-environment node
/**
 * Regressionsschutz für kodini-visualizer-overlays.css: Die per <Teleport>
 * an <body> gehängten Fenster müssen dieselben Farbwerte bekommen wie
 * #app-container in Phase 1, und jede dort genannte Wurzelklasse muss es in
 * der zugehörigen Komponente noch geben.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const phase1 = read('styles/kodini-visualizer-phase1.css')
const overlays = read('styles/kodini-visualizer-overlays.css')

/** Alle `--name: wert`-Deklarationen des ersten Blocks, dessen Selektor `match` erfüllt. */
function tokens(css: string, match: (selector: string) => boolean): Record<string, string> {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!match(m[1]!.replace(/\s+/g, ' ').trim())) continue
    const out: Record<string, string> = {}
    for (const d of m[2]!.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[d[1]!] = d[2]!.trim()
    return out
  }
  return {}
}

const isLight = (s: string) => s.includes("[data-theme='light']")
const phase1Dark = tokens(phase1, (s) => s.startsWith('#app-container') && !isLight(s))
const phase1Light = tokens(phase1, (s) => isLight(s) && s.includes('#app-container'))
const overlayDark = tokens(overlays, (s) => s.startsWith('body:has(#app-container)'))
// Erster Light-Block mit Overlay-Selektor ist die Palette (der spätere hält nur accent-soft).
const overlayLight = tokens(overlays, (s) => isLight(s) && s.includes('.toast-container'))

describe('Kodini-Overlays übernehmen die Phase-1-Palette', () => {
  it('liest beide Dateien (Parser-Sanity)', () => {
    expect(Object.keys(phase1Dark).length).toBeGreaterThan(10)
    expect(Object.keys(phase1Light).length).toBeGreaterThan(10)
    expect(Object.keys(overlayDark).length).toBeGreaterThan(10)
    expect(Object.keys(overlayLight).length).toBeGreaterThan(10)
  })

  it('Dark: gleiche Werte wie #app-container', () => {
    expect(overlayDark).toEqual(phase1Dark)
  })

  it('Light: gleiche Werte wie #app-container', () => {
    expect(overlayLight).toEqual(phase1Light)
  })

  it('Fokus-Ring nutzt ds-link auf der Route und in den Overlays', () => {
    expect(overlays).toMatch(
      /#app-container,\s*body:has\(#app-container\)[^{]*\{[^}]*--ds-focus-ring:\s*0 0 0 2px var\(--ds-surface-0\), 0 0 0 4px var\(--ds-link\);/,
    )
  })
})

describe('Overlay-Wurzelklassen existieren in ihren Komponenten', () => {
  const roots: [string, string][] = [
    ['ui-dialog__backdrop', 'components/ui/UiDialog.vue'],
    ['color-field__panel', 'components/ui/ColorField.vue'],
    ['quick-start-panel', 'components/QuickStartGuide.vue'],
    ['tooltip-content', 'components/HelpTooltip.vue'],
    ['results-modal', 'components/recorder/RecorderResultsModal.vue'],
    ['toast-container', 'components/ToastContainer.vue'],
    ['fullscreen-modal-overlay', 'components/screenshot/ScreenshotFullscreenModal.vue'],
    ['conversion-overlay', 'components/recorder/RecorderConversionOverlay.vue'],
    ['slideshow-panel', 'components/foto-panel/SlideshowPanel.vue'],
  ]

  it.each(roots)('.%s in %s', (cls, file) => {
    expect(readFileSync(join(SRC, file), 'utf8')).toContain(`class="${cls}"`)
    expect(overlays).toContain(`.${cls}`)
  })
})

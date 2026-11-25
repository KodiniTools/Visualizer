// @vitest-environment node
/**
 * Sprachumschalter der globalen SSI-Navigation: Die aktive Sprache ist wie in
 * den anderen Tools golden gefüllt mit weisser Schrift (Kodini 24.11.2026).
 * Ohne diese Regel greift --accent-color der Navigation (blau).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const template = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('globale Navigation: aktive Sprache', () => {
  const all = [...template.matchAll(/([^{}]*\.global-nav-lang-btn\.active[^{}]*)\{([^}]*)\}/g)]
  const rules = all.filter((rule) => !rule[1]!.includes(':hover'))
  const hover = all.filter((rule) => rule[1]!.includes(':hover'))

  it('genau eine Regel, für beide Themes', () => {
    expect(rules).toHaveLength(1)
    expect(rules[0]![1]).not.toMatch(/data-theme/)
  })

  it('goldener Hintergrund und weisse Schrift, beides erzwungen', () => {
    const body = rules[0]![2]!
    // Fläche als Rückfall, darüber der Verlauf nach Equalizer-19-Muster
    expect(body).toMatch(
      /background:\s*#8f6320 linear-gradient\(180deg, #9c6c26 0%, #7a5218 45%, #4a2f0a 100%\)\s*!important/,
    )
    expect(body).toMatch(/color:\s*#ffffff\s*!important/)
  })

  it('Hover zeigt den dunkleren Verlauf', () => {
    expect(hover).toHaveLength(1)
    expect(hover[0]![2]).toMatch(
      /linear-gradient\(180deg, #8c5f1f 0%, #6a4614 45%, #402908 100%\)\s*!important/,
    )
  })

  it('die allgemeine Farbregel der Navigation nimmt den Sprachknopf aus', () => {
    expect(template).toMatch(/\.global-nav \*:not\([^{]*:not\(\.global-nav-lang-btn\)/)
  })
})

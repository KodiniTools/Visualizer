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
  const rules = [...template.matchAll(/([^{}]*\.global-nav-lang-btn\.active[^{}]*)\{([^}]*)\}/g)]

  it('genau eine Regel, für beide Themes', () => {
    expect(rules).toHaveLength(1)
    expect(rules[0]![1]).not.toMatch(/data-theme/)
  })

  it('goldener Hintergrund und weisse Schrift, beides erzwungen', () => {
    const body = rules[0]![2]!
    expect(body).toMatch(/background:\s*#8f6320\s*!important/)
    expect(body).toMatch(/color:\s*#ffffff\s*!important/)
  })

  it('die allgemeine Farbregel der Navigation nimmt den Sprachknopf aus', () => {
    expect(template).toMatch(/\.global-nav \*:not\([^{]*:not\(\.global-nav-lang-btn\)/)
  })
})

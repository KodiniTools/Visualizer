// @vitest-environment node
/**
 * Gefüllte Gold-Buttons: dunkelgold mit weisser Schrift und Verlauf nach
 * Equalizer-19-Muster (src/design-system/kodini-gold-buttons.css, index.html).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..', '..')
const css = readFileSync(join(ROOT, 'src/design-system/kodini-gold-buttons.css'), 'utf8')
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
const main = readFileSync(join(ROOT, 'src/main.ts'), 'utf8')

function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

describe('Gold-Buttons mit Verlauf', () => {
  it('wird direkt nach den Tokens geladen', () => {
    expect(main).toContain("import './design-system/kodini-gold-buttons.css'")
  })

  it.each(['--kt-gold-grad', '--kt-gold-grad-hover'])(
    '%s: jeder Stopp erreicht mit weisser Schrift 4,5:1',
    (token) => {
      const value = css.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1] ?? ''
      const stops = value.match(/#[0-9a-f]{6}/gi) ?? []
      expect(stops).toHaveLength(3)
      for (const stop of stops) expect(1.05 / (luminance(stop) + 0.05)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('deckt Primärbuttons von App, Startseite, Blog und interner Seite ab', () => {
    for (const selector of [
      '.ui-button--primary',
      '.ui-icon-button--primary',
      '.landing-page .lp-btn-hero',
      '.blog-page .nav-cta',
      '.internal-landing .btn-primary',
    ])
      expect(css).toContain(selector)
    expect(css).toContain('background: var(--kt-gold-fill) var(--kt-gold-grad);')
    expect(css).toContain('color: var(--kt-on-gold-fill);')
  })

  it('aktive Sprache der SSI-Navigation trägt den Verlauf', () => {
    expect(html).toMatch(
      /\.global-nav-lang-btn\.active \{ background: #8f6320 linear-gradient\(180deg, #9c6c26/,
    )
  })
})

// @vitest-environment node
/**
 * Die Theme-Blöcke in App.vue ([data-theme='dark'] und [data-theme='light'])
 * definieren die Design-Tokens als Literale.
 *
 * Hintergrund: Eine Definition wie `--primary-bg: var(--primary-bg)` ist ein
 * Zyklus; der Browser verwirft die Variable, und jede Komponente fällt auf
 * ihren Fallback (die Dark-Werte) zurück. Das hat am 05.10.2026 das Light
 * Theme in der Produktion gebrochen (Hintergrund blieb Navy, Regler-Spuren
 * und Icons verschwanden). Dieser Test lässt das nicht wieder zu.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const APP_VUE = join(dirname(fileURLToPath(import.meta.url)), '../../App.vue')
const src = readFileSync(APP_VUE, 'utf8')

/** Deklarationen `--name: value` eines Top-Level-Blocks mit genau diesem Selektor. */
function tokensOf(selector) {
  const re = new RegExp(`\\n${selector.replace(/[[\]']/g, '\\$&')}\\s*\\{([^}]*)\\}`)
  const m = src.match(re)
  expect(m, `Block ${selector} in App.vue`).not.toBeNull()
  const body = m[1].replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens = new Map()
  for (const decl of body.split(';')) {
    const i = decl.indexOf(':')
    if (i === -1) continue
    const name = decl.slice(0, i).trim()
    if (!name.startsWith('--')) continue
    tokens.set(
      name,
      decl
        .slice(i + 1)
        .replace(/\s+/g, ' ')
        .trim(),
    )
  }
  return tokens
}

// Tokens, die in jedem Theme als Farbliteral stehen müssen (keine var()-Verweise)
const CORE = [
  '--primary-bg',
  '--secondary-bg',
  '--card-bg',
  '--accent-primary',
  '--accent-secondary',
  '--accent-tertiary',
  '--accent-text',
  '--accent-ink',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--btn-hover',
  '--ring',
  '--border-color',
]
const LITERAL = /^(#[0-9a-f]{3,8}|rgba?\([^()]*\)|hsla?\([^()]*\))$/i

describe('Theme-Token-Blöcke in App.vue', () => {
  const dark = tokensOf("[data-theme='dark']")
  const light = tokensOf("[data-theme='light']")

  it('Dark und Light definieren dieselben Tokens', () => {
    expect([...light.keys()].sort()).toEqual([...dark.keys()].sort())
  })

  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: kein Token verweist auf sich selbst', (_theme, tokens) => {
    const cyclic = [...tokens].filter(([name, value]) => value.includes(`var(${name}`))
    expect(cyclic).toEqual([])
  })

  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: Kern-Tokens sind Farbliterale', (_theme, tokens) => {
    const bad = CORE.filter((name) => !LITERAL.test(tokens.get(name) ?? ''))
    expect(bad, 'Token ohne Literalwert').toEqual([])
  })

  it('Light Theme: Gold ist der Akzent, Navy die Akzent-Textfarbe', () => {
    expect(light.get('--accent-primary')).toBe('#c9984d')
    expect(light.get('--accent-ink')).toBe('#014f99')
    expect(light.get('--accent-text')).toBe('#091428')
    expect(light.get('--primary-bg')).toBe('#f5f4d6')
  })
})

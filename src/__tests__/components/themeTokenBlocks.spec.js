// @vitest-environment node
/**
 * Design-Tokens: src/design-system/tokens-v2.css (--ds-*, geteilt mit dem
 * Collage Maker) hält die Literale, App.vue hält nur Aliase darauf.
 *
 * Hintergrund: Eine Definition wie `--primary-bg: var(--primary-bg)` ist ein
 * Zyklus; der Browser verwirft die Variable, und jede Komponente fällt auf
 * ihren Fallback zurück. Das hat am 05.10.2026 das Light Theme in der
 * Produktion gebrochen. Dieser Test lässt das nicht wieder zu und hält die
 * Alias-Schicht an die gemeinsame Token-Datei gebunden.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..')
const appVue = readFileSync(join(SRC, 'App.vue'), 'utf8')
const tokensCss = readFileSync(join(SRC, 'design-system/tokens-v2.css'), 'utf8')

/** Deklarationen `--name: value` des ersten Top-Level-Blocks mit genau diesem Selektor. */
function block(src, selector) {
  const re = new RegExp(`(?:^|\\n)${selector.replace(/[[\]'.]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
  const m = src.match(re)
  expect(m, `Block ${selector}`).not.toBeNull()
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

const refs = (value) => [...value.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1])

describe('tokens-v2.css: die gemeinsame Token-Datei', () => {
  const root = block(tokensCss, ':root')
  const light = block(tokensCss, ":root[data-theme='light']")

  it('definiert Flächen, Text, Akzent und Status in Dark und Light', () => {
    for (const name of [
      '--ds-surface-0',
      '--ds-surface-1',
      '--ds-surface-2',
      '--ds-surface-3',
      '--ds-border',
      '--ds-border-strong',
      '--ds-text',
      '--ds-text-2',
      '--ds-text-3',
      '--ds-accent',
      '--ds-accent-hover',
      '--ds-on-accent',
      '--ds-link',
      '--ds-success',
      '--ds-warning',
      '--ds-danger',
    ]) {
      expect(root.get(name), `${name} (dark)`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(light.get(name), `${name} (light)`).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('kein Token verweist auf sich selbst', () => {
    for (const tokens of [root, light]) {
      const cyclic = [...tokens].filter(([name, value]) => refs(value).includes(name))
      expect(cyclic).toEqual([])
    }
  })

  it('Gold ist in beiden Themes der Akzent', () => {
    expect(root.get('--ds-accent')).toBe('#d4a257')
    expect(light.get('--ds-accent')).toBe('#c9984d')
  })
})

describe('App.vue: Aliase der Visualizer-Namen auf --ds-*', () => {
  const dsRoot = block(tokensCss, ':root')
  const aliases = block(appVue, ':root')
  const dark = block(appVue, "[data-theme='dark']")
  const light = block(appVue, "[data-theme='light']")

  it('jeder Alias zeigt auf ein vorhandenes --ds-Token, nie auf sich selbst', () => {
    for (const tokens of [aliases, dark, light]) {
      for (const [name, value] of tokens) {
        for (const ref of refs(value)) {
          expect(ref, `${name} → ${ref}`).not.toBe(name)
          expect(dsRoot.has(ref), `${name} → ${ref} fehlt in tokens-v2.css`).toBe(true)
        }
      }
    }
  })

  it('die Kern-Aliase sind reine var(--ds-*)-Verweise', () => {
    for (const name of [
      '--primary-bg',
      '--secondary-bg',
      '--card-bg',
      '--btn-hover',
      '--accent-primary',
      '--accent-tertiary',
      '--accent-text',
      '--text-primary',
      '--text-muted',
      '--border-color',
      '--ring',
    ]) {
      expect(aliases.get(name), name).toMatch(/^var\(--ds-[\w-]+\)$/)
    }
  })

  it('Dark und Light definieren dieselben theme-spezifischen Tokens', () => {
    expect([...light.keys()].sort()).toEqual([...dark.keys()].sort())
    expect(dark.get('--accent-ink')).toBe('var(--ds-accent)')
    expect(light.get('--accent-ink')).toBe('var(--ds-text)')
  })

  it('tokens-v2.css ist vor App.vue eingebunden', () => {
    const main = readFileSync(join(SRC, 'main.js'), 'utf8')
    expect(main.indexOf('./design-system/tokens-v2.css')).toBeGreaterThan(-1)
    expect(main.indexOf('./design-system/tokens-v2.css')).toBeLessThan(main.indexOf('./App.vue'))
  })
})

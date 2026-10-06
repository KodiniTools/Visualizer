// @vitest-environment node
/**
 * Status-Anzeige der Slideshow: Bereit, Läuft und Pausiert tragen den Status
 * als Punkt (ds-text-3 / ds-success / ds-warning), der Text bleibt neutral.
 * Die Farben kommen aus tokens-v2.css; die Kontrastprüfung löst die Tokens im
 * Light Theme auf (dort erreicht Statusfarbe als Text keine 4,5:1).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(
  join(SRC, 'components/foto-panel/slideshow/SlideshowStatusBadge.vue'),
  'utf8',
).split('<style scoped>')[1]
const tokensCss = readFileSync(join(SRC, 'design-system/tokens-v2.css'), 'utf8')

/** Deklarationen `--name: value` des Top-Level-Blocks mit genau diesem Selektor. */
function block(src, selector) {
  const re = new RegExp(`(?:^|\\n)${selector.replace(/[[\]'.]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
  const body = src.match(re)[1].replace(/\/\*[\s\S]*?\*\//g, '')
  const map = new Map()
  for (const decl of body.split(';')) {
    const i = decl.indexOf(':')
    if (i > 0)
      map.set(
        decl.slice(0, i).trim(),
        decl
          .slice(i + 1)
          .replace(/\s+/g, ' ')
          .trim(),
      )
  }
  return map
}
const themes = {
  dark: block(tokensCss, ':root'),
  light: block(tokensCss, ":root[data-theme='light']"),
}

function resolveHex(value, theme) {
  const m = value.match(/^var\((--[\w-]+)\)$/)
  if (!m) return value
  const next = themes[theme].get(m[1])
  expect(next, `${m[1]} fehlt in tokens-v2.css`).toBeDefined()
  return resolveHex(next, theme)
}

const rule = (sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(^|\\n)${esc} \\{([^}]*)\\}`))?.[2] ?? null
}
const decl = (body, prop) => body?.match(new RegExp(`(?:^|\\s)${prop}: ([^;]+);`))?.[1]
/** Wert für einen Zustand: Zustandsregel, sonst Basisregel. */
const stateDecl = (state, prop, pseudo = '') =>
  decl(rule(`.status-badge${state ? `.${state}` : ''}${pseudo}`), prop) ??
  decl(rule(`.status-badge${pseudo}`), prop)

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const l = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

describe('SlideshowStatusBadge', () => {
  it('keine eigenen Farbliterale, kein Light-Override nötig', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
    expect(css).not.toMatch(/\[data-theme='light'\]/)
  })

  it.each(['dark', 'light'])('%s: Bereit, Läuft und Pausiert haben drei Punktfarben', (theme) => {
    const dots = ['', 'active', 'paused'].map((s) =>
      resolveHex(stateDecl(s, 'background-color', '::before'), theme),
    )
    expect(dots.every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true)
    expect(new Set(dots).size).toBe(3)
    expect(stateDecl('active', 'background-color', '::before')).toBe('var(--ds-success)')
    expect(stateDecl('paused', 'background-color', '::before')).toBe('var(--ds-warning)')
  })

  it.each(['dark', 'light'])('%s: Text mit Kontrast ≥ 4,5:1 auf dem Badge', (theme) => {
    for (const state of ['', 'active', 'paused']) {
      const text = resolveHex(stateDecl(state, 'color'), theme)
      const bg = resolveHex(stateDecl(state, 'background-color'), theme)
      expect(contrast(text, bg), `${state || 'ready'} (${theme})`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

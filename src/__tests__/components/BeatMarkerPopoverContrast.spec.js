// @vitest-environment node
/**
 * Beat-Marker-Popover: Die grünen Buttons (AN/+ aktiv, Hinzufügen/Speichern)
 * tragen Text auf --ds-success. Im Light Theme ist --ds-success dunkelgrün,
 * dort war der Text (--accent-text, dunkelblau) kaum lesbar. Der Text nutzt
 * jetzt --ds-on-success und muss in beiden Themes mindestens 4,5:1 erreichen.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(
  join(SRC, 'components/sticky-player-bar/BeatMarkerPopover.vue'),
  'utf8',
).split('<style scoped>')[1]
const tokensCss = readFileSync(join(SRC, 'design-system/tokens-v2.css'), 'utf8')

const escapeRe = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Deklarationen `--name: value` des Top-Level-Blocks mit genau diesem Selektor. */
function block(src, selector) {
  const re = new RegExp(`(?:^|\\n)${escapeRe(selector)}\\s*\\{([^}]*)\\}`)
  const body = src.match(re)[1].replace(/\/\*[\s\S]*?\*\//g, '')
  const map = new Map()
  for (const d of body.split(';')) {
    const i = d.indexOf(':')
    if (i > 0) map.set(d.slice(0, i).trim(), d.slice(i + 1).trim())
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
  return css.match(new RegExp(`(^|\\n)${escapeRe(sel)} \\{([^}]*)\\}`))?.[2] ?? null
}
const decl = (body, prop) => body?.match(new RegExp(`(?:^|\\s)${prop}: ([^;]+);`))?.[1]

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const l = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

describe('BeatMarkerPopover – Kontrast der grünen Buttons', () => {
  const cases = []
  for (const theme of ['dark', 'light']) {
    for (const sel of ['.btn-toggle.active', '.btn-confirm']) cases.push([theme, sel])
  }

  it.each(cases)('%s: %s erreicht mindestens 4,5:1', (theme, sel) => {
    const body = rule(sel)
    expect(body, sel).not.toBeNull()
    const bg = resolveHex(decl(body, 'background-color'), theme)
    const fg = resolveHex(decl(body, 'color'), theme)
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })
})

// @vitest-environment node
/**
 * Status-Anzeige der Slideshow: Läuft (grün) und Pausiert (gelb) auch im
 * Hellmodus unterscheidbar – die allgemeine Hellmodus-Regel darf die
 * Statusfarben nicht überschreiben.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const file = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../components/foto-panel/slideshow/SlideshowStatusBadge.vue',
)
const css = readFileSync(file, 'utf8').split('<style scoped>')[1]
const rule = (sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(^|\\n)${esc} \\{([^}]*)\\}`))?.[2] ?? null
}
const color = (body) => body.match(/(?:^|\s)color: (#[0-9a-f]{6})/i)?.[1]
const bg = (body) => body.match(/background-color: ([^;]+);/)?.[1]

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const l = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}
function blend(rgba, pageHex) {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number)
  const p = [1, 3, 5].map((i) => parseInt(pageHex.slice(i, i + 2), 16))
  return (
    '#' +
    [r, g, b]
      .map((v, i) =>
        Math.round(a * v + (1 - a) * p[i])
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

describe('SlideshowStatusBadge – Hellmodus', () => {
  it('eigene Farben für Läuft und Pausiert (nach der allgemeinen Hellmodus-Regel)', () => {
    const base = rule("[data-theme='light'] .status-badge")
    const active = rule("[data-theme='light'] .status-badge.active")
    const paused = rule("[data-theme='light'] .status-badge.paused")
    expect(base && active && paused).toBeTruthy()
    const colors = new Set([color(base), color(active), color(paused)])
    expect(colors.size).toBe(3) // Bereit, Läuft, Pausiert unterscheidbar
    expect(css.indexOf("[data-theme='light'] .status-badge.active")).toBeGreaterThan(
      css.indexOf("[data-theme='light'] .status-badge {"),
    )
  })

  it('Kontrast ≥ 4,5:1 auf allen hellen Hintergründen des Fensters/Panels', () => {
    for (const state of ['active', 'paused']) {
      const body = rule(`[data-theme='light'] .status-badge.${state}`)
      for (const page of ['#ffffff', '#f9f2d5', '#f0ead0']) {
        expect(
          contrast(color(body), blend(bg(body), page)),
          `${state} auf ${page}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

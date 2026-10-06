// @vitest-environment node
/**
 * Regressionsschutz für das Design-System v2 (Gegenstück zu designTokens.spec.ts
 * im Collage Maker): Komponenten-Styles und Stylesheets laufen ausschließlich
 * auf den Tokens aus src/design-system/tokens-v2.css. Keine Farbliterale (außer
 * Weiß/Schwarz und deren Tönungen für Scrims), keine Pixel-Schriftgrößen,
 * nur die drei Radien, Schatten nur als Fokus-Ring oder Overlay, keine
 * Verläufe, kein Blur, keine Scale-Hover, Dauern nur aus den Tokens.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..')
// lib/style.css ist ein nicht eingebundenes Alt-Stylesheet; design-system/ hält die Literale.
const SKIP = ['design-system', '__tests__', join('lib', 'style.css')]

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (SKIP.some((s) => full.includes(s))) continue
    if (statSync(full).isDirectory()) collect(full, out)
    else if (entry.endsWith('.vue') || entry.endsWith('.css')) out.push(full)
  }
  return out
}

/** Alle Style-Blöcke als [datei, css]; Kommentare und @font-face (Schriftname und Datei sind dort Literale) ausgeblendet. */
const sheets = collect(SRC).flatMap((file) => {
  const src = readFileSync(file, 'utf8')
  const blocks = file.endsWith('.vue')
    ? [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
    : [src]
  return blocks.map((css) => [
    relative(SRC, file),
    css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\s*\{[^}]*\}/g, ''),
  ])
})

/** Treffer `datei: fund` für ein Muster (mit g-Flag) in allen Style-Blöcken. */
function find(pattern, filter = () => true) {
  const hits = []
  for (const [file, css] of sheets) {
    for (const m of css.matchAll(pattern)) {
      if (filter(m)) hits.push(`${file}: ${m[0].trim().replace(/\s+/g, ' ').slice(0, 80)}`)
    }
  }
  return hits
}

/** Regeln `selektor { body }` (flach; @media-Blöcke liefern ihre inneren Regeln). */
function rules() {
  const out = []
  for (const [file, css] of sheets) {
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({ file, sel: m[1].trim(), body: m[2] })
    }
  }
  return out
}

const NEUTRAL =
  /^(#fff|#ffffff|#000|#000000)$|^rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255|0 0 0|255 255 255)\b/

describe('Design-Tokens in Komponenten-Styles', () => {
  it('keine Farbliterale außer Weiß/Schwarz(-Tönungen)', () => {
    const hits = find(
      /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi,
      (m) => !NEUTRAL.test(m[0].toLowerCase()),
    )
    expect(hits).toEqual([])
  })

  it('Schriftgrößen nur aus der Token-Skala (keine px/rem/em-Literale)', () => {
    expect(find(/font-size:\s*[0-9.]*[1-9][0-9.]*(px|rem|em)\b/g)).toEqual([])
    expect(find(/font-size:\s*var\(--text-/g)).toEqual([])
  })

  it('Schriftfamilie nur über Tokens', () => {
    const allowed = /^(var\(--ds-font-(sans|mono)\)|var\(--font-sans\)|inherit)$/
    expect(find(/font-family:\s*([^;]+)/g, (m) => !allowed.test(m[1].trim()))).toEqual([])
  })

  it('nur die drei Radien (sm, md, lg) und full', () => {
    const hits = find(
      /border(-[a-z]+)*-radius:\s*([^;]+)/g,
      (m) => !/^calc\(/.test(m[2].trim()) && /\b[1-9][0-9]*(px|%|rem)/.test(m[2]),
    )
    expect(hits).toEqual([])
  })

  it('Schatten nur als Fokus-Ring, Overlay oder 1-px-Innenrahmen; kein Blur, kein Text-Schatten', () => {
    const shadows = find(/box-shadow:\s*([^;]+)/g, (m) => {
      const v = m[1].trim()
      if (['none', 'var(--ds-focus-ring)', 'var(--ds-shadow-overlay)'].includes(v)) return false
      return !/^inset 0 0 0 1px .+$/.test(v)
    })
    expect(shadows).toEqual([])
    expect(find(/text-shadow:|backdrop-filter:|drop-shadow\(/g)).toEqual([])
  })

  it('keine Farbverläufe (Scrims aus Transparent/Schwarz/Weiß ausgenommen)', () => {
    const hits = find(
      /[a-z-]*gradient\([^;]*/g,
      (m) => !/transparent|rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)/.test(m[0]),
    )
    expect(hits).toEqual([])
  })

  it('Hover ändert nur Farbe: kein scale/translate/rotate in :hover-Regeln', () => {
    const hits = rules()
      .filter(
        (r) =>
          /:hover/.test(r.sel) &&
          /transform:\s*[^;]*(scale\(|translate[XY]?\(-?[1-9]|rotate\()/.test(r.body),
      )
      .map((r) => `${r.file}: ${r.sel}`)
    expect(hits).toEqual([])
  })

  it('Dauern nur aus den Tokens (Ausnahme: lineare Fortschritts-Übergänge ≤ 0,1 s)', () => {
    const hits = find(/transition:\s*([^;]+)/g, (m) =>
      [...m[1].matchAll(/([0-9.]+)(ms|s)\b/g)].some(
        ([, n, unit]) => Number(n) * (unit === 'ms' ? 0.001 : 1) >= 0.12,
      ),
    )
    expect(hits).toEqual([])
  })

  it('Ebenen über --ds-z-* (numerische z-index nur bis 100)', () => {
    expect(find(/z-index:\s*([0-9]+)/g, (m) => Number(m[1]) > 100)).toEqual([])
  })
})

describe('Grundschrift und Schriftdatei', () => {
  const appVue = readFileSync(join(SRC, 'App.vue'), 'utf8')
  const shell = readFileSync(join(SRC, 'styles/visualizer-app.css'), 'utf8')

  it('die Grundgröße der App ist --ds-text-md (14 px)', () => {
    expect(appVue).toMatch(/#app \{[^}]*font-size: var\(--ds-text-md\)/)
    expect(shell).toMatch(/#app \{[^}]*font-size: var\(--ds-text-md\)/)
  })

  it.each([400, 500, 700])('deklariert @font-face für Supreme %i', (weight) => {
    const faces = appVue.match(/@font-face\s*\{[^}]*\}/g) ?? []
    const match = faces.find((face) => new RegExp(`font-weight:\\s*${weight}\\b`).test(face))
    expect(match, `Kein @font-face für Supreme ${weight}`).toBeDefined()
    expect(match).toMatch(/\/fonts\/Supreme-(Regular|Medium|Bold)\.woff2/)
  })
})

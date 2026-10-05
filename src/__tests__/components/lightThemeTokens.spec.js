// @vitest-environment node
/**
 * Light-Theme-Overrides färben nur über Tokens.
 *
 * Die Komponenten tragen keine Navy-/Creme-Literale mehr in ihren
 * `[data-theme='light']`- bzw. `.light-theme`-Regeln (#014f99, #003971,
 * #4d6d8e, rgba(1, 79, 153, …) …), sondern lesen --accent-primary,
 * --accent-ink, --text-primary, --text-muted, --border-color, --card-bg usw.
 * aus App.vue. So wirkt eine Theme-Änderung (z. B. Gold als Akzent im Light
 * Theme) an einer Stelle statt an rund 40.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name !== '__tests__' && name !== 'lib') walk(p, out)
    } else if (/\.(vue|css)$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

/** Alle CSS-Regelblöcke `selector { body }` eines Stylesheets, verschachtelt (@media) inklusive. */
function rules(css) {
  const out = []
  const stack = []
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === '{') {
      let j = i - 1
      while (j >= 0 && !';{}'.includes(css[j])) j--
      stack.push({ sel: css.slice(j + 1, i).trim(), start: i })
    } else if (c === '}' && stack.length) {
      const { sel, start } = stack.pop()
      out.push({ sel, body: css.slice(start + 1, i) })
    }
  }
  return out
}

const LIGHT = /\[data-theme=['"]light['"]\]|\.light-theme/
const NAVY_LITERAL =
  /#014f99|#003971|#073f74|#013a70|#4d6d8e|#3a7cc5|rgba?\(\s*1\s*,\s*79\s*,\s*153|rgba?\(\s*7\s*,\s*63\s*,\s*116|rgba?\(\s*0\s*,\s*57\s*,\s*113/i

describe('Light-Theme-Overrides nutzen Tokens statt Navy-Literalen', () => {
  const files = [...walk(join(SRC, 'components')), join(SRC, 'styles', 'visualizer-app.css')]

  it('findet die Komponenten', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it.each(files.map((f) => [relative(SRC, f), f]))('%s', (_rel, file) => {
    const src = readFileSync(file, 'utf8')
    const css = file.endsWith('.vue')
      ? [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
      : src
    const masked = css.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    const offenders = rules(masked)
      .filter((r) => LIGHT.test(r.sel) && !r.sel.startsWith('@') && !r.body.includes('{'))
      .filter((r) => NAVY_LITERAL.test(r.body))
      .map((r) => `${r.sel} { ${r.body.trim().replace(/\s+/g, ' ')} }`)
    expect(offenders, 'Light-Regel mit Navy-Literal').toEqual([])
  })
})

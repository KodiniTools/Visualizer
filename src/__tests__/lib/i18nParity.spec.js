import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel) => readFileSync(join(SRC, rel), 'utf8')

/** Verschachtelte Übersetzungen als Map 'a.b.c' → Wert. */
function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v]],
  )
}

const placeholders = (s) =>
  typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []

/**
 * Doppelte Schlüssel im Quelltext finden (im Objekt überschreibt der letzte
 * stillschweigend den ersten). Die Dateien sind mit Prettier formatiert:
 * jedes Objekt öffnet mit `{` am Zeilenende und schließt mit `}` am
 * Zeilenanfang; Arrays mit `[`/`]` entsprechend.
 */
function duplicateKeys(source) {
  const stack = [{ keys: new Set(), path: '' }]
  const dups = []
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    if (/^[}\]]/.test(line)) stack.pop()
    const m = line.match(/^(['"]?)([\w$-]+)\1:\s*(.*)$/)
    const scope = stack.at(-1)
    if (m && scope) {
      if (scope.keys.has(m[2])) dups.push(`${scope.path}${m[2]}`)
      scope.keys.add(m[2])
    }
    const opens = /[{[]$/.test(line)
    if (opens) {
      const path = m ? `${scope?.path ?? ''}${m[2]}.` : `${scope?.path ?? ''}[].`
      stack.push({ keys: new Set(), path })
    }
  }
  return dups
}

describe('i18n – DE/EN-Parität', () => {
  const D = new Map(flatten(de))
  const E = new Map(flatten(en))

  it('beide Sprachen haben dieselben Schlüssel', () => {
    expect([...D.keys()].filter((k) => !E.has(k))).toEqual([])
    expect([...E.keys()].filter((k) => !D.has(k))).toEqual([])
  })

  it('gleicher Typ und gleiche Platzhalter je Schlüssel', () => {
    const mismatch = [...D.keys()].filter(
      (k) =>
        typeof D.get(k) !== typeof E.get(k) ||
        placeholders(D.get(k)).join() !== placeholders(E.get(k)).join(),
    )
    expect(mismatch).toEqual([])
  })

  it('keine leeren Übersetzungen', () => {
    const empty = [...D, ...E].filter(([, v]) => v === '').map(([k]) => k)
    expect(empty).toEqual([])
  })

  it.each(['lib/i18n/de.js', 'lib/i18n/en.js'])('%s enthält keine doppelten Schlüssel', (f) => {
    expect(duplicateKeys(read(f))).toEqual([])
  })

  it('Duplikat-Suche erkennt doppelte Schlüssel je Ebene', () => {
    const src = [
      'export default {',
      '  a: {',
      "    x: '1',",
      "    x: '2',",
      '  },',
      '  b: {',
      "    x: '3',",
      '    list: [',
      '      {',
      "        id: 'a',",
      '      },',
      '      {',
      "        id: 'b',",
      '      },',
      '    ],',
      '  },',
      '}',
    ].join('\n')
    // x in a doppelt; x in b und id je Listeneintrag sind eigene Ebenen
    expect(duplicateKeys(src)).toEqual(['[].a.x'])
  })
})

/** Sichtbarer Text im Template, der nicht über t() läuft. */
function hardcodedTemplateText(source) {
  const tpl = (source.match(/<template>([\s\S]*)<\/template>/) || [])[1] || ''
  // HTML-Kommentare ohne Regex-Ersetzung entfernen (alles ab `<!--` bis `-->`)
  const clean = tpl
    .split('<!--')
    .map((part, i) => (i === 0 ? part : part.slice(part.indexOf('-->') + 3)))
    .join('')
  const hits = []
  for (const m of clean.matchAll(/>([^<>]*)</g)) {
    const txt = m[1]
      .replace(/\{\{[\s\S]*?\}\}/g, '')
      .replace(/&[a-z]+;/g, ' ')
      .trim()
    if (/[A-Za-zÄÖÜäöüß]{3,}/.test(txt)) hits.push(txt)
  }
  for (const m of clean.matchAll(/(?<![:@\w-])(title|placeholder|aria-label)="([^"]*)"/g)) {
    const isHexColor = /^#[0-9a-f]{3,8}$/i.test(m[2])
    if (!isHexColor && /[A-Za-zÄÖÜäöüß]{3,}/.test(m[2])) hits.push(`${m[1]}="${m[2]}"`)
  }
  // Sprachweichen im Template statt Übersetzungsschlüssel
  for (const m of clean.matchAll(/locale\s*===\s*['"]\w+['"]/g)) hits.push(m[0])
  return hits
}

describe('i18n – Text-Manager ohne fest verdrahtete Texte', () => {
  it.each([
    'components/text-manager/TextNewForm.vue',
    'components/text-manager/text-edit/TextContentSection.vue',
    'components/text-manager/text-edit/TextRotationSection.vue',
    'components/text-manager/text-edit/TextSpacingStrokeSection.vue',
    'components/text-manager/text-edit/TextPositionSection.vue',
    'components/text-manager/text-new-form/PositionSection.vue',
  ])('%s', (f) => {
    expect(hardcodedTemplateText(read(f))).toEqual([])
  })
})

describe('i18n – Kachel-Hintergrund ohne fest verdrahtete Texte', () => {
  it.each([
    'components/BackgroundTilesPanel.vue',
    'components/background-tiles/SelectedTileEditor.vue',
    'components/background-tiles/TileGridControls.vue',
    'components/background-tiles/TileImageSection.vue',
    'components/background-tiles/TilePresetsSection.vue',
    'components/background-tiles/TileGalleryModal.vue',
  ])('%s', (f) => {
    expect(hardcodedTemplateText(read(f))).toEqual([])
  })
})

describe('i18n – Beat-Marker-Popover ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte und keine Sprachweichen', () => {
    const src = read('components/sticky-player-bar/BeatMarkerPopover.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/locale\s*===/)
  })
})

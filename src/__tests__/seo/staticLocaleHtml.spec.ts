import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderStaticLocaleHtml, staticLocaleFileName } from '../../lib/staticLocaleHtml'
import { SITE_BASE, appSeo, blogSeo, landingSeo } from '../../router/routeSeo'
import type { RouteHeadMeta } from '../../router/seoHead'

// Echte Vorlage: Die Variante muss mit der aktuellen index.html funktionieren.
const template = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')
const metaContent = (doc: Document, selector: string) =>
  doc.querySelector(selector)?.getAttribute('content')

describe('staticLocaleFileName', () => {
  it.each([
    [`${SITE_BASE}/`, 'index.en.html'],
    [`${SITE_BASE}/app`, 'app.en.html'],
    [`${SITE_BASE}/blog`, 'blog.en.html'],
  ])('%s → %s', (canonical, file) => {
    expect(staticLocaleFileName(canonical, SITE_BASE, 'en')).toBe(file)
  })

  it('lehnt fremde Basis und ungültige Pfade ab', () => {
    expect(() => staticLocaleFileName('https://example.com/app', SITE_BASE, 'en')).toThrow()
    expect(() => staticLocaleFileName(`${SITE_BASE}/../x`, SITE_BASE, 'en')).toThrow()
  })
})

describe('renderStaticLocaleHtml (en)', () => {
  it.each([
    ['/', landingSeo],
    ['/app', appSeo],
    ['/blog', blogSeo],
  ] as [string, RouteHeadMeta][])(
    '%s: lang, Titel, Description, Canonical, hreflang',
    (_p, meta) => {
      const doc = parse(renderStaticLocaleHtml(template, meta, 'en'))
      const canonical = `${meta.canonical}?lang=en`

      expect(doc.documentElement.getAttribute('lang')).toBe('en')
      expect(doc.title).toBe(meta.en!.title)
      expect(metaContent(doc, 'meta[name="description"]')).toBe(meta.en!.description)
      expect(metaContent(doc, 'meta[name="robots"]')).toBe('index, follow')
      expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
      expect(doc.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(canonical)
      expect(
        [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
          l.getAttribute('hreflang'),
          l.getAttribute('href'),
        ]),
      ).toEqual([
        ['de', meta.canonical],
        ['en', canonical],
        ['x-default', meta.canonical],
      ])
      expect(metaContent(doc, 'meta[property="og:url"]')).toBe(canonical)
      expect(metaContent(doc, 'meta[name="twitter:url"]')).toBe(canonical)
      expect(metaContent(doc, 'meta[property="og:title"]')).toBe(meta.en!.title)
      expect(metaContent(doc, 'meta[property="og:description"]')).toBe(meta.en!.description)
      expect(metaContent(doc, 'meta[name="twitter:title"]')).toBe(meta.en!.title)
      expect(metaContent(doc, 'meta[property="og:locale"]')).toBe('en_US')
      expect(metaContent(doc, 'meta[property="og:locale:alternate"]')).toBe('de_DE')
      expect(doc.querySelector('noscript p')!.textContent).toMatch(/enable JavaScript/)
    },
  )

  it('FAQ-JSON-LD nur auf der Landingpage', () => {
    expect(renderStaticLocaleHtml(template, landingSeo, 'en')).toContain('id="ld-faq"')
    expect(renderStaticLocaleHtml(template, appSeo, 'en')).not.toContain('id="ld-faq"')
    expect(renderStaticLocaleHtml(template, blogSeo, 'en')).not.toContain('id="ld-faq"')
  })

  it('lässt Skripte, SSI-Includes und Mount-Punkt unverändert', () => {
    const out = renderStaticLocaleHtml(template, appSeo, 'en')
    expect(out).toContain('<!--#include virtual="/partials/nav.html" -->')
    expect(out).toContain('<div id="app"></div>')
    expect(out).toContain('src="/src/main.ts"')
    expect(out).toContain("'GTM-KBNF8DV7'")
  })

  it('escaped Sonderzeichen in Attributen und Titel', () => {
    const meta = { ...appSeo, en: { title: 'A & "B" <C>', description: 'x "y"' } }
    const out = renderStaticLocaleHtml(template, meta, 'en')
    expect(out).toContain('<title>A &amp; &quot;B&quot; &lt;C&gt;</title>')
    expect(out).toContain('<meta name="description" content="x &quot;y&quot;">')
  })

  it('noindex-Seite: Canonical ja, hreflang nein', () => {
    const meta = { ...appSeo, robots: 'noindex, follow' }
    const doc = parse(renderStaticLocaleHtml(template, meta, 'en'))
    expect(doc.querySelector('link[rel="canonical"]')).not.toBeNull()
    expect(doc.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(0)
  })

  it('bricht ab statt halb übersetztes HTML zu liefern', () => {
    expect(() => renderStaticLocaleHtml(template, { canonical: `${SITE_BASE}/x` }, 'en')).toThrow()
    expect(() =>
      renderStaticLocaleHtml('<html lang="de"><head></head></html>', appSeo, 'en'),
    ).toThrow()
    const withCanonical = template.replace('</head>', '<link rel="canonical" href="x"></head>')
    expect(() => renderStaticLocaleHtml(withCanonical, appSeo, 'en')).toThrow(/doppeln/)
  })

  it('die deutsche Vorlage bleibt unverändert (keine Mutation, kein statisches Canonical)', () => {
    const before = template
    renderStaticLocaleHtml(template, landingSeo, 'en')
    expect(template).toBe(before)
    expect(template).toMatch(/<html lang="de">/)
    expect(template).not.toMatch(/rel="canonical"/)
  })
})

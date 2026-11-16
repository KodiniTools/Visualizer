// Erzeugt aus der gebauten (deutschen) index.html eine statische Sprachvariante
// pro Seite, z. B. app.en.html. nginx liefert sie bei ?lang=en aus, damit Crawler
// ohne JavaScript schon im HTML englischen Titel, Description, Canonical,
// hreflang und <html lang="en"> sehen. Die Werte entsprechen dem, was
// applyRouteHead() (router/seoHead.ts) im Browser setzt.
// Läuft im Build (Node), deshalb reine String-Verarbeitung ohne DOM.
import { localeUrls, type Locale } from './localeSeo'
import type { RouteHeadMeta } from '../router/seoHead'

/** Seitenunabhängige Texte der Sprachvariante */
export interface StaticLocaleTexts {
  /** og:locale, z. B. en_US */
  ogLocale: string
  /** og:locale:alternate, z. B. de_DE */
  ogLocaleAlternate: string
  /** Alt-Text des Vorschaubilds (og:image:alt, twitter:image:alt) */
  imageAlt: string
  /** Text im <noscript>-Hinweis */
  noscript: string
}

export const STATIC_TEXTS_EN: StaticLocaleTexts = {
  ogLocale: 'en_US',
  ogLocaleAlternate: 'de_DE',
  imageAlt: 'Audio Visualizer Pro – browser-based music visualizer',
  noscript: 'Please enable JavaScript to use Audio Visualizer Pro.',
}

/** Dateiname der Sprachvariante: '/' → index.en.html, '/app' → app.en.html */
export function staticLocaleFileName(canonical: string, baseUrl: string, locale: Locale): string {
  if (!canonical.startsWith(baseUrl)) {
    throw new Error(`Canonical ${canonical} liegt nicht unter ${baseUrl}`)
  }
  const slug = canonical.slice(baseUrl.length).replace(/^\/+|\/+$/g, '')
  if (!/^[a-z0-9-]*$/.test(slug)) throw new Error(`Ungültiger Seitenpfad: ${slug}`)
  return `${slug || 'index'}.${locale}.html`
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Ersetzt genau ein Vorkommen; fehlt das Muster, bricht der Build ab. */
function replaceRequired(html: string, pattern: RegExp, replacement: string, what: string) {
  if (!pattern.test(html)) {
    throw new Error(`index.html: ${what} nicht gefunden – Sprachvariante kann nicht erzeugt werden`)
  }
  return html.replace(pattern, () => replacement)
}

function setMetaContent(html: string, attr: 'name' | 'property', key: string, value: string) {
  const pattern = new RegExp(`(<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content=")[^"]*(")`)
  const match = pattern.exec(html)
  if (!match) {
    throw new Error(`index.html: <meta ${attr}="${key}"> nicht gefunden`)
  }
  return html.replace(pattern, () => `${match[1]}${escapeHtml(value)}${match[2]}`)
}

/**
 * Entfernt das <script id="ld-faq">-Element samt Einrückung und Zeilenumbruch.
 * Per Index statt Regex: schneidet genau den Block bis zum zugehörigen </script>.
 */
function removeFaqScript(html: string): string {
  const start = html.indexOf('<script id="ld-faq"')
  if (start === -1) return html
  const close = html.indexOf('</script>', start)
  if (close === -1) throw new Error('index.html: <script id="ld-faq"> ohne </script>')
  const lineStart = html.lastIndexOf('\n', start) + 1
  const from = /^[ \t]*$/.test(html.slice(lineStart, start)) ? lineStart : start
  let to = close + '</script>'.length
  if (html[to] === '\n') to += 1
  return html.slice(0, from) + html.slice(to)
}

/**
 * Baut die statische Sprachvariante einer Seite.
 * @param html gebaute index.html (deutsch)
 * @param meta Route-Meta der Seite (mit `en`-Texten)
 * @param locale Zielsprache (derzeit nur 'en')
 * @param texts seitenunabhängige Texte der Zielsprache
 */
export function renderStaticLocaleHtml(
  html: string,
  meta: RouteHeadMeta,
  locale: Exclude<Locale, 'de'>,
  texts: StaticLocaleTexts = STATIC_TEXTS_EN,
): string {
  const localized = meta[locale]
  if (!meta.canonical || !localized?.title || !localized.description) {
    throw new Error(`Seite ohne Canonical oder ohne ${locale}-Titel/-Description`)
  }
  const { title, description } = localized
  const robots = meta.robots ?? 'index, follow'
  const { canonical, alternates } = localeUrls(meta.canonical, locale)

  let out = replaceRequired(html, /<html\s+lang="[^"]*"/, `<html lang="${locale}"`, '<html lang>')
  out = replaceRequired(
    out,
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
    '<title>',
  )
  out = setMetaContent(out, 'name', 'description', description)
  out = setMetaContent(out, 'name', 'robots', robots)
  out = setMetaContent(out, 'property', 'og:url', canonical)
  out = setMetaContent(out, 'property', 'og:title', title)
  out = setMetaContent(out, 'property', 'og:description', description)
  out = setMetaContent(out, 'property', 'og:image:alt', texts.imageAlt)
  out = setMetaContent(out, 'property', 'og:locale', texts.ogLocale)
  out = setMetaContent(out, 'property', 'og:locale:alternate', texts.ogLocaleAlternate)
  out = setMetaContent(out, 'name', 'twitter:title', title)
  out = setMetaContent(out, 'name', 'twitter:description', description)
  out = setMetaContent(out, 'name', 'twitter:image:alt', texts.imageAlt)
  out = setMetaContent(out, 'name', 'twitter:url', canonical)

  // Canonical + hreflang direkt hinter <meta name="robots">; hreflang nur auf
  // indexierbaren Seiten (wie applyRouteHead).
  const indexable = !/\bnoindex\b/i.test(robots)
  const links = [`<link rel="canonical" href="${escapeHtml(canonical)}">`]
  if (indexable) {
    for (const { hreflang, href } of alternates) {
      links.push(`<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}">`)
    }
  }
  if (/<link\s+rel="(canonical|alternate)"/.test(out)) {
    throw new Error('index.html enthält bereits Canonical/hreflang – Variante würde sie doppeln')
  }
  out = out.replace(/<!--\s*Canonical & hreflang:[\s\S]*?-->\s*/, '')
  const robotsTag = /<meta\s+name="robots"[^>]*>/.exec(out)
  if (!robotsTag) throw new Error('index.html: <meta name="robots"> nicht gefunden')
  const insertAt = robotsTag.index + robotsTag[0].length
  out = `${out.slice(0, insertAt)}\n    ${links.join('\n    ')}${out.slice(insertAt)}`

  // FAQ-JSON-LD nur auf der Seite, die die FAQ zeigt (wie setFaqMarkup).
  if (!meta.faq) out = removeFaqScript(out)

  out = out.replace(
    /(<noscript>[\s\S]*?<p>)[^<]*(<\/p>)/,
    (_m, open: string, close: string) => `${open}${escapeHtml(texts.noscript)}${close}`,
  )
  return out
}

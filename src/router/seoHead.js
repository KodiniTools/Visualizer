// Setzt die SEO-relevanten <head>-Elemente pro Route (Title, Description,
// Robots, Open Graph/Twitter, Canonical, hreflang, FAQ-JSON-LD).
// Alle Routen teilen sich dieselbe index.html – deshalb clientseitig.
// Deutsch hat die URL ohne Parameter, Englisch dieselbe URL mit ?lang=en.

import { localeUrls } from '../lib/localeSeo.js'

// FAQ-Markup gehört nur auf die Seite, die die FAQ sichtbar zeigt (Landingpage).
// Das statische <script id="ld-faq"> aus index.html wird auf anderen Routen
// aus dem <head> genommen und bei Rückkehr wieder eingehängt.
let faqScript = null

/**
 * @param {{ title?: string, description?: string, canonical?: string,
 *   robots?: string, faq?: boolean, en?: { title?: string, description?: string } }} meta Route-Meta
 * @param {'de' | 'en'} [locale] aktive Sprache
 */
export function applyRouteHead(meta = {}, locale = 'de') {
  const lang = locale === 'en' ? 'en' : 'de'
  const texts = lang === 'en' && meta.en ? { ...meta, ...meta.en } : meta
  const { title, description } = texts
  const { robots = 'index, follow', faq = false } = meta
  const indexable = !/\bnoindex\b/i.test(robots)
  const urls = meta.canonical ? localeUrls(meta.canonical, lang) : null
  const canonical = urls?.canonical

  if (title) document.title = title

  setMeta('name', 'description', description)
  setMeta('name', 'robots', robots)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', canonical)
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:url', canonical)

  setCanonical(canonical)
  // hreflang nur auf indexierbaren Seiten – auf noindex-Seiten ohne Wirkung.
  for (const { hreflang, href } of urls?.alternates ?? []) {
    setAlternate(hreflang, indexable ? href : null)
  }

  setFaqMarkup(faq)
}

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  if (!href) return
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// href = null entfernt den Link.
function setAlternate(hreflang, href) {
  let el = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
  if (!href) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'alternate')
    el.setAttribute('hreflang', hreflang)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setFaqMarkup(enabled) {
  // Ein im DOM vorhandenes Element hat Vorrang vor dem gemerkten (entfernten).
  faqScript = document.getElementById('ld-faq') ?? faqScript
  if (!faqScript) return
  if (enabled && !faqScript.isConnected) document.head.appendChild(faqScript)
  else if (!enabled && faqScript.isConnected) faqScript.remove()
}

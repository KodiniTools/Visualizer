// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { applyRouteHead } from '../../router/seoHead.js'

const BASE = 'https://kodinitools.com/visualizer'
const landing = { title: 'Start', canonical: `${BASE}/`, robots: 'index, follow', faq: true }
const app = { title: 'App', canonical: `${BASE}/app`, robots: 'noindex, follow' }

const robots = () => document.querySelector('meta[name="robots"]').getAttribute('content')
const alternates = () => document.querySelectorAll('link[rel="alternate"][hreflang]')
const faq = () => document.getElementById('ld-faq')

describe('applyRouteHead', () => {
  beforeEach(() => {
    document.head.innerHTML =
      '<meta name="robots" content="index, follow">' +
      '<script id="ld-faq" type="application/ld+json">{"@type":"FAQPage"}</script>'
  })

  it('indexierbare Seite: robots, canonical, hreflang und FAQ-Markup', () => {
    applyRouteHead(landing)
    expect(document.title).toBe('Start')
    expect(robots()).toBe('index, follow')
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${BASE}/`)
    expect([...alternates()].map((l) => l.getAttribute('hreflang'))).toEqual([
      'de',
      'en',
      'x-default',
    ])
    expect(faq()).not.toBeNull()
  })

  it('noindex-Seite: kein hreflang, kein FAQ-Markup', () => {
    applyRouteHead(landing)
    applyRouteHead(app)
    expect(robots()).toBe('noindex, follow')
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${BASE}/app`)
    expect(alternates()).toHaveLength(0)
    expect(faq()).toBeNull()
  })

  it('hängt das FAQ-Markup bei Rückkehr zur Landingpage wieder ein', () => {
    applyRouteHead(app)
    expect(faq()).toBeNull()
    applyRouteHead(landing)
    expect(faq()).not.toBeNull()
    expect(alternates()).toHaveLength(3)
  })

  it('ohne robots-Angabe gilt index, follow', () => {
    applyRouteHead({ title: 'X' })
    expect(robots()).toBe('index, follow')
  })
})

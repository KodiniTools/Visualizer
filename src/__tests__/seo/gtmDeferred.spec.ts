import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const html = readFileSync(join(__dirname, '..', '..', '..', 'index.html'), 'utf8')
const gtmSnippet = (() => {
  const m = html.match(/<script>\s*(\(function\(w,d,s,l,i\)[\s\S]*?GTM-KBNF8DV7'\);)\s*<\/script>/)
  if (!m) throw new Error('GTM-Snippet nicht gefunden')
  return m[1]!
})()

const gtmScripts = () => document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')
type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] }

describe('index.html: Google Tag Manager verzögert', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.head.innerHTML = '<script></script>'
    delete (window as DataLayerWindow).dataLayer
  })
  afterEach(() => {
    // Offene Listener/Timer dieses Laufs auslösen, damit sie den nächsten Test nicht beeinflussen
    window.dispatchEvent(new Event('pointerdown'))
    vi.runAllTimers()
    gtmScripts().forEach((el) => el.remove())
    vi.useRealTimers()
  })

  const run = () => new Function(gtmSnippet)()

  it('setzt dataLayer und gtm.start sofort, lädt gtm.js aber noch nicht', () => {
    run()
    const dl = (window as DataLayerWindow).dataLayer!
    expect(dl[0]).toMatchObject({ event: 'gtm.js' })
    expect(typeof dl[0]!['gtm.start']).toBe('number')
    expect(gtmScripts()).toHaveLength(0)
  })

  it('lädt gtm.js bei der ersten Interaktion genau einmal', () => {
    run()
    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('keydown'))
    vi.advanceTimersByTime(10000)
    expect(gtmScripts()).toHaveLength(1)
  })

  it('lädt gtm.js ohne Interaktion 5 s nach dem load-Event (document bereits complete)', () => {
    run()
    vi.advanceTimersByTime(4999)
    expect(gtmScripts()).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(gtmScripts()).toHaveLength(1)
  })
})

import { describe, it, expect } from 'vitest'
import { FONT_BASE_URL, fontUrl } from '../../lib/fontUrl.js'
import { FontManager } from '../../lib/fontManager.js'

describe('fontUrl', () => {
  it('verweist auf den gemeinsamen Font-Ordner der Domain', () => {
    expect(FONT_BASE_URL).toBe('/fonts/')
    expect(fontUrl('Alpino-Black.woff2')).toBe('/fonts/Alpino-Black.woff2')
  })

  it('FontManager nutzt denselben Pfad für @font-face und FontFace-API', () => {
    const fm = new FontManager()
    expect(fm.getFontUrl('Supreme-Regular.woff2')).toBe('/fonts/Supreme-Regular.woff2')
    expect(fm.createFontCSS([{ name: 'X', file: 'X.woff2' }])).toContain('url("/fonts/X.woff2")')
  })
})

import { describe, it, expect } from 'vitest'
import {
  formatScreenshotSize,
  screenshotFileName,
} from '../../composables/screenshot/useCanvasScreenshot.js'

describe('useCanvasScreenshot – Hilfsfunktionen', () => {
  it('formatScreenshotSize: B, KB (1 Stelle), MB (2 Stellen)', () => {
    expect(formatScreenshotSize(0)).toBe('0 B')
    expect(formatScreenshotSize(1023)).toBe('1023 B')
    expect(formatScreenshotSize(1024)).toBe('1.0 KB')
    expect(formatScreenshotSize(1536)).toBe('1.5 KB')
    expect(formatScreenshotSize(5 * 1024 * 1024)).toBe('5.00 MB')
  })

  it('screenshotFileName: Maße, Zeitstempel ohne ms, jpeg → jpg', () => {
    const now = new Date('2026-11-01T10:20:30.456Z')
    expect(screenshotFileName('jpeg', 1920, 1080, now)).toBe(
      'screenshot_1920x1080_2026-11-01T10-20-30.jpg',
    )
    expect(screenshotFileName('png', 1, 2, now)).toBe('screenshot_1x2_2026-11-01T10-20-30.png')
    expect(screenshotFileName('webp', 3, 4, now)).toBe('screenshot_3x4_2026-11-01T10-20-30.webp')
  })
})

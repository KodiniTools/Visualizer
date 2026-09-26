import { describe, it, expect, beforeEach } from 'vitest'
import {
  SLIDESHOW_FILL_AUDIO_DEFAULT,
  applySlideshowFillAudio,
  computeSlideshowFillAudio,
  isSameSlideshowFillAudio,
  loadStoredSlideshowFillAudio,
  normalizeSlideshowFillAudio,
  storeSlideshowFillAudio,
} from '../../lib/slideshowFillAudio.js'

const loud = { bass: 255, mid: 0, treble: 0, volume: 0 }
const silent = { bass: 0, mid: 0, treble: 0, volume: 0 }
const on = (over = {}) =>
  normalizeSlideshowFillAudio({ enabled: true, source: 'bass', brightness: 100, hue: 100, ...over })

beforeEach(() => localStorage.clear())

describe('slideshowFillAudio', () => {
  it('normalisiert (Standard aus, Werte begrenzt, Rest aus Fallback)', () => {
    expect(normalizeSlideshowFillAudio(null)).toEqual({ ...SLIDESHOW_FILL_AUDIO_DEFAULT })
    expect(
      normalizeSlideshowFillAudio({ enabled: true, source: 'x', brightness: 300, hue: -1 }),
    ).toEqual({ enabled: true, source: 'bass', brightness: 100, hue: 0 })
    const prev = { enabled: true, source: 'mid', brightness: 10, hue: 20 }
    expect(normalizeSlideshowFillAudio({ brightness: 'x' }, prev)).toEqual(prev)
    expect(isSameSlideshowFillAudio({}, SLIDESHOW_FILL_AUDIO_DEFAULT)).toBe(true)
  })

  it('ohne Musik/aus: keine Veränderung; laut: aufhellen + Farbton', () => {
    expect(computeSlideshowFillAudio(null, 'canvas', loud)).toEqual({ lighten: 0, hueShift: 0 })
    expect(computeSlideshowFillAudio(on(), 'canvas', null)).toEqual({ lighten: 0, hueShift: 0 })
    expect(computeSlideshowFillAudio(on(), 'workspace', silent)).toEqual({
      lighten: 0,
      hueShift: 0,
    })
    const r = computeSlideshowFillAudio(on(), 'canvas', loud)
    expect(r.lighten).toBeGreaterThan(0)
    expect(r.lighten).toBeLessThanOrEqual(0.5)
    expect(r.hueShift).toBeGreaterThan(0)
    expect(r.hueShift).toBeLessThanOrEqual(180)
  })

  it('Farbe anwenden: unverändert ohne Wirkung, sonst hsl', () => {
    expect(applySlideshowFillAudio('#ff0000', null)).toBe('#ff0000')
    expect(applySlideshowFillAudio('#ff0000', { lighten: 0, hueShift: 0 })).toBe('#ff0000')
    expect(applySlideshowFillAudio('#ff0000', { lighten: 0, hueShift: 120 })).toBe(
      'hsl(120, 100%, 50%)',
    )
    // Schwarz hellt zu Grau auf
    expect(applySlideshowFillAudio('#000000', { lighten: 0.5, hueShift: 0 })).toBe(
      'hsl(0, 0%, 50%)',
    )
    expect(applySlideshowFillAudio('red', { lighten: 0.5, hueShift: 0 })).toBe('red')
  })

  it('getrennt gespeichert; Standard entfernt; defekter Wert → Standard', () => {
    storeSlideshowFillAudio(on({ source: 'treble' }), 'workspace')
    expect(loadStoredSlideshowFillAudio('workspace').source).toBe('treble')
    expect(loadStoredSlideshowFillAudio('canvas').enabled).toBe(false)
    storeSlideshowFillAudio(SLIDESHOW_FILL_AUDIO_DEFAULT, 'workspace')
    expect(localStorage.getItem('visualizer-slideshow-workspace-fill-audio')).toBeNull()
    localStorage.setItem('visualizer-slideshow-base-fill-audio', '{kaputt')
    expect(loadStoredSlideshowFillAudio('canvas')).toEqual({ ...SLIDESHOW_FILL_AUDIO_DEFAULT })
  })
})

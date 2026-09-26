import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  SLIDESHOW_BASE_COLOR_DEFAULT,
  normalizeSlideshowBaseColor,
  loadStoredSlideshowBaseColor,
  storeSlideshowBaseColor,
  SLIDESHOW_GRADIENT_DEFAULT,
  normalizeSlideshowGradient,
  isSameSlideshowGradient,
  loadStoredSlideshowGradient,
  storeSlideshowGradient,
} from '../../lib/slideshowBaseColor.js'

const KEY = 'visualizer-slideshow-base-color'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('slideshowBaseColor', () => {
  it('normalisiert nur #rrggbb', () => {
    expect(normalizeSlideshowBaseColor(' #AbCdEf ')).toBe('#abcdef')
    expect(normalizeSlideshowBaseColor('red')).toBe(SLIDESHOW_BASE_COLOR_DEFAULT)
    expect(normalizeSlideshowBaseColor('#fff', null)).toBeNull()
  })

  it('speichert, lädt und entfernt beim Standard', () => {
    expect(loadStoredSlideshowBaseColor()).toBe('#000000')
    storeSlideshowBaseColor('#123ABC')
    expect(localStorage.getItem(KEY)).toBe('#123abc')
    expect(loadStoredSlideshowBaseColor()).toBe('#123abc')
    storeSlideshowBaseColor('invalid')
    expect(loadStoredSlideshowBaseColor()).toBe('#123abc')
    storeSlideshowBaseColor('#000000')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('Canvas- und Workspace-Farbe werden getrennt gespeichert', () => {
    storeSlideshowBaseColor('#111111', 'canvas')
    storeSlideshowBaseColor('#222222', 'workspace')
    expect(loadStoredSlideshowBaseColor()).toBe('#111111')
    expect(loadStoredSlideshowBaseColor('workspace')).toBe('#222222')
    expect(localStorage.getItem('visualizer-slideshow-workspace-color')).toBe('#222222')
    storeSlideshowBaseColor('#000000', 'workspace')
    expect(localStorage.getItem('visualizer-slideshow-workspace-color')).toBeNull()
    expect(loadStoredSlideshowBaseColor()).toBe('#111111')
  })

  it('manipulierter Speicherwert → Standard; Speicherfehler werfen nicht', () => {
    localStorage.setItem(KEY, 'url(evil)')
    expect(loadStoredSlideshowBaseColor()).toBe('#000000')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    expect(() => storeSlideshowBaseColor('#111111')).not.toThrow()
  })
})

describe('slideshowBaseColor – Farbverlauf', () => {
  it('normalisiert Felder einzeln (Rest aus Fallback)', () => {
    expect(normalizeSlideshowGradient(null)).toEqual({ ...SLIDESHOW_GRADIENT_DEFAULT })
    expect(
      normalizeSlideshowGradient({ enabled: true, color2: '#ABCDEF', type: 'radial', angle: -30 }),
    ).toEqual({
      enabled: true,
      color2: '#abcdef',
      type: 'radial',
      angle: 330,
      audio: { enabled: false, source: 'bass', pulse: 80, rotation: 80 },
    })
    const prev = {
      enabled: true,
      color2: '#111111',
      type: 'radial',
      angle: 45,
      audio: { enabled: false, source: 'bass', pulse: 80, rotation: 80 },
    }
    expect(normalizeSlideshowGradient({ type: 'spiral', color2: 'x', angle: 'y' }, prev)).toEqual(
      prev,
    )
    expect(normalizeSlideshowGradient({ angle: 725 }).angle).toBe(5)
    expect(isSameSlideshowGradient({ angle: 90 }, SLIDESHOW_GRADIENT_DEFAULT)).toBe(true)
  })

  it('getrennt gespeichert; Standard entfernt den Eintrag; defekter Wert → Standard', () => {
    const g = {
      enabled: true,
      color2: '#ff0000',
      type: 'linear',
      angle: 10,
      audio: { enabled: false, source: 'bass', pulse: 80, rotation: 80 },
    }
    storeSlideshowGradient(g, 'workspace')
    expect(loadStoredSlideshowGradient('workspace')).toEqual(g)
    expect(loadStoredSlideshowGradient('canvas')).toEqual({ ...SLIDESHOW_GRADIENT_DEFAULT })
    storeSlideshowGradient(SLIDESHOW_GRADIENT_DEFAULT, 'workspace')
    expect(localStorage.getItem('visualizer-slideshow-workspace-gradient')).toBeNull()
    localStorage.setItem('visualizer-slideshow-base-gradient', '{kaputt')
    expect(loadStoredSlideshowGradient('canvas')).toEqual({ ...SLIDESHOW_GRADIENT_DEFAULT })
  })
})

describe('slideshowBaseColor – Audio-Reaktiv', () => {
  it('normalisiert Audio-Einstellung, Standard aus', () => {
    expect(
      normalizeSlideshowGradient({
        audio: { enabled: true, source: 'x', pulse: 150, rotation: -3 },
      }).audio,
    ).toEqual({
      enabled: true,
      source: 'bass',
      pulse: 100,
      rotation: 0,
    })
    expect(isSameSlideshowGradient({ audio: { enabled: true } }, SLIDESHOW_GRADIENT_DEFAULT)).toBe(
      false,
    )
  })
})

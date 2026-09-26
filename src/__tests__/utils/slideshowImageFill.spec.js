import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SLIDESHOW_IMAGE_FILL_DEFAULT,
  collectStoredImageFillKeys,
  computeImageFillRect,
  computeSlideshowImageFillAudio,
  drawSlideshowImageFill,
  isSameSlideshowImageFill,
  loadStoredSlideshowImageFill,
  normalizeSlideshowImageFill,
  storeSlideshowImageFill,
} from '../../lib/slideshowImageFill.js'

const stock = {
  id: 'bg-1',
  name: 'Wolken',
  file: 'gallery/bg/wolken.jpg',
  thumbnail: 'gallery/bg/t.jpg',
}
const upload = { key: 'a'.repeat(64), name: 'foto.png' }
const loud = { bass: 255, mid: 0, treble: 0, volume: 0 }

beforeEach(() => localStorage.clear())

describe('slideshowImageFill – Einstellung', () => {
  it('Standard aus; Verweise geprüft (Stock hat Vorrang, ungültige → null)', () => {
    expect(normalizeSlideshowImageFill(null)).toEqual({
      ...SLIDESHOW_IMAGE_FILL_DEFAULT,
      audio: { ...SLIDESHOW_IMAGE_FILL_DEFAULT.audio },
    })
    expect(normalizeSlideshowImageFill({ enabled: true, stock, upload })).toMatchObject({
      enabled: true,
      stock,
      upload: null,
    })
    expect(normalizeSlideshowImageFill({ upload }).upload).toEqual(upload)
    expect(
      normalizeSlideshowImageFill({ stock: { ...stock, file: 'https://evil.example/x.png' } })
        .stock,
    ).toBeNull()
    expect(normalizeSlideshowImageFill({ upload: { key: '../x' } }).upload).toBeNull()
    expect(normalizeSlideshowImageFill({ fit: 'stretch' }).fit).toBe('cover')
    expect(normalizeSlideshowImageFill({ audio: { zoom: 500, source: 'x' } }).audio).toMatchObject({
      zoom: 100,
      source: 'bass',
    })
  })

  it('Fallback behält Verweis, wenn nur andere Felder geändert werden', () => {
    const prev = normalizeSlideshowImageFill({ enabled: true, upload })
    expect(normalizeSlideshowImageFill({ fit: 'contain' }, prev)).toMatchObject({
      upload,
      fit: 'contain',
    })
    // ausdrücklich entfernt
    expect(normalizeSlideshowImageFill({ stock: null, upload: null }, prev).upload).toBeNull()
    expect(isSameSlideshowImageFill({}, SLIDESHOW_IMAGE_FILL_DEFAULT)).toBe(true)
  })

  it('dauerhaft gemerkt, getrennt je Fläche; Schlüssel fürs Aufräumen', () => {
    storeSlideshowImageFill({ enabled: true, upload }, 'workspace')
    storeSlideshowImageFill({ enabled: true, stock }, 'canvas')
    expect(loadStoredSlideshowImageFill('workspace').upload).toEqual(upload)
    expect(loadStoredSlideshowImageFill('canvas').stock).toEqual(stock)
    expect([...collectStoredImageFillKeys()]).toEqual([upload.key])
    storeSlideshowImageFill(SLIDESHOW_IMAGE_FILL_DEFAULT, 'workspace')
    expect(localStorage.getItem('visualizer-slideshow-workspace-image')).toBeNull()
    localStorage.setItem('visualizer-slideshow-base-image', '{kaputt')
    expect(loadStoredSlideshowImageFill('canvas').enabled).toBe(false)
  })
})

describe('slideshowImageFill – Zeichnen & Audio', () => {
  const area = { x: 10, y: 20, width: 200, height: 100 }
  const image = { width: 100, height: 100 }

  it('Füllen, Einpassen und Zoom (zentriert)', () => {
    expect(computeImageFillRect(area, image, 'cover')).toEqual({
      x: 10,
      y: -30,
      width: 200,
      height: 200,
    })
    expect(computeImageFillRect(area, image, 'contain')).toEqual({
      x: 60,
      y: 20,
      width: 100,
      height: 100,
    })
    expect(computeImageFillRect(area, image, 'contain', 1.2)).toEqual({
      x: 50,
      y: 10,
      width: 120,
      height: 120,
    })
    expect(computeImageFillRect(area, { width: 0, height: 0 }, 'cover')).toBeNull()
  })

  it('beschneidet auf den Bereich und setzt Audio-Filter', () => {
    const calls = []
    const ctx = {
      filter: 'none',
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      clip: vi.fn(),
      rect: (...a) => calls.push(['rect', ...a]),
      drawImage: (...a) => calls.push(['drawImage', ctx.filter, ...a.slice(1)]),
    }
    const fill = normalizeSlideshowImageFill({ enabled: true, fit: 'contain' })
    expect(
      drawSlideshowImageFill(ctx, area, image, fill, { brightness: 150, hueShift: 30, zoom: 1 }),
    ).toBe(true)
    expect(calls[0]).toEqual(['rect', 10, 20, 200, 100])
    expect(calls[1]).toEqual([
      'drawImage',
      'brightness(150.0%) hue-rotate(30.0deg)',
      60,
      20,
      100,
      100,
    ])
    expect(ctx.clip).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('Audio: neutral ohne Musik/aus, laut: hellt auf + pulsiert', () => {
    const neutral = { brightness: 100, hueShift: 0, zoom: 1 }
    const on = normalizeSlideshowImageFill({
      audio: { enabled: true, brightness: 100, hue: 100, zoom: 100 },
    }).audio
    expect(computeSlideshowImageFillAudio(null, 'canvas', loud)).toEqual(neutral)
    expect(computeSlideshowImageFillAudio(on, 'canvas', null)).toEqual(neutral)
    const r = computeSlideshowImageFillAudio(on, 'canvas', loud)
    expect(r.brightness).toBeGreaterThan(100)
    expect(r.brightness).toBeLessThanOrEqual(200)
    expect(r.hueShift).toBeGreaterThan(0)
    expect(r.zoom).toBeGreaterThan(1)
    expect(r.zoom).toBeLessThanOrEqual(1.25)
  })
})

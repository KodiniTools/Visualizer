import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  SLIDESHOW_BASE_COLOR_DEFAULT,
  normalizeSlideshowBaseColor,
  loadStoredSlideshowBaseColor,
  storeSlideshowBaseColor,
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

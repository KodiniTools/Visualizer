// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { getSlideshowManager, setSlideshowManager } from '../../lib/slideshowManagerBridge.js'

afterEach(() => setSlideshowManager(null))

describe('slideshowManagerBridge', () => {
  it('liefert null, solange keine Slideshow gesetzt ist', () => {
    expect(getSlideshowManager()).toBeNull()
  })

  it('setzt den Manager ohne window-Global', () => {
    const mgr = { isPaused: false }
    setSlideshowManager(mgr)
    expect(getSlideshowManager()).toBe(mgr)
    expect(window.slideshowManager).toBeUndefined()
  })

  it('null und undefined setzen zurück', () => {
    setSlideshowManager({})
    setSlideshowManager(undefined)
    expect(getSlideshowManager()).toBeNull()
  })
})

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { getSlideshowManager, setSlideshowManager } from '../../lib/slideshowManagerBridge.js'

afterEach(() => setSlideshowManager(null))

describe('slideshowManagerBridge', () => {
  it('liefert null, solange keine Slideshow gesetzt ist', () => {
    expect(getSlideshowManager()).toBeNull()
  })

  it('setzt den Manager und führt window.slideshowManager als Alias mit', () => {
    const mgr = { isPaused: false }
    setSlideshowManager(mgr)
    expect(getSlideshowManager()).toBe(mgr)
    expect(window.slideshowManager).toBe(mgr)
  })

  it('null und undefined setzen zurück', () => {
    setSlideshowManager({})
    setSlideshowManager(undefined)
    expect(getSlideshowManager()).toBeNull()
    expect(window.slideshowManager).toBeNull()
  })
})

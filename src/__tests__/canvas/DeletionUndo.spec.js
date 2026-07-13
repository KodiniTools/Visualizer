import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TextManager } from '../../lib/textManager.js'
import { MultiImageManager } from '../../lib/multiImageManager.js'
import { VideoManager } from '../../lib/videoManager.js'

/**
 * Tests für die undo-fähige Löschung von Canvas-Objekten.
 *
 * Kernanforderung: Ein Text, Bild oder Video, das vom Canvas gelöscht wurde,
 * kann wiederhergestellt werden – an seiner ursprünglichen Ebenen-Position.
 */

describe('Deletion Undo – TextManager', () => {
  let tm

  beforeEach(() => {
    tm = new TextManager(/* textStore */ {})
  })

  it('stellt einen gelöschten Text an derselben Ebenen-Position wieder her', () => {
    tm.add('A')
    const b = tm.add('B')
    tm.add('C')

    const index = tm.textObjects.findIndex((t) => t.id === b.id)
    expect(index).toBe(1)

    expect(tm.delete(b)).toBe(true)
    expect(tm.textObjects.map((t) => t.content)).toEqual(['A', 'C'])

    expect(tm.restore(b, index)).toBe(true)
    expect(tm.textObjects.map((t) => t.content)).toEqual(['A', 'B', 'C'])
    // Es ist exakt dasselbe Objekt (Referenz + Eigenschaften bleiben erhalten)
    expect(tm.textObjects[1]).toBe(b)
  })

  it('verhindert doppelte Wiederherstellung desselben Objekts', () => {
    const a = tm.add('A')
    const index = 0
    tm.delete(a)

    expect(tm.restore(a, index)).toBe(true)
    expect(tm.restore(a, index)).toBe(false)
    expect(tm.textObjects.length).toBe(1)
  })

  it('hängt an, wenn kein/ungültiger Index angegeben ist', () => {
    const a = tm.add('A')
    tm.add('B')
    tm.delete(a)
    tm.restore(a)
    expect(tm.textObjects[tm.textObjects.length - 1]).toBe(a)
  })
})

describe('Deletion Undo – MultiImageManager', () => {
  let mgr
  let onImageChanged

  beforeEach(() => {
    onImageChanged = vi.fn()
    mgr = new MultiImageManager(null, {
      redrawCallback: () => {},
      onImageChanged,
    })
  })

  it('stellt ein entferntes Bild an derselben Ebenen-Position wieder her', () => {
    mgr.images = [{ id: 'img1' }, { id: 'img2' }, { id: 'img3' }]
    const removed = mgr.images[1]

    expect(mgr.removeImage('img2')).toBe(true)
    expect(mgr.images.map((i) => i.id)).toEqual(['img1', 'img3'])

    expect(mgr.restoreImage(removed, 1)).toBe(true)
    expect(mgr.images.map((i) => i.id)).toEqual(['img1', 'img2', 'img3'])
    expect(onImageChanged).toHaveBeenCalled()
  })

  it('verhindert doppelte Wiederherstellung', () => {
    const removed = { id: 'img1' }
    mgr.images = []
    expect(mgr.restoreImage(removed, 0)).toBe(true)
    expect(mgr.restoreImage(removed, 0)).toBe(false)
    expect(mgr.images.length).toBe(1)
  })
})

describe('Deletion Undo – VideoManager', () => {
  let mgr
  let onVideoChanged

  function fakeVideo(id) {
    return {
      id,
      videoElement: {
        paused: false,
        _src: 'blob:x',
        pause: vi.fn(),
        load: vi.fn(),
        play: vi.fn(() => Promise.resolve()),
        get src() {
          return this._src
        },
        set src(v) {
          this._src = v
        },
      },
    }
  }

  beforeEach(() => {
    onVideoChanged = vi.fn()
    mgr = new VideoManager(null, {
      redrawCallback: () => {},
      onVideoChanged,
    })
  })

  it('erhält das Video-Element bei destroyElement:false, sodass Undo möglich ist', () => {
    const v = fakeVideo('vid1')
    mgr.videos = [v]

    mgr.removeVideo('vid1', { destroyElement: false })
    expect(v.videoElement.pause).toHaveBeenCalled()
    // Element NICHT zerstört -> src bleibt erhalten
    expect(v.videoElement.src).toBe('blob:x')
    expect(v.videoElement.load).not.toHaveBeenCalled()

    expect(mgr.restoreVideo(v, 0)).toBe(true)
    expect(mgr.videos.map((x) => x.id)).toEqual(['vid1'])
    expect(onVideoChanged).toHaveBeenCalled()
  })

  it('zerstört das Video-Element bei Standard-Löschung (destroyElement:true)', () => {
    const v = fakeVideo('vid1')
    mgr.videos = [v]

    mgr.removeVideo('vid1')
    expect(v.videoElement.pause).toHaveBeenCalled()
    expect(v.videoElement.load).toHaveBeenCalled()
    expect(v.videoElement.src).toBe('')
  })

  it('setzt die Wiedergabe fort, wenn global abgespielt wird', () => {
    const v = fakeVideo('vid1')
    mgr.videos = []
    mgr.isPlaying = true

    mgr.restoreVideo(v, 0)
    expect(v.videoElement.play).toHaveBeenCalled()
  })
})

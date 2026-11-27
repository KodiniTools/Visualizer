import { describe, it, expect, vi } from 'vitest'
import {
  createSeekFrames,
  createSequentialFrames,
  SEEK_TIMEOUT_MS,
} from '../../../lib/offlineExport/videoFrameSource'
import type { DecodedCanvas } from '../../../lib/offlineExport/videoFrameSource'

/** Sink-Attrappe: Video mit 10 Bildern/s, 3 s lang; protokolliert Starts und Bilder */
function fakeSink() {
  const starts: number[] = []
  let decoded = 0
  const sink = {
    canvases: (start = 0) => {
      starts.push(start)
      return (async function* (): AsyncGenerator<DecodedCanvas, void, unknown> {
        for (let i = Math.floor(start * 10 + 1e-9); i < 30; i++) {
          decoded++
          yield { canvas: `bild ${i}` as unknown as CanvasImageSource, timestamp: i / 10 }
        }
      })()
    },
  }
  return { sink, starts, decodedCount: () => decoded }
}

describe('createSequentialFrames', () => {
  it('liefert das Bild, das zur Zeit gezeigt wird, und dekodiert der Reihe nach', async () => {
    const { sink, starts, decodedCount } = fakeSink()
    const frames = createSequentialFrames(sink)
    expect(await frames.frameAt(0)).toBe('bild 0')
    expect(await frames.frameAt(1 / 30)).toBe('bild 0')
    expect(await frames.frameAt(0.1)).toBe('bild 1')
    expect(await frames.frameAt(0.29)).toBe('bild 2')
    expect(await frames.frameAt(1.0)).toBe('bild 10')
    expect(starts).toEqual([0])
    expect(decodedCount()).toBe(12) // bis einschließlich des nächsten Bilds
  })

  it('startet bei Rücksprung (Schleife) und großem Sprung nach vorn neu', async () => {
    const { sink, starts } = fakeSink()
    const frames = createSequentialFrames(sink)
    await frames.frameAt(2.5)
    expect(await frames.frameAt(0.05)).toBe('bild 0')
    expect(await frames.frameAt(2.95)).toBe('bild 29')
    expect(starts).toEqual([2.5, 0.05, 2.95])
  })

  it('bleibt nach dem Ende auf dem letzten Bild; close gibt frei', async () => {
    const { sink } = fakeSink()
    const onClose = vi.fn()
    const frames = createSequentialFrames(sink, onClose)
    expect(await frames.frameAt(2.95)).toBe('bild 29')
    expect(await frames.frameAt(3.2)).toBe('bild 29')
    frames.close()
    frames.close()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(await frames.frameAt(1)).toBeNull()
  })
})

describe('createSeekFrames', () => {
  it('setzt das echte Element nur bei Abweichung und wartet auf seeked', async () => {
    let time = 0
    const waitSeeked = vi.fn(async () => {})
    const real = { getTime: () => time, setTime: vi.fn((t: number) => (time = t)), waitSeeked }
    const frames = createSeekFrames(real)

    expect(await frames.frameAt(0)).toBeNull()
    expect(real.setTime).not.toHaveBeenCalled()
    expect(await frames.frameAt(1.5)).toBeNull()
    expect(real.setTime).toHaveBeenCalledWith(1.5)
    expect(waitSeeked).toHaveBeenCalledWith(SEEK_TIMEOUT_MS)
  })
})

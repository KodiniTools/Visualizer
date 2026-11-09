// @vitest-environment node
// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

/** Aufgerufene FFmpeg-Argumente */
const calls = /** @type {string[][]} */ ([])

vi.mock('child_process', () => ({
  spawn: (/** @type {string} */ _cmd, /** @type {string[]} */ args) => {
    calls.push(args)
    const proc = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      killed: false,
      kill: () => true,
    })
    // FFmpeg „endet“ sofort mit Fehler – hier zählen nur die Argumente
    setTimeout(() => proc.emit('close', 1), 0)
    return proc
  },
}))

const { convertToMP4, resolveOutputFps, DEFAULT_OUTPUT_FPS } = await import(
  '../services/ffmpegService.js'
)

/** Wert nach `-r` im letzten FFmpeg-Aufruf */
const outputRate = () => {
  const args = calls.at(-1) ?? []
  return args[args.indexOf('-r') + 1]
}

beforeEach(() => {
  calls.length = 0
})

describe('resolveOutputFps', () => {
  it('übernimmt gültige Werte, auch als Text aus einem Formular', () => {
    expect(resolveOutputFps(30)).toBe(30)
    expect(resolveOutputFps('24')).toBe(24)
    expect(resolveOutputFps(1)).toBe(1)
    expect(resolveOutputFps(60)).toBe(60)
  })

  it('fällt bei fehlenden oder ungültigen Werten auf 60 zurück', () => {
    expect(DEFAULT_OUTPUT_FPS).toBe(60)
    for (const v of [undefined, null, '', ' ', 'abc', 0, -5, 61, 1000, NaN, Infinity, ['30']]) {
      expect(resolveOutputFps(v)).toBe(60)
    }
  })
})

describe('convertToMP4', () => {
  it('nutzt die übergebene Framerate', async () => {
    await expect(convertToMP4('in.webm', 'out.mp4', { fps: 30 })).rejects.toThrow()
    expect(outputRate()).toBe('30')
  })

  it('ohne fps bleibt es bei 60', async () => {
    await expect(convertToMP4('in.webm', 'out.mp4')).rejects.toThrow()
    expect(outputRate()).toBe('60')
  })
})

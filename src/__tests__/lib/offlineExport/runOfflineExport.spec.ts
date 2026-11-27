// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { runOfflineExport } from '../../../lib/offlineExport/runOfflineExport'
import type { RunOfflineExportOptions } from '../../../lib/offlineExport/runOfflineExport'
import type { Mp4Writer } from '../../../lib/offlineExport/mp4Writer'
import { createFakeContextFactory, fakeBuffer } from './fakeOfflineContext'

function setup(overrides: Partial<RunOfflineExportOptions> = {}, duration = 0.2) {
  const log: string[] = []
  const { factory, contexts } = createFakeContextFactory()
  let clockMs = 0
  const writer: Mp4Writer = {
    videoCodec: 'avc',
    audioCodec: 'aac',
    addFrame: vi.fn(async (i: number) => {
      log.push(`frame ${i}`)
    }),
    addAudio: vi.fn(async (b: AudioBuffer) => {
      log.push(`audio ${(b as unknown as { tag: string }).tag}`)
    }),
    finalize: vi.fn(async () => new Blob(['mp4'])),
    cancel: vi.fn(async () => {
      log.push('cancel')
    }),
  }
  const target = { imageSmoothingEnabled: false, imageSmoothingQuality: 'low' }
  const options: RunOfflineExportOptions = {
    mix: {
      main: fakeBuffer(duration),
      overlays: [],
      bassDb: 0,
      trebleDb: 0,
      analysePlayer: true,
      duration,
      sampleRate: 48000,
    },
    fps: 30,
    bitrate: 8_000_000,
    width: 320,
    height: 180,
    scene: {
      outputSize: () => ({ width: 320, height: 180 }),
      begin: () => log.push('scene.begin'),
      renderFrame: (analyser, ctx, w, h) => {
        const data = new Uint8Array(4)
        analyser.getByteFrequencyData(data)
        expect(ctx).toBe(target)
        log.push(`render t=${clockMs.toFixed(1)} a=${data[0]} ${w}x${h}`)
      },
      end: () => log.push('scene.end'),
    },
    timeline: {
      begin: async () => {
        log.push('timeline.begin')
      },
      seek: (t) => log.push(`seek ${t.toFixed(4)}`),
      end: () => log.push('timeline.end'),
    },
    createWriter: async (o) => {
      log.push(`writer ${o.fps} ${o.bitrate} ${o.sampleRate}`)
      return writer
    },
    createContext: factory,
    createCanvas: () => ({ getContext: () => target }) as unknown as HTMLCanvasElement,
    installClock: () => ({
      advance: (ms) => {
        clockMs += ms
      },
      elapsed: () => clockMs,
      restore: () => log.push('clock.restore'),
    }),
    ...overrides,
  }
  return { options, log, writer, contexts }
}

describe('runOfflineExport', () => {
  it('rendert jeden Frame im Gleichschritt mit dem Audio und hängt danach den Ton an', async () => {
    const progress: number[] = []
    const { options, log, writer, contexts } = setup({
      onProgress: (p) => progress.push(p.frame / p.total),
    })

    const result = await runOfflineExport(options)

    expect(result.frames).toBe(6)
    expect(result.videoCodec).toBe('avc')
    expect(contexts[0]!.suspendTimes.map((t) => +t.toFixed(4))).toEqual([
      0.0333, 0.0667, 0.1, 0.1333, 0.1667,
    ])
    // Frame 0 vor dem Start (Analyser leer), danach je Haltepunkt ein Frame
    expect(log.filter((l) => l.startsWith('render'))).toEqual([
      'render t=0.0 a=0 320x180',
      'render t=33.3 a=0 320x180',
      'render t=66.7 a=1 320x180',
      'render t=100.0 a=1 320x180',
      'render t=133.3 a=1 320x180',
      'render t=166.7 a=2 320x180',
    ])
    expect(log.filter((l) => l.startsWith('seek'))).toHaveLength(6)
    expect(log.indexOf('seek 0.0667')).toBeLessThan(log.indexOf('frame 2'))
    expect(log[0]).toBe('writer 30 8000000 48000')
    expect(log.slice(-5)).toEqual([
      'frame 5',
      'audio rendered',
      'timeline.end',
      'scene.end',
      'clock.restore',
    ])
    expect(writer.finalize).toHaveBeenCalledTimes(1)
    expect(writer.cancel).not.toHaveBeenCalled()
    expect(progress.at(-1)).toBe(1)
  })

  it('Abbruch: keine weiteren Frames, Encoder verworfen, Zustand zurückgesetzt', async () => {
    const controller = new AbortController()
    const { options, log, writer } = setup({
      signal: controller.signal,
      onProgress: (p) => {
        if (p.frame === 2) controller.abort()
      },
    })

    await expect(runOfflineExport(options)).rejects.toMatchObject({ name: 'AbortError' })

    expect(log.filter((l) => l.startsWith('render'))).toHaveLength(2)
    expect(writer.addAudio).not.toHaveBeenCalled()
    expect(writer.cancel).toHaveBeenCalled()
    expect(log).toContain('timeline.end')
    expect(log).toContain('scene.end')
    expect(log).toContain('clock.restore')
  })

  it('Fehler beim Rendern bricht ab und räumt auf', async () => {
    const boom = new Error('boom')
    let calls = 0
    const { options, log, writer } = setup()
    const render = options.scene.renderFrame
    options.scene = {
      ...options.scene,
      renderFrame: (...args) => {
        if (++calls === 3) throw boom
        render(...args)
      },
    }

    await expect(runOfflineExport(options)).rejects.toBe(boom)
    expect(writer.cancel).toHaveBeenCalled()
    expect(writer.finalize).not.toHaveBeenCalled()
    expect(log).toContain('scene.end')
    expect(log).toContain('clock.restore')
  })

  it('schon abgebrochen: startet gar nicht erst', async () => {
    const controller = new AbortController()
    controller.abort()
    const { options, log } = setup({ signal: controller.signal })
    await expect(runOfflineExport(options)).rejects.toMatchObject({ name: 'AbortError' })
    expect(log).toEqual([])
  })

  it('Fehler beim Anlegen des Encoders: Szene bleibt unberührt', async () => {
    const { options, log } = setup({
      createWriter: async () => {
        throw new Error('no encoder')
      },
    })
    await expect(runOfflineExport(options)).rejects.toThrow('no encoder')
    expect(log).not.toContain('scene.begin')
  })
})

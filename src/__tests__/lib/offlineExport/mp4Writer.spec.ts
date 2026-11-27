import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const calls: string[] = []
const codecs = { video: 'avc' as string | null, audio: 'aac' as string | null }

vi.mock('mediabunny', () => {
  class BufferTarget {
    buffer: ArrayBuffer | null = null
  }
  class Mp4OutputFormat {
    constructor(o: unknown) {
      calls.push(`format ${JSON.stringify(o)}`)
    }
  }
  class CanvasSource {
    constructor(_c: unknown, o: unknown) {
      calls.push(`video ${JSON.stringify(o)}`)
    }
    add = async (t: number, d: number) => {
      calls.push(`add ${t.toFixed(4)} ${d.toFixed(4)}`)
    }
    close = () => calls.push('video.close')
  }
  class AudioBufferSource {
    constructor(o: unknown) {
      calls.push(`audio ${JSON.stringify(o)}`)
    }
    add = async () => {
      calls.push('audio.add')
    }
    close = () => calls.push('audio.close')
  }
  class Output {
    state = 'pending'
    target: BufferTarget
    constructor(o: { target: BufferTarget }) {
      this.target = o.target
    }
    addVideoTrack = (_s: unknown, m: unknown) => calls.push(`addVideoTrack ${JSON.stringify(m)}`)
    addAudioTrack = () => calls.push('addAudioTrack')
    start = async () => {
      this.state = 'started'
    }
    finalize = async () => {
      this.target.buffer = new Uint8Array([1, 2, 3]).buffer
      this.state = 'finalized'
    }
    cancel = async () => {
      calls.push('cancel')
      this.state = 'canceled'
    }
  }
  return {
    BufferTarget,
    Mp4OutputFormat,
    CanvasSource,
    AudioBufferSource,
    Output,
    getFirstEncodableVideoCodec: async (list: string[], o: unknown) => {
      calls.push(`checkVideo ${list.join(',')} ${JSON.stringify(o)}`)
      return codecs.video
    },
    getFirstEncodableAudioCodec: async (list: string[]) => {
      calls.push(`checkAudio ${list.join(',')}`)
      return codecs.audio
    },
  }
})

import { createMp4Writer, hasWebCodecs } from '../../../lib/offlineExport/mp4Writer'

const canvas = { width: 1280, height: 720 } as HTMLCanvasElement
const options = { canvas, fps: 30, bitrate: 8_000_000, sampleRate: 48000, numberOfChannels: 2 }

beforeEach(() => {
  calls.length = 0
  codecs.video = 'avc'
  codecs.audio = 'aac'
  vi.stubGlobal('VideoEncoder', function VideoEncoder() {})
  vi.stubGlobal('AudioEncoder', function AudioEncoder() {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createMp4Writer', () => {
  it('wählt H.264 + AAC, schreibt Frames mit Zeitstempeln und liefert eine MP4', async () => {
    const writer = await createMp4Writer(options)
    expect(writer.videoCodec).toBe('avc')
    expect(writer.audioCodec).toBe('aac')
    expect(calls).toContain('checkVideo avc,vp9,av1 {"width":1280,"height":720,"bitrate":8000000}')
    expect(calls).toContain('checkAudio aac,opus')
    expect(calls).toContain('format {"fastStart":"in-memory"}')
    expect(calls).toContain('video {"codec":"avc","bitrate":8000000,"keyFrameInterval":2}')
    expect(calls).toContain('addVideoTrack {"frameRate":30}')
    expect(calls).toContain('addAudioTrack')

    await writer.addFrame(0)
    await writer.addFrame(45)
    await writer.addAudio({} as AudioBuffer)
    const blob = await writer.finalize()
    expect(calls).toContain('add 0.0000 0.0333')
    expect(calls).toContain('add 1.5000 0.0333')
    expect(calls).toContain('audio.add')
    expect(blob.type).toBe('video/mp4')
    expect(blob.size).toBe(3)
  })

  it('ohne Audio-Encoder: nur Videospur', async () => {
    codecs.audio = null
    const writer = await createMp4Writer(options)
    expect(writer.audioCodec).toBeNull()
    expect(calls).not.toContain('addAudioTrack')
    await writer.addAudio({} as AudioBuffer)
    expect(calls).not.toContain('audio.add')
  })

  it('ohne passenden Video-Encoder bzw. ohne WebCodecs: unsupported', async () => {
    codecs.video = null
    await expect(createMp4Writer(options)).rejects.toMatchObject({ code: 'unsupported' })
    vi.unstubAllGlobals()
    expect(hasWebCodecs()).toBe(false)
    await expect(createMp4Writer(options)).rejects.toMatchObject({ code: 'unsupported' })
  })

  it('cancel verwirft eine laufende Ausgabe', async () => {
    const writer = await createMp4Writer(options)
    await writer.cancel()
    expect(calls).toContain('cancel')
  })
})

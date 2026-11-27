/**
 * Schreibt den Offline-Export als MP4: Video aus einem Canvas, Audio aus
 * einem AudioBuffer, kodiert per WebCodecs im Browser (Bibliothek
 * mediabunny, erst beim Export nachgeladen).
 *
 * Codec-Wahl: H.264, sonst VP9/AV1 (alle in MP4 erlaubt). Audio AAC, sonst
 * Opus (Chromium ohne AAC-Encoder, z. B. unter Linux).
 */

import { OfflineExportError } from './errors'

export type OfflineVideoCodec = 'avc' | 'vp9' | 'av1'
export type OfflineAudioCodec = 'aac' | 'opus'

export interface Mp4WriterOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas
  fps: number
  /** Video-Bitrate (bit/s) */
  bitrate: number
  /** Audio-Spuren-Eckdaten für die Codec-Prüfung */
  sampleRate: number
  numberOfChannels: number
}

export interface Mp4Writer {
  readonly videoCodec: OfflineVideoCodec
  readonly audioCodec: OfflineAudioCodec | null
  /** Aktuellen Canvas-Inhalt als Frame `index` anhängen (wartet auf den Encoder). */
  addFrame: (index: number) => Promise<void>
  /** Komplette Tonspur anhängen. */
  addAudio: (buffer: AudioBuffer) => Promise<void>
  /** Datei abschließen. */
  finalize: () => Promise<Blob>
  /** Abbrechen und Encoder freigeben. */
  cancel: () => Promise<void>
}

export const AUDIO_BITRATE = 192_000

/** Kann dieser Browser überhaupt per WebCodecs kodieren? */
export const hasWebCodecs = () =>
  typeof globalThis.VideoEncoder === 'function' && typeof globalThis.AudioEncoder === 'function'

export async function createMp4Writer(options: Mp4WriterOptions): Promise<Mp4Writer> {
  if (!hasWebCodecs()) throw new OfflineExportError('unsupported')
  const mb = await import('mediabunny')
  const { canvas, fps, bitrate } = options
  const { width, height } = canvas

  const videoCodec = (await mb.getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], {
    width,
    height,
    bitrate,
  })) as OfflineVideoCodec | null
  if (!videoCodec) throw new OfflineExportError('unsupported')
  const audioCodec = (await mb.getFirstEncodableAudioCodec(['aac', 'opus'], {
    numberOfChannels: options.numberOfChannels,
    sampleRate: options.sampleRate,
    bitrate: AUDIO_BITRATE,
  })) as OfflineAudioCodec | null

  const target = new mb.BufferTarget()
  const output = new mb.Output({
    format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })
  const video = new mb.CanvasSource(canvas, {
    codec: videoCodec,
    bitrate,
    keyFrameInterval: 2,
  })
  output.addVideoTrack(video, { frameRate: fps })
  const audio = audioCodec
    ? new mb.AudioBufferSource({ codec: audioCodec, bitrate: AUDIO_BITRATE })
    : null
  if (audio) output.addAudioTrack(audio)
  await output.start()

  const frameDuration = 1 / fps
  return {
    videoCodec,
    audioCodec,
    addFrame: (index) => video.add(index * frameDuration, frameDuration),
    addAudio: async (buffer) => {
      if (audio) await audio.add(buffer)
    },
    finalize: async () => {
      video.close()
      audio?.close()
      await output.finalize()
      if (!target.buffer) throw new OfflineExportError('render')
      return new Blob([target.buffer], { type: 'video/mp4' })
    },
    cancel: async () => {
      if (output.state === 'started' || output.state === 'pending') await output.cancel()
    },
  }
}

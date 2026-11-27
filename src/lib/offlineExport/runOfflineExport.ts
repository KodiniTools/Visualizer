/**
 * Offline-Export: rendert die komplette Szene Frame für Frame mit fester
 * Bildrate und schreibt sie samt Ton als MP4 – ohne Echtzeit-Wiedergabe.
 *
 * Ablauf (Lockstep mit dem Audio):
 * 1. Der Ton wird in einem OfflineAudioContext gerendert (offlineAudioMix).
 *    Zu jedem Frame-Zeitpunkt hält der Kontext an (suspend); der Analyser
 *    liefert dann genau das Spektrum dieses Moments.
 * 2. Währenddessen steht die virtuelle Uhr auf der Frame-Zeit, die
 *    Player-Position ebenso; die App rendert einen Frame (Visualizer,
 *    Bilder, Texte, Marker, Effekte) und der Encoder nimmt ihn auf.
 * 3. Dann läuft der Ton bis zum nächsten Frame weiter.
 * 4. Am Ende kommt die fertige Tonspur in die Datei.
 */

import { buildOfflineMix } from './offlineAudioMix'
import type { OfflineMixContextFactory, OfflineMixOptions } from './offlineAudioMix'
import { frameCount, frameTime } from './frameTiming'
import { installVirtualClock } from './virtualClock'
import type { VirtualClock } from './virtualClock'
import { createMp4Writer } from './mp4Writer'
import type { Mp4Writer, Mp4WriterOptions } from './mp4Writer'
import type { OfflineScene } from './offlineSceneBridge'

/** Zeitachse der App während des Exports (Player-Position, Marker) */
export interface OfflineTimeline {
  /** Wiedergabe-Zustand „läuft“ ab 0 s herstellen (ohne Ton) */
  begin: () => Promise<void>
  /** Position setzen (s) */
  seek: (time: number) => void
  /** Wiedergabe-Zustand zurücksetzen */
  end: () => void
}

export interface OfflineExportProgress {
  frame: number
  total: number
}

export interface RunOfflineExportOptions {
  mix: OfflineMixOptions
  fps: number
  bitrate: number
  width: number
  height: number
  scene: OfflineScene
  timeline: OfflineTimeline
  signal?: AbortSignal
  onProgress?: (progress: OfflineExportProgress) => void
  /** Austauschbar für Tests */
  createWriter?: (options: Mp4WriterOptions) => Promise<Mp4Writer>
  createContext?: OfflineMixContextFactory
  createCanvas?: (width: number, height: number) => HTMLCanvasElement
  installClock?: () => VirtualClock
}

export interface OfflineExportResult {
  blob: Blob
  frames: number
  videoCodec: Mp4Writer['videoCodec']
  audioCodec: Mp4Writer['audioCodec']
}

const abortError = () => new DOMException('Offline export aborted', 'AbortError')

const defaultCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export async function runOfflineExport(
  options: RunOfflineExportOptions,
): Promise<OfflineExportResult> {
  const {
    fps,
    width,
    height,
    scene,
    timeline,
    signal,
    onProgress,
    createWriter = createMp4Writer,
    createCanvas = defaultCanvas,
    installClock = installVirtualClock,
  } = options
  if (signal?.aborted) throw abortError()

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context not available')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const writer = await createWriter({
    canvas,
    fps,
    bitrate: options.bitrate,
    sampleRate: options.mix.sampleRate,
    numberOfChannels: 2,
  })

  const total = frameCount(options.mix.duration, fps)
  const frameMs = 1000 / fps
  let clock: VirtualClock | null = null
  let begun = false
  let finished = false

  try {
    if (signal?.aborted) throw abortError()
    const mix = buildOfflineMix(options.mix, options.createContext)

    clock = installClock()
    scene.begin()
    begun = true
    await timeline.begin()

    const renderOne = async (index: number) => {
      timeline.seek(frameTime(index, fps))
      scene.renderFrame(mix.analyser, ctx, width, height)
      await writer.addFrame(index)
      onProgress?.({ frame: index + 1, total })
      clock?.advance(frameMs)
    }

    let failure: unknown = null
    const step = (index: number) => {
      mix.context.suspend(frameTime(index, fps)).then(
        async () => {
          try {
            if (failure === null && !signal?.aborted) {
              await renderOne(index)
              if (index + 1 < total) step(index + 1)
            }
          } catch (error) {
            failure = error
          } finally {
            await mix.context.resume()
          }
        },
        (error: unknown) => {
          failure ??= error
        },
      )
    }

    // Frame 0 vor dem Start: der Analyser ist (wie live beim Abspielstart) noch leer
    await renderOne(0)
    if (total > 1) step(1)
    const rendered = await mix.context.startRendering()

    if (signal?.aborted) throw abortError()
    if (failure !== null) throw failure

    await writer.addAudio(rendered)
    const blob = await writer.finalize()
    finished = true
    return { blob, frames: total, videoCodec: writer.videoCodec, audioCodec: writer.audioCodec }
  } finally {
    if (begun) {
      timeline.end()
      scene.end()
    }
    clock?.restore()
    if (!finished) await writer.cancel().catch(() => {})
  }
}

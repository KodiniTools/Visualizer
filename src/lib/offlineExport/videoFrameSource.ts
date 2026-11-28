/**
 * Bildquellen der virtuellen Video-Uhr (offlineMediaClock).
 *
 * 1. Dekoder (Standard): liest die Videodatei per mediabunny/WebCodecs und
 *    dekodiert die Bilder der Reihe nach – jedes Paket nur einmal. Ein Bild
 *    kostet so wenige Millisekunden statt eines Seeks (50–75 ms).
 * 2. Seek (Rückfall, z. B. Codec ohne WebCodecs-Dekoder): setzt das echte
 *    Element auf die Zeit und wartet auf `seeked`; gezeichnet wird das Element.
 */
import type { FrameSource, FrameSourceFactory, RealVideoAccess } from './offlineMediaClock'

/** Rundung zwischen Bild- und Frame-Zeitstempeln (s) */
const EPSILON = 1e-4
/** Größerer Sprung nach vorn: neu ab der Zielzeit dekodieren statt alle Bilder dazwischen (s) */
const MAX_FORWARD_DECODE = 1.5
/** Höchstwartezeit auf `seeked` im Rückfall (ms) */
export const SEEK_TIMEOUT_MS = 3000

/** Ausschnitt aus mediabunny (WrappedCanvas, CanvasSink) – Tests geben Attrappen */
export interface DecodedCanvas {
  canvas: CanvasImageSource
  timestamp: number
}
export interface CanvasIteratorSink {
  canvases: (startTimestamp?: number) => AsyncGenerator<DecodedCanvas, void, unknown>
}

/**
 * Bilder in Wiedergabe-Reihenfolge: hält das aktuelle und das nächste Bild;
 * rückwärts (Schleife, Seek) oder weit nach vorn startet der Iterator neu.
 */
export function createSequentialFrames(
  sink: CanvasIteratorSink,
  onClose?: () => void,
): FrameSource {
  let iterator: AsyncGenerator<DecodedCanvas, void, unknown> | null = null
  let current: DecodedCanvas | null = null
  let next: DecodedCanvas | null = null
  let lastTime = 0
  let closed = false

  const pull = async () => {
    const result = await (iterator as AsyncGenerator<DecodedCanvas, void, unknown>).next()
    return result.done ? null : (result.value ?? null)
  }

  async function restart(time: number) {
    void iterator?.return(undefined)
    iterator = sink.canvases(Math.max(0, time))
    current = await pull()
    next = current ? await pull() : null
  }

  return {
    async frameAt(time) {
      if (closed) return null
      const t = Number.isFinite(time) && time > 0 ? time : 0
      if (
        !iterator ||
        (current && t < current.timestamp - EPSILON) ||
        t > lastTime + MAX_FORWARD_DECODE
      ) {
        await restart(t)
      }
      while (next && next.timestamp <= t + EPSILON) {
        current = next
        next = await pull()
      }
      lastTime = t
      return current?.canvas ?? null
    },
    close() {
      if (closed) return
      closed = true
      void iterator?.return(undefined)
      iterator = null
      current = null
      next = null
      onClose?.()
    },
  }
}

/** Rückfall: echtes Element auf die Zeit setzen und auf das Bild warten. */
export function createSeekFrames(real: RealVideoAccess): FrameSource {
  return {
    async frameAt(time) {
      if (Math.abs(real.getTime() - time) > EPSILON) {
        const seeked = real.waitSeeked(SEEK_TIMEOUT_MS)
        real.setTime(time)
        await seeked
      }
      return null
    },
    close() {},
  }
}

/** Videodatei hinter einer (Blob-)URL laden */
async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.blob()
}

/**
 * Standard-Fabrik: Dekoder per mediabunny, sonst Seek. Die Datei wird pro
 * Element einmal geöffnet.
 */
export const createVideoFrameSource: FrameSourceFactory = async (element, real) => {
  const url = element.currentSrc || element.src
  try {
    if (!url || typeof globalThis.VideoDecoder !== 'function') throw new Error('no decoder')
    const mb = await import('mediabunny')
    const input = new mb.Input({
      source: new mb.BlobSource(await fetchBlob(url)),
      formats: mb.ALL_FORMATS,
    })
    try {
      const track = await input.getPrimaryVideoTrack()
      if (!track || !(await track.canDecode())) throw new Error('video track not decodable')
      // Pool: aktuelles + nächstes Bild + eins im Dekoder → 3 Canvas genügen
      const sink = new mb.CanvasSink(track, { poolSize: 3, alpha: true })
      return createSequentialFrames(sink, () => input.dispose())
    } catch (error) {
      input.dispose()
      throw error
    }
  } catch (error) {
    console.info('[OfflineExport] Video per Seek statt Dekoder:', url.slice(0, 64), error)
    return createSeekFrames(real)
  }
}

/**
 * Video-Ton im Offline-Export.
 *
 * Live hängt der Ton hörbarer Videos (nicht stumm, Lautstärke > 0) über
 * eine eigene Lautstärke direkt an Lautsprecher und Aufnahme. Im Export
 * wird er Frame für Frame eingeplant, während der OfflineAudioContext an
 * der Frame-Zeit angehalten ist: Läuft ein Video hörbar, spielt ab dieser
 * Zeit seine dekodierte Tonspur ab der virtuellen Video-Position (mit
 * Wiedergabe-Rate). Pause, Ende, Seek, Schleifen-Neustart oder Stumm beenden
 * bzw. setzen den Ton zur selben Zeit neu an – so bleibt er am Bild.
 */
import type { OfflineMixContext } from './offlineAudioMix'
import type { VirtualVideo } from './offlineMediaClock'

/** Abweichung zwischen erwarteter und virtueller Position, ab der neu gestartet wird (s) */
const RESYNC_TOLERANCE = 0.02

interface Voice {
  source: AudioBufferSourceNode
  gain: GainNode
  /** Zeitpunkt des Starts im Kontext (s) */
  startedAt: number
  offset: number
  rate: number
  volume: number
}

export interface OfflineVideoAudio {
  /** Ton aller Videos zum Zeitpunkt `time` (s) an deren virtuellen Zustand anpassen */
  update: (time: number, videos: readonly VirtualVideo[]) => Promise<void>
  /** Alle Stimmen beenden (Abbruch) */
  stopAll: (time: number) => void
}

export interface OfflineVideoAudioOptions {
  context: Pick<OfflineMixContext, 'createBufferSource' | 'createGain'>
  destination: AudioNode
  /** Tonspur einer Video-URL dekodieren; null = kein (dekodierbarer) Ton */
  decode: (url: string) => Promise<AudioBuffer | null>
}

/** Hört man das Video gerade (wie live: läuft, nicht stumm, Lautstärke > 0)? */
export const isVideoAudible = (video: VirtualVideo): boolean => {
  const el = video.element
  return video.playing && !video.ended && !el.muted && el.volume > 0
}

const rateOf = (el: HTMLMediaElement) =>
  Number.isFinite(el.playbackRate) && el.playbackRate > 0 ? el.playbackRate : 1

export function createOfflineVideoAudio({
  context,
  destination,
  decode,
}: OfflineVideoAudioOptions): OfflineVideoAudio {
  const buffers = new Map<string, Promise<AudioBuffer | null>>()
  const voices = new Map<HTMLVideoElement, Voice>()

  const bufferFor = (url: string) => {
    let buffer = buffers.get(url)
    if (!buffer) {
      buffer = decode(url).catch((error) => {
        console.info('[OfflineExport] Video ohne verwendbaren Ton:', url.slice(0, 64), error)
        return null
      })
      buffers.set(url, buffer)
    }
    return buffer
  }

  function stop(el: HTMLVideoElement, time: number) {
    const voice = voices.get(el)
    if (!voice) return
    voices.delete(el)
    try {
      voice.source.stop(time)
    } catch {
      // schon beendet
    }
  }

  /** Erwartete Position der laufenden Stimme zum Zeitpunkt `time` */
  const expectedPosition = (voice: Voice, time: number) =>
    voice.offset + (time - voice.startedAt) * voice.rate

  function start(el: HTMLVideoElement, buffer: AudioBuffer, position: number, time: number) {
    // Ton kürzer als das Bild: bis zum nächsten Schleifen-Neustart still
    const offset = Math.max(0, position)
    if (offset >= buffer.duration) return
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rateOf(el)
    const gain = context.createGain()
    gain.gain.value = el.volume
    source.connect(gain)
    gain.connect(destination)
    source.start(time, offset)
    voices.set(el, {
      source,
      gain,
      startedAt: time,
      offset,
      rate: rateOf(el),
      volume: el.volume,
    })
  }

  return {
    async update(time, videos) {
      const active = new Set<HTMLVideoElement>()
      await Promise.all(
        videos.map(async (video) => {
          const el = video.element
          if (!isVideoAudible(video)) return
          const url = el.currentSrc || el.src
          if (!url) return
          const buffer = await bufferFor(url)
          if (!buffer) return
          active.add(el)
          const voice = voices.get(el)
          if (voice) {
            const drift = Math.abs(expectedPosition(voice, time) - video.time)
            if (voice.rate === rateOf(el) && drift < RESYNC_TOLERANCE) {
              if (voice.volume !== el.volume) {
                voice.volume = el.volume
                voice.gain.gain.setValueAtTime(el.volume, time)
              }
              return
            }
            stop(el, time)
          }
          start(el, buffer, video.time, time)
        }),
      )
      // Löschen während der Iteration ist bei Map erlaubt
      for (const el of voices.keys()) if (!active.has(el)) stop(el, time)
    },
    stopAll(time) {
      for (const el of voices.keys()) stop(el, time)
    },
  }
}

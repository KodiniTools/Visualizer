// Offline-Export im RecorderPanel: rendert die Szene schneller (oder
// langsamer) als Echtzeit Frame für Frame und liefert eine MP4.
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useRecorderStore } from '../../stores/recorderStore'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { getAudioEngine } from '../../lib/audioEngineBridge'
import { getOfflineScene } from '../../lib/offlineExport/offlineSceneBridge'
import type { OfflineScene } from '../../lib/offlineExport/offlineSceneBridge'
import { OfflineExportError } from '../../lib/offlineExport/errors'
import type { OfflineExportErrorCode } from '../../lib/offlineExport/errors'
import { hasWebCodecs } from '../../lib/offlineExport/mp4Writer'
import {
  MAX_OFFLINE_SECONDS,
  OFFLINE_SAMPLE_RATE,
  normalizeFps,
} from '../../lib/offlineExport/frameTiming'
import { runOfflineExport } from '../../lib/offlineExport/runOfflineExport'
import type { RunOfflineExportOptions } from '../../lib/offlineExport/runOfflineExport'
import type { OverlayClip } from '../../lib/offlineExport/offlineAudioMix'
import {
  findPlaylistTrack,
  markerTrackDuck,
  markerTrackOffset,
  markerTrackVolume,
} from '../beatMarkers/useMarkerAudioTracks'
import type { MarkerAudioTrackRef } from '../beatMarkers/useMarkerAudioTracks'
import type { Ref } from 'vue'

/** Status des Offline-Exports ('' = inaktiv) */
export type OfflineStatus = '' | 'preparing' | 'rendering' | 'finalizing' | 'completed' | 'error'

export interface OfflineExportDeps {
  /** Bildrate der Aufnahme-Einstellungen (30/60) */
  fps: Ref<number>
  /** Video-Bitrate der Aufnahme-Einstellungen (bit/s) */
  bitrate: Ref<number>
  /** Austauschbar für Tests */
  run?: typeof runOfflineExport
  getScene?: () => OfflineScene | null
  decode?: (url: string) => Promise<AudioBuffer>
  supportsWebCodecs?: () => boolean
  createObjectUrl?: (blob: Blob) => string
  revokeObjectUrl?: (url: string) => void
}

/** Audiodatei (Object-URL) laden und mit der Export-Abtastrate dekodieren. */
export async function decodeAudioUrl(url: string): Promise<AudioBuffer> {
  try {
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    const w = globalThis as typeof globalThis & {
      webkitOfflineAudioContext?: typeof OfflineAudioContext
    }
    const Ctor = globalThis.OfflineAudioContext || w.webkitOfflineAudioContext
    return await new Ctor(1, 1, OFFLINE_SAMPLE_RATE).decodeAudioData(data)
  } catch (error) {
    throw new OfflineExportError('decode', error)
  }
}

export function useOfflineExport({
  fps,
  bitrate,
  run = runOfflineExport,
  getScene = getOfflineScene,
  decode = decodeAudioUrl,
  supportsWebCodecs = hasWebCodecs,
  createObjectUrl = (blob) => URL.createObjectURL(blob),
  revokeObjectUrl = (url) => URL.revokeObjectURL(url),
}: OfflineExportDeps) {
  const playerStore = usePlayerStore()
  const recorderStore = useRecorderStore()
  const audioSourceStore = useAudioSourceStore()
  const beatMarkerStore = useBeatMarkerStore()

  const status = ref<OfflineStatus>('')
  const frame = ref(0)
  const totalFrames = ref(0)
  const errorCode = ref<OfflineExportErrorCode | null>(null)
  const resultUrl = ref<string | null>(null)
  /** Gerenderte Sekunden pro echter Sekunde (1 = Echtzeit) */
  const speed = ref(0)
  let controller: AbortController | null = null

  const isRunning = computed(
    () =>
      status.value === 'preparing' || status.value === 'rendering' || status.value === 'finalizing',
  )
  const progress = computed(() =>
    totalFrames.value > 0 ? Math.min(100, Math.round((frame.value / totalFrames.value) * 100)) : 0,
  )
  const renderedSeconds = computed(() => frame.value / normalizeFps(fps.value))
  const totalSeconds = computed(() => totalFrames.value / normalizeFps(fps.value))
  const isSupported = computed(() => supportsWebCodecs())
  const canStart = computed(
    () =>
      isSupported.value &&
      !isRunning.value &&
      !recorderStore.isRecording &&
      !!playerStore.currentTrack,
  )

  function releaseResult() {
    if (resultUrl.value) revokeObjectUrl(resultUrl.value)
    resultUrl.value = null
  }

  /** Marker-Tracks (Beat-Marker „Track einfügen“) für den Mix laden. */
  async function loadOverlays(): Promise<OverlayClip[]> {
    if (!beatMarkerStore.markersEnabled) return []
    const cache = new Map<string, Promise<AudioBuffer>>()
    const clips: OverlayClip[] = []
    for (const marker of beatMarkerStore.markers) {
      const ref = (marker.action as { audioTrack?: MarkerAudioTrackRef | null } | null)?.audioTrack
      const track = findPlaylistTrack(playerStore.playlist, ref)
      if (!ref || !track) continue
      if (!cache.has(track.url)) cache.set(track.url, decode(track.url))
      clips.push({
        buffer: await (cache.get(track.url) as Promise<AudioBuffer>),
        start: marker.time,
        offset: markerTrackOffset(ref),
        volume: markerTrackVolume(ref),
        duck: markerTrackDuck(ref),
      })
    }
    return clips
  }

  async function start(): Promise<void> {
    if (isRunning.value) return
    releaseResult()
    errorCode.value = null
    frame.value = 0
    totalFrames.value = 0
    speed.value = 0
    status.value = 'preparing'
    const abort = new AbortController()
    controller = abort

    const restoreTime = playerStore.currentTime
    const wasMuted = playerStore.isMuted
    let timelineBegun = false

    try {
      if (!supportsWebCodecs()) throw new OfflineExportError('unsupported')
      if (recorderStore.isRecording) throw new OfflineExportError('busy')
      if (audioSourceStore.isMicrophoneActive) throw new OfflineExportError('microphone')
      const track = playerStore.currentTrack
      if (!track) throw new OfflineExportError('no-track')
      const scene = getScene()
      if (!scene) throw new OfflineExportError('render')

      const main = await decode(track.url)
      if (main.duration > MAX_OFFLINE_SECONDS) throw new OfflineExportError('too-long')
      const overlays = await loadOverlays()
      if (abort.signal.aborted) return

      const exportFps = normalizeFps(fps.value)
      const { width, height } = scene.outputSize()
      const tone = getAudioEngine()?.getToneGains() ?? { bass: 0, treble: 0 }
      const startedAt = performance.now()

      const options: RunOfflineExportOptions = {
        mix: {
          main,
          overlays,
          bassDb: tone.bass,
          trebleDb: tone.treble,
          analysePlayer: audioSourceStore.analysisInput !== 'video',
          duration: main.duration,
          sampleRate: OFFLINE_SAMPLE_RATE,
        },
        fps: exportFps,
        bitrate: bitrate.value,
        width,
        height,
        scene,
        timeline: {
          begin: async () => {
            // Lautsprecher stumm: eingefügte Marker-Tracks und Videos würden sonst hörbar mitlaufen
            playerStore.setMuted(true)
            playerStore.beginOfflinePlayback()
            timelineBegun = true
            // Marker-Watcher (Start bei 0:00) laufen lassen, bevor Frame 0 entsteht
            await nextTick()
          },
          seek: (time) => playerStore.setOfflinePosition(time),
          end: () => {
            playerStore.endOfflinePlayback(restoreTime)
            playerStore.setMuted(wasMuted)
            timelineBegun = false
          },
        },
        signal: abort.signal,
        onProgress: (p) => {
          status.value = 'rendering'
          frame.value = p.frame
          totalFrames.value = p.total
          const realSeconds = (performance.now() - startedAt) / 1000
          if (realSeconds > 0) speed.value = p.frame / exportFps / realSeconds
        },
      }

      const result = await run(options)
      status.value = 'finalizing'
      resultUrl.value = createObjectUrl(result.blob)
      status.value = 'completed'
    } catch (error) {
      if (abort.signal.aborted || (error as { name?: string } | null)?.name === 'AbortError') {
        status.value = ''
        return
      }
      console.error('[OfflineExport] Export fehlgeschlagen:', error)
      errorCode.value = error instanceof OfflineExportError ? error.code : 'render'
      status.value = 'error'
    } finally {
      // Abbruch vor dem Start der Zeitachse oder Fehler danach: Player-Zustand sicher zurück
      if (timelineBegun) {
        playerStore.endOfflinePlayback(restoreTime)
        playerStore.setMuted(wasMuted)
      }
      if (controller === abort) controller = null
      if (abort.signal.aborted && status.value !== 'completed') status.value = ''
    }
  }

  /** Laufenden Export abbrechen. */
  function cancel() {
    controller?.abort()
  }

  /** Ergebnis bzw. Fehlermeldung schließen. */
  function dismiss() {
    if (isRunning.value) return
    releaseResult()
    errorCode.value = null
    status.value = ''
  }

  onBeforeUnmount(() => {
    cancel()
    releaseResult()
  })

  return {
    status,
    frame,
    totalFrames,
    progress,
    renderedSeconds,
    totalSeconds,
    speed,
    errorCode,
    resultUrl,
    isRunning,
    isSupported,
    canStart,
    start,
    cancel,
    dismiss,
  }
}

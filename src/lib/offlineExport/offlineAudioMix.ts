/**
 * Audio des Offline-Exports: baut im OfflineAudioContext dieselbe Kette wie
 * die Live-Engine (useAudioEngine) nach, damit Datei und Visualizer genauso
 * klingen bzw. reagieren wie bei der Aufnahme:
 *
 *   Haupt-Track ─► Ducking ─► Bass (lowshelf 200 Hz) ─► Höhen (highshelf 3 kHz) ─► Ausgabe
 *        └────────► Analyse-Gain ─► Analyser (fftSize 2048)
 *   Marker-Track ─► Lautstärke ─► Bass …  und  ─► Analyse-Gain
 *
 * Wie live hört der Analyser das Signal vor Ducking und Klangregelung.
 */

/** Ein von einem Beat-Marker eingefügter Track */
export interface OverlayClip {
  buffer: AudioBuffer
  /** Einsatz auf der Zeitachse des Haupt-Tracks (s) */
  start: number
  /** Startposition im Track (s) */
  offset: number
  /** Lautstärke 0–1 */
  volume: number
  /** Song-Lautstärke während des Tracks (0–1) oder null = kein Ducking */
  duck: number | null
}

export interface OfflineMixOptions {
  main: AudioBuffer
  overlays: OverlayClip[]
  /** Bass-/Höhen-Verstärkung in dB (wie die Player-Regler) */
  bassDb: number
  trebleDb: number
  /** false bei Analyse-Quelle „Video“: Player und Marker-Tracks nicht analysieren */
  analysePlayer: boolean
  /** Länge der Ausgabe (s) */
  duration: number
  sampleRate: number
}

/** Teil des OfflineAudioContext, den der Mix nutzt (Tests geben einen Fake). */
export interface OfflineMixContext {
  readonly destination: AudioNode
  createBufferSource(): AudioBufferSourceNode
  createGain(): GainNode
  createBiquadFilter(): BiquadFilterNode
  createAnalyser(): AnalyserNode
  startRendering(): Promise<AudioBuffer>
  suspend(suspendTime: number): Promise<void>
  resume(): Promise<void>
}

export type OfflineMixContextFactory = (
  channels: number,
  length: number,
  sampleRate: number,
) => OfflineMixContext

export const createOfflineMixContext: OfflineMixContextFactory = (channels, length, sampleRate) => {
  const w = globalThis as typeof globalThis & {
    webkitOfflineAudioContext?: typeof OfflineAudioContext
  }
  const Ctor = globalThis.OfflineAudioContext || w.webkitOfflineAudioContext
  if (!Ctor) throw new Error('OfflineAudioContext is not available')
  return new Ctor(channels, length, sampleRate) as unknown as OfflineMixContext
}

/** Zeitkonstante des Duckings (s) – wie setPlayerDuck (0,3 s Rampe ≈ 3τ) */
export const DUCK_TIME_CONSTANT = 0.1

/** Analyser-Größe wie in der Live-Engine */
export const ANALYSER_FFT_SIZE = 2048

/** Spielzeit eines eingefügten Tracks ab seiner Startposition (s). */
export const clipLength = (clip: Pick<OverlayClip, 'buffer' | 'offset'>) =>
  Math.max(0, clip.buffer.duration - clip.offset)

export interface DuckChange {
  time: number
  level: number
}

/**
 * Wechsel der Song-Lautstärke durch Ducking: Solange mindestens ein Track
 * mit `duck` läuft, gilt der niedrigste Wert, sonst 1 (wie useMarkerAudioTracks).
 */
export function duckChanges(
  overlays: ReadonlyArray<Pick<OverlayClip, 'buffer' | 'offset' | 'start' | 'duck'>>,
): DuckChange[] {
  const spans = overlays
    .filter((c) => c.duck !== null && Number.isFinite(c.duck) && clipLength(c) > 0)
    .map((c) => ({ start: c.start, end: c.start + clipLength(c), level: c.duck as number }))
  const times = [...new Set(spans.flatMap((s) => [s.start, s.end]))].sort((a, b) => a - b)
  const changes: DuckChange[] = []
  let current = 1
  for (const time of times) {
    let level = 1
    for (const s of spans) if (s.start <= time && time < s.end) level = Math.min(level, s.level)
    if (level !== current) {
      changes.push({ time, level })
      current = level
    }
  }
  return changes
}

export interface OfflineMix {
  context: OfflineMixContext
  /** Analyser im Offline-Graph; liefert beim Anhalten (suspend) das Spektrum dieses Zeitpunkts */
  analyser: AnalyserNode
  /** Anzahl Samples der Ausgabe */
  length: number
}

/** Baut den Offline-Graph auf; gerendert wird erst mit `context.startRendering()`. */
export function buildOfflineMix(
  options: OfflineMixOptions,
  createContext: OfflineMixContextFactory = createOfflineMixContext,
): OfflineMix {
  const { sampleRate } = options
  const length = Math.max(1, Math.ceil(options.duration * sampleRate))
  const ctx = createContext(2, length, sampleRate)

  const analyser = ctx.createAnalyser()
  analyser.fftSize = ANALYSER_FFT_SIZE
  // Analyser stumm an die Ausgabe hängen, damit er sicher mitverarbeitet wird
  const analyserSink = ctx.createGain()
  analyserSink.gain.value = 0
  analyser.connect(analyserSink)
  analyserSink.connect(ctx.destination)

  const analysisGain = ctx.createGain()
  analysisGain.gain.value = options.analysePlayer ? 1 : 0
  analysisGain.connect(analyser)

  const bass = ctx.createBiquadFilter()
  bass.type = 'lowshelf'
  bass.frequency.value = 200
  bass.gain.value = Number.isFinite(options.bassDb) ? options.bassDb : 0
  const treble = ctx.createBiquadFilter()
  treble.type = 'highshelf'
  treble.frequency.value = 3000
  treble.gain.value = Number.isFinite(options.trebleDb) ? options.trebleDb : 0
  bass.connect(treble)
  treble.connect(ctx.destination)

  const duck = ctx.createGain()
  duck.gain.value = 1
  for (const change of duckChanges(options.overlays)) {
    duck.gain.setTargetAtTime(change.level, change.time, DUCK_TIME_CONSTANT)
  }
  duck.connect(bass)

  const main = ctx.createBufferSource()
  main.buffer = options.main
  main.connect(duck)
  main.connect(analysisGain)
  main.start(0)

  for (const clip of options.overlays) {
    if (clipLength(clip) <= 0 || clip.start >= options.duration) continue
    const source = ctx.createBufferSource()
    source.buffer = clip.buffer
    const gain = ctx.createGain()
    gain.gain.value = clip.volume
    source.connect(gain)
    gain.connect(bass)
    gain.connect(analysisGain)
    source.start(Math.max(0, clip.start), clip.offset)
  }

  return { context: ctx, analyser, length }
}

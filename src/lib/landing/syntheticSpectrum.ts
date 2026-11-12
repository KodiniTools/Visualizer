/**
 * Synthetische Frequenzdaten für die Live-Vorschau auf der Landingpage.
 *
 * Die Hero-Vorschau läuft ohne Audio. Damit die Visualizer trotzdem „spielen“,
 * erzeugt diese Funktion pro Frame ein plausibles Spektrum wie vom
 * AnalyserNode (`getByteFrequencyData`, Werte 0–255): ein Kick auf jeder
 * Viertel bei 120 BPM, eine Snare auf 2 und 4, wandernde Mitten und
 * abfallende Höhen. Deterministisch (kein Math.random), damit Tests stabil sind.
 *
 * @module lib/landing/syntheticSpectrum
 */

/** Tempo der synthetischen Musik */
export const SYNTHETIC_BPM = 120

const BEAT_SECONDS = 60 / SYNTHETIC_BPM
/** Anteil der Bins, den die Visualizer darstellen (= CONSTANTS.FREQ_RATIO) */
const VISIBLE_RATIO = 0.21

/** Hüllkurve eines Schlags: sofort voll, dann exponentiell abklingend (0–1). */
function decay(phaseSeconds: number, rate: number): number {
  return Math.exp(-phaseSeconds * rate)
}

/** Kleines deterministisches „Rauschen“ aus überlagerten Sinuswellen (0–1). */
function shimmer(i: number, t: number): number {
  const v =
    Math.sin(i * 0.37 + t * 5.1) * 0.5 +
    Math.sin(i * 1.13 - t * 7.3) * 0.3 +
    Math.sin(i * 2.71 + t * 11.7) * 0.2
  return v * 0.5 + 0.5
}

/**
 * Schreibt ein synthetisches Spektrum für den Zeitpunkt `timeSeconds` in `out`.
 * @param out - Zielpuffer (Länge = frequencyBinCount, z. B. 1024)
 * @param timeSeconds - Laufzeit der Vorschau in Sekunden (≥ 0)
 * @returns derselbe Puffer, zur Verkettung
 */
export function fillSyntheticSpectrum(out: Uint8Array, timeSeconds: number): Uint8Array {
  const n = out.length
  if (n === 0) return out
  const t = Number.isFinite(timeSeconds) && timeSeconds > 0 ? timeSeconds : 0

  const beatPhase = t % BEAT_SECONDS
  const beatIndex = Math.floor(t / BEAT_SECONDS)
  const kick = decay(beatPhase, 7)
  // Snare auf Schlag 2 und 4 eines Takts
  const snare = beatIndex % 2 === 1 ? decay(beatPhase, 10) : 0
  // Langsame Dynamik über 8 Takte, damit die Vorschau nicht monoton pulst
  const swell = 1.05 + 0.2 * Math.sin((t / (BEAT_SECONDS * 32)) * Math.PI * 2)
  // Eine Art Melodie: Mitten-Formant wandert über das Spektrum
  const melodyCenter = 0.35 + 0.15 * Math.sin(t * 0.9) + 0.05 * Math.sin(t * 2.3)

  for (let i = 0; i < n; i++) {
    // Position im sichtbaren Bereich der Visualizer (CONSTANTS.FREQ_RATIO):
    // 0 = tief, 1 = obere Grenze der Anzeige; darüber klingt alles aus.
    const x = i / (n * VISIBLE_RATIO)

    // Bass: Hügel unten, getrieben vom Kick
    const bass = Math.exp(-x / 0.12) * (0.55 + 0.45 * kick)
    // Mitten: Formant um melodyCenter
    const d = (x - melodyCenter) / 0.12
    const mid = Math.exp(-d * d) * (0.3 + 0.1 * Math.sin(t * 3.1))
    // Snare: breitbandig in den oberen Mitten
    const snareBand = snare * Math.exp(-Math.abs(x - 0.65) / 0.2) * 0.25
    // Grundrauschen, zu den Höhen hin abfallend (wie echtes Musikmaterial)
    const floor = 0.25 * Math.exp(-x / 0.9) * (0.5 + 0.5 * shimmer(i, t))

    const level = Math.min(1, (bass + mid + snareBand + floor) * swell)
    out[i] = Math.round(level * 255)
  }
  return out
}

/**
 * Schreibt eine synthetische Wellenform (Zeitbereich wie
 * `getByteTimeDomainData`, Ruhelage 128) für Visualizer mit `needsTimeData`.
 * @param out - Zielpuffer (z. B. 1024 Samples)
 * @param timeSeconds - Laufzeit der Vorschau in Sekunden (≥ 0)
 * @returns derselbe Puffer, zur Verkettung
 */
export function fillSyntheticWaveform(out: Uint8Array, timeSeconds: number): Uint8Array {
  const n = out.length
  if (n === 0) return out
  const t = Number.isFinite(timeSeconds) && timeSeconds > 0 ? timeSeconds : 0
  const beatPhase = t % BEAT_SECONDS
  const kick = decay(beatPhase, 7)
  const amp = 0.35 + 0.45 * kick
  for (let i = 0; i < n; i++) {
    const x = i / n
    // Grundton + Oberton + langsam wandernde Melodie; Phase läuft mit der Zeit
    const v =
      Math.sin(x * Math.PI * 2 * 3 + t * 6) * 0.55 +
      Math.sin(x * Math.PI * 2 * (9 + 2 * Math.sin(t * 0.7)) - t * 9) * 0.3 +
      Math.sin(x * Math.PI * 2 * 31 + t * 17) * 0.15
    out[i] = Math.max(0, Math.min(255, Math.round(128 + v * amp * 127)))
  }
  return out
}

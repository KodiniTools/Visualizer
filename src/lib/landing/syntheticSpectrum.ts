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
  const swell = 0.75 + 0.25 * Math.sin((t / (BEAT_SECONDS * 32)) * Math.PI * 2)
  // Eine Art Melodie: Mitten-Formant wandert über das Spektrum
  const melodyCenter = 0.12 + 0.06 * Math.sin(t * 0.9) + 0.03 * Math.sin(t * 2.3)

  for (let i = 0; i < n; i++) {
    const x = i / n // 0 = tief, 1 = hoch

    // Bass: breiter Hügel unten, getrieben vom Kick
    const bass = Math.exp(-x / 0.025) * (0.55 + 0.45 * kick)
    // Mitten: Formant um melodyCenter
    const d = (x - melodyCenter) / 0.05
    const mid = Math.exp(-d * d) * (0.45 + 0.15 * Math.sin(t * 3.1))
    // Snare: breitbandig im oberen Mittenbereich
    const snareBand = snare * Math.exp(-Math.abs(x - 0.3) / 0.12) * 0.55
    // Grundrauschen, zu den Höhen hin abfallend (wie echtes Musikmaterial)
    const floor = 0.32 * Math.exp(-x / 0.22) * (0.6 + 0.4 * shimmer(i, t))

    const level = Math.min(1, (bass + mid + snareBand + floor) * swell)
    out[i] = Math.round(level * 255)
  }
  return out
}

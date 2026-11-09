/**
 * Zentrale Ablage des globalen Audio-Datensatzes (Pegel, Glättung, Beat,
 * Onsets). Ersetzt den früheren Global window.audioAnalysisData.
 *
 * useGlobalAudioData legt den Datensatz beim Import an und schreibt pro Frame
 * hinein; Renderer und Audio-Reaktiv-Panels lesen ihn über
 * getAudioAnalysisData(). Bis zum Anlegen ist er null (wie zuvor der noch
 * nicht gesetzte window-Global).
 */
export interface AudioAnalysisData {
  bass: number
  mid: number
  treble: number
  volume: number
  smoothBass: number
  smoothMid: number
  smoothTreble: number
  smoothVolume: number
  isBeat: boolean
  beatIntensity: number
  bpm: number
  beatConfidence: number
  onsetBass: number
  onsetMid: number
  onsetTreble: number
  onsetAll: number
}

let current: AudioAnalysisData | null = null

/** Setzt den aktiven Datensatz (null = keiner). */
export function setAudioAnalysisData(data: AudioAnalysisData | null | undefined): void {
  current = data ?? null
}

export function getAudioAnalysisData(): AudioAnalysisData | null {
  return current
}

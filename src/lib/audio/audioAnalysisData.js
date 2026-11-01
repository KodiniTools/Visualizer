/**
 * Zentrale Ablage des globalen Audio-Datensatzes (Pegel, Glättung, Beat,
 * Onsets). Ersetzt den früheren Global window.audioAnalysisData.
 *
 * useGlobalAudioData legt den Datensatz beim Import an und schreibt pro Frame
 * hinein; Renderer und Audio-Reaktiv-Panels lesen ihn über
 * getAudioAnalysisData(). Bis zum Anlegen ist er null (wie zuvor der noch
 * nicht gesetzte window-Global).
 *
 * @typedef {object} AudioAnalysisData
 * @property {number} bass
 * @property {number} mid
 * @property {number} treble
 * @property {number} volume
 * @property {number} smoothBass
 * @property {number} smoothMid
 * @property {number} smoothTreble
 * @property {number} smoothVolume
 * @property {boolean} isBeat
 * @property {number} beatIntensity
 * @property {number} bpm
 * @property {number} beatConfidence
 * @property {number} onsetBass
 * @property {number} onsetMid
 * @property {number} onsetTreble
 * @property {number} onsetAll
 */

/** @type {AudioAnalysisData|null} */
let current = null

/**
 * Setzt den aktiven Datensatz (null = keiner).
 * @param {AudioAnalysisData|null|undefined} data
 */
export function setAudioAnalysisData(data) {
  current = data ?? null
}

/** @returns {AudioAnalysisData|null} */
export function getAudioAnalysisData() {
  return current
}

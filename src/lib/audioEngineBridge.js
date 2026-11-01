/**
 * Zentrale Anbindung an die Audio-Engine (useAudioEngine).
 *
 * Ersetzt die früheren window-Hooks (window.switchAudioSource,
 * window.connectVideoToRecording …). Die Engine registriert sich beim Mount der
 * App; Aufrufer holen sie über getAudioEngine() und bekommen null, solange
 * keine Engine aktiv ist (z.B. in Tests oder vor dem Mount).
 *
 * @typedef {object} AudioEngineApi
 * @property {(sourceType: 'player'|'microphone') => Promise<boolean>} switchAudioSource
 * @property {(enabled: boolean) => Promise<boolean>} toggleRecordingMicrophone
 * @property {(video: HTMLVideoElement, volume?: number) => void} connectVideoToRecording
 * @property {(video: HTMLVideoElement) => void} disconnectVideoFromRecording
 * @property {(video: HTMLVideoElement, volume: number) => void} setVideoVolume
 * @property {(options?: { withMic?: boolean }) => Promise<MediaStream|null>} getAudioStreamForRecorder
 * @property {(gain: number) => void} setBassGain
 * @property {(gain: number) => void} setTrebleGain
 */

/** @type {AudioEngineApi|null} */
let current = null

/**
 * Registriert die aktive Audio-Engine.
 * @param {AudioEngineApi} api
 * @returns {() => void} Abmelden; wirkt nur, wenn `api` noch die aktive Engine ist
 */
export function registerAudioEngine(api) {
  current = api
  return () => {
    if (current === api) current = null
  }
}

/** @returns {AudioEngineApi|null} */
export function getAudioEngine() {
  return current
}

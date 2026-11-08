/**
 * Zentrale Anbindung an die Audio-Engine (useAudioEngine).
 *
 * Ersetzt die früheren window-Hooks (window.switchAudioSource,
 * window.connectVideoToRecording …). Die Engine registriert sich beim Mount der
 * App; Aufrufer holen sie über getAudioEngine() und bekommen null, solange
 * keine Engine aktiv ist (z.B. in Tests oder vor dem Mount).
 */

export interface AudioEngineApi {
  switchAudioSource: (sourceType: 'player' | 'microphone') => Promise<boolean>
  toggleRecordingMicrophone: (enabled: boolean) => Promise<boolean>
  connectVideoToRecording: (video: HTMLVideoElement, volume?: number) => void
  disconnectVideoFromRecording: (video: HTMLVideoElement) => void
  setVideoVolume: (video: HTMLVideoElement, volume: number) => void
  getAudioStreamForRecorder: (options?: { withMic?: boolean }) => Promise<MediaStream | null>
  setBassGain: (gain: number) => void
  setTrebleGain: (gain: number) => void
}

let current: AudioEngineApi | null = null

/**
 * Registriert die aktive Audio-Engine.
 * @returns Abmelden; wirkt nur, wenn `api` noch die aktive Engine ist
 */
export function registerAudioEngine(api: AudioEngineApi): () => void {
  current = api
  return () => {
    if (current === api) current = null
  }
}

export function getAudioEngine(): AudioEngineApi | null {
  return current
}

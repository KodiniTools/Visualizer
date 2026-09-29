/**
 * Audio-Einstellungen dauerhaft speichern (localStorage):
 * - Wiedergabe-Modus (ohne Autoplay / der Reihe nach / wiederholen / Zufall)
 * - gewähltes Mikrofon (das Mikrofon selbst startet NICHT automatisch –
 *   dafür braucht es die Erlaubnis des Nutzers)
 * - Canvas-Audio-Effekte (Audio-FX) und Beat-Drop-Effekte
 *
 * Bereits vorher gespeichert und hier unverändert: Lautstärke, Bass/Höhen
 * (usePlayerVolumeEq) und die Marker-Überblendung (markerTransitionStore).
 * Bewusst NICHT gespeichert: Stummschalten (sonst startet die App scheinbar
 * ohne Ton) und die Audioquelle Mikrofon/Player.
 */
import { setupStorePersistence } from './storePersistence.js'
import { PLAY_MODES } from '../composables/usePlayMode.js'

export const AUDIO_STORAGE_KEYS = Object.freeze({
  player: 'visualizer-player-settings',
  audioInput: 'visualizer-audio-input',
  audioFx: 'visualizer-audio-fx',
  beatDrop: 'visualizer-beat-drop',
})

/**
 * @param {{ playerStore, audioSourceStore, audioFxStore, beatDropStore }} stores
 * @param {{ storage?: Storage }} [opts]
 * @returns {{ flush(): void, stop(): void }}
 */
export function setupAudioSettingsPersistence(stores, opts = {}) {
  const parts = [
    setupStorePersistence(stores.playerStore, {
      ...opts,
      storageKey: AUDIO_STORAGE_KEYS.player,
      keys: ['playMode'],
      sanitize: (clean) => (PLAY_MODES.includes(clean.playMode) ? clean : {}),
    }),
    setupStorePersistence(stores.audioSourceStore, {
      ...opts,
      storageKey: AUDIO_STORAGE_KEYS.audioInput,
      keys: ['selectedDeviceId'],
      sanitize: (clean) => (clean.selectedDeviceId ? clean : {}),
    }),
    setupStorePersistence(stores.audioFxStore, { ...opts, storageKey: AUDIO_STORAGE_KEYS.audioFx }),
    setupStorePersistence(stores.beatDropStore, {
      ...opts,
      storageKey: AUDIO_STORAGE_KEYS.beatDrop,
    }),
  ]
  return {
    flush: () => parts.forEach((p) => p.flush()),
    stop: () => parts.forEach((p) => p.stop()),
  }
}

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
import type { StoreGeneric } from 'pinia'
import { setupStorePersistence, type PersistenceHandle } from './storePersistence'
import { PLAY_MODES } from '../composables/usePlayMode.js'

export const AUDIO_STORAGE_KEYS = Object.freeze({
  player: 'visualizer-player-settings',
  audioInput: 'visualizer-audio-input',
  audioFx: 'visualizer-audio-fx',
  beatDrop: 'visualizer-beat-drop',
})

export interface AudioSettingsStores {
  playerStore: StoreGeneric
  audioSourceStore: StoreGeneric
  audioFxStore: StoreGeneric
  beatDropStore: StoreGeneric
}

export function setupAudioSettingsPersistence(
  stores: AudioSettingsStores,
  opts: { storage?: Storage | null } = {},
): PersistenceHandle {
  const parts = [
    setupStorePersistence(stores.playerStore, {
      ...opts,
      storageKey: AUDIO_STORAGE_KEYS.player,
      keys: ['playMode'],
      sanitize: (clean) =>
        (PLAY_MODES as readonly unknown[]).includes(clean.playMode) ? clean : {},
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

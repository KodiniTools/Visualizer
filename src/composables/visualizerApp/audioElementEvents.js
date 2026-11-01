/**
 * Play/Pause/Ende des Audio-Elements an Player-Store und Audio-Engine
 * weiterreichen (Aufnahme-Audio an/aus, angehaltenen AudioContext fortsetzen).
 *
 * @param {HTMLAudioElement|null} audio
 * @param {{ playerStore: { isPlaying: boolean }, audioEngine: { getAudioContext: () => AudioContext|null, enableRecorderAudio: () => void, disableRecorderAudio: () => void } }} deps
 */
export function bindAudioElementEvents(audio, { playerStore, audioEngine }) {
  if (!audio) return
  audio.addEventListener('play', () => {
    playerStore.isPlaying = true
    const ctx = audioEngine.getAudioContext()
    if (ctx?.state === 'suspended') ctx.resume()
    audioEngine.enableRecorderAudio()
  })
  audio.addEventListener('pause', () => {
    playerStore.isPlaying = false
    audioEngine.disableRecorderAudio()
  })
  audio.addEventListener('ended', () => {
    // Do NOT advance the track here: the player store's own `ended` handler
    // (registered via setAudioRef) owns the play-mode logic (repeat-one,
    // sequence, repeat-all, shuffle, none). Calling nextTrack() here as well
    // would override it — e.g. skipping to the next track instead of
    // repeating the current one in repeat-one mode.
    audioEngine.disableRecorderAudio()
  })
}

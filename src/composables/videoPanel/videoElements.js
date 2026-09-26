/**
 * Helfer für HTML-Video-Elemente im Video-Panel: Anlegen, Zeitsprünge,
 * Lautstärke und Anbindung an den Aufnahme-Audiograph
 * (window.connectVideoToRecording / window.setVideoVolume).
 */

/** Sekunden → 'm:ss' ('0:00' für 0, NaN, Infinity). */
export function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Legt ein Video-Element an (crossOrigin 'anonymous'). Nur übergebene Optionen
 * werden gesetzt; Event-Handler und load() übernimmt der Aufrufer.
 * @param {string} src
 * @param {{ preload: string, muted?: boolean, loop?: boolean, volume?: number }} options
 */
export function createVideoElement(src, { preload, muted, loop, volume }) {
  const video = document.createElement('video')
  video.src = src
  video.crossOrigin = 'anonymous'
  video.preload = preload
  if (muted !== undefined) video.muted = muted
  if (loop !== undefined) video.loop = loop
  if (volume !== undefined) video.volume = volume
  return video
}

/** Zu einer Zeit springen (Wert aus einem Regler, daher parseFloat). */
export function seekTo(video, time) {
  video.currentTime = parseFloat(time)
}

/** `seconds` zurückspringen, nicht vor 0. */
export function seekBackwardBy(video, seconds) {
  video.currentTime = Math.max(0, video.currentTime - seconds)
}

/** `seconds` vorspringen, nicht über die Dauer hinaus. */
export function seekForwardBy(video, seconds) {
  const duration = video.duration || 0
  video.currentTime = Math.min(duration, video.currentTime + seconds)
}

/** Angezeigte Lautstärke: 0 wenn stumm, sonst volume (0 → 1). */
export function displayVolume(video) {
  if (video.muted) return 0
  return video.volume || 1
}

/** Mit dem Aufnahme-Audiograph verbinden (falls verfügbar). */
export function connectToRecording(video, volume) {
  if (window.connectVideoToRecording) {
    window.connectVideoToRecording(video, volume)
  }
}

/** Lautstärke im Aufnahme-Audiograph nachziehen (falls verfügbar). */
function syncRecordingVolume(video, volume) {
  if (window.setVideoVolume) {
    window.setVideoVolume(video, volume)
  }
}

/**
 * Lautstärke eines Hintergrund-Videos setzen (0 = stumm) und im
 * Aufnahme-Audiograph übernehmen.
 * @returns {number} gesetzte Lautstärke
 */
export function setBackgroundVideoVolume(video, value) {
  const volume = parseFloat(value)
  video.volume = volume
  video.muted = volume === 0
  if (volume > 0) connectToRecording(video, volume)
  syncRecordingVolume(video, volume)
  return volume
}

/**
 * Lautstärke eines Canvas-Videos setzen: bei > 0 zuerst die Stummschaltung
 * aufheben, bei 0 danach stumm schalten; im Aufnahme-Audiograph übernehmen.
 * @returns {number} gesetzte Lautstärke
 */
export function setCanvasVideoVolume(video, value) {
  const volume = parseFloat(value)
  if (volume > 0) video.muted = false
  video.volume = volume
  if (volume === 0) video.muted = true
  if (volume > 0) connectToRecording(video, volume)
  syncRecordingVolume(video, volume)
  return volume
}

/**
 * Nach dem Einschalten des Tons: Lautstärke 0 auf 1 anheben und das Video mit
 * der Aufnahme verbinden.
 */
export function ensureAudible(video) {
  if (video.volume === 0) video.volume = 1
  connectToRecording(video, video.volume)
}

/** Stummschaltung anwenden (beim Einschalten des Tons: ensureAudible). */
export function applyMuted(video, muted) {
  video.muted = muted
  if (!muted) ensureAudible(video)
}

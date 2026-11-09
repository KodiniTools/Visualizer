/**
 * Helfer für HTML-Video-Elemente im Video-Panel: Anlegen, Zeitsprünge,
 * Lautstärke und Anbindung an den Aufnahme-Audiograph
 * (Audio-Engine über lib/audioEngineBridge.js).
 */

import { getAudioEngine } from '../../lib/audioEngineBridge'

/** Sekunden → 'm:ss' ('0:00' für 0, NaN, Infinity). */
export function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Optionen für createVideoElement */
export interface VideoElementOptions {
  preload: HTMLVideoElement['preload']
  muted?: boolean
  loop?: boolean
  volume?: number
}

/**
 * Legt ein Video-Element an (crossOrigin 'anonymous'). Nur übergebene Optionen
 * werden gesetzt; Event-Handler und load() übernimmt der Aufrufer.
 */
export function createVideoElement(
  src: string,
  { preload, muted, loop, volume }: VideoElementOptions,
): HTMLVideoElement {
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
export function seekTo(video: HTMLVideoElement, time: string | number): void {
  video.currentTime = parseFloat(time as string)
}

/** `seconds` zurückspringen, nicht vor 0. */
export function seekBackwardBy(video: HTMLVideoElement, seconds: number): void {
  video.currentTime = Math.max(0, video.currentTime - seconds)
}

/** `seconds` vorspringen, nicht über die Dauer hinaus. */
export function seekForwardBy(video: HTMLVideoElement, seconds: number): void {
  const duration = video.duration || 0
  video.currentTime = Math.min(duration, video.currentTime + seconds)
}

/** Angezeigte Lautstärke: 0 wenn stumm, sonst volume (0 → 1). */
export function displayVolume(video: HTMLVideoElement): number {
  if (video.muted) return 0
  return video.volume || 1
}

/** Mit dem Aufnahme-Audiograph verbinden (falls verfügbar). */
export function connectToRecording(video: HTMLVideoElement, volume: number): void {
  getAudioEngine()?.connectVideoToRecording(video, volume)
}

/** Lautstärke im Aufnahme-Audiograph nachziehen (falls verfügbar). */
function syncRecordingVolume(video: HTMLVideoElement, volume: number): void {
  getAudioEngine()?.setVideoVolume(video, volume)
}

/**
 * Lautstärke eines Hintergrund-Videos setzen (0 = stumm) und im
 * Aufnahme-Audiograph übernehmen.
 * @returns gesetzte Lautstärke
 */
export function setBackgroundVideoVolume(video: HTMLVideoElement, value: string | number): number {
  const volume = parseFloat(value as string)
  video.volume = volume
  video.muted = volume === 0
  if (volume > 0) connectToRecording(video, volume)
  syncRecordingVolume(video, volume)
  return volume
}

/**
 * Lautstärke eines Canvas-Videos setzen: bei > 0 zuerst die Stummschaltung
 * aufheben, bei 0 danach stumm schalten; im Aufnahme-Audiograph übernehmen.
 * @returns gesetzte Lautstärke
 */
export function setCanvasVideoVolume(video: HTMLVideoElement, value: string | number): number {
  const volume = parseFloat(value as string)
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
export function ensureAudible(video: HTMLVideoElement): void {
  if (video.volume === 0) video.volume = 1
  connectToRecording(video, video.volume)
}

/** Stummschaltung anwenden (beim Einschalten des Tons: ensureAudible). */
export function applyMuted(video: HTMLVideoElement, muted: boolean): void {
  video.muted = muted
  if (!muted) ensureAudible(video)
}

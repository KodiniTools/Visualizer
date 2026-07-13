/**
 * ReactiveLevel - shared, continuous audio-reactive level computation.
 *
 * Replaces the old binary `useSmooth = smoothing > 30` behaviour (where the
 * 0–100 smoothing slider only chose between raw and a fixed global smoothing)
 * with a real per-target attack/release envelope. Fast attack lets transients
 * and beats punch through; the release slows as smoothing rises, giving a
 * smooth decay. This is what makes images and background react crisply on hits
 * yet settle without flicker.
 *
 * Envelope state is kept in a WeakMap keyed by the owning audio-reactive
 * settings object, so it:
 *   - persists across frames per image/background,
 *   - is garbage-collected with the owner,
 *   - never pollutes the object (important: settings are JSON-serialized when
 *     saved as presets).
 *
 * @module audio/ReactiveLevel
 */

import { getAudioLevel, applyBeatBoost, applyPhaseOffset } from './AudioLevelCalculator.js'
import { applyEasing } from './EasingFunctions.js'

// owner (settings object) → { [sourceKey]: smoothedLevel }
const envStore = new WeakMap()

function getEnv(owner) {
  let env = envStore.get(owner)
  if (!env) {
    env = {}
    envStore.set(owner, env)
  }
  return env
}

/**
 * Maps the 0–100 smoothing slider to asymmetric one-pole coefficients.
 * Attack stays fast across the whole range so beats always register; release
 * slows down as smoothing increases for a gliding decay.
 * @param {number} smoothing 0–100
 * @returns {{attack:number, release:number}} per-frame blend coefficients (0–1)
 */
export function smoothingToEnvelope(smoothing) {
  const s = Math.max(0, Math.min(100, smoothing ?? 50)) / 100
  const attack = 1 - 0.6 * s // 1.0 (instant) … 0.4 (still snappy)
  const release = 1 - 0.93 * s // 1.0 (instant) … 0.07 (smooth decay)
  return { attack, release }
}

/**
 * One-pole asymmetric smoothing toward a target value.
 * @param {number|undefined} prev previous smoothed value (undefined seeds it)
 * @param {number} target new raw value
 * @param {number} attack coefficient when rising
 * @param {number} release coefficient when falling
 * @returns {number} new smoothed value
 */
export function applyEnvelope(prev, target, attack, release) {
  if (prev == null || Number.isNaN(prev)) return target
  const coef = target >= prev ? attack : release
  return prev + (target - prev) * coef
}

/**
 * Computes a normalized (0–1) reactive level for one audio source, applying —
 * in order — beat boost, phase offset, attack/release smoothing, easing and
 * gain. The envelope for `source` advances once per call, so callers that need
 * several effects sharing a source should compute the level once per frame
 * (see makeLevelResolver).
 *
 * @param {object} owner - stable settings object used as envelope state key
 * @param {object} opts
 * @param {string} opts.source - 'bass' | 'mid' | 'treble' | 'volume' | 'dynamic'
 * @param {object} opts.audioData - window.audioAnalysisData
 * @param {number} [opts.smoothing=50]
 * @param {number} [opts.beatBoost=1.0]
 * @param {number} [opts.phase=0]
 * @param {string} [opts.easing='linear']
 * @param {number} [opts.gain=1.0]
 * @param {number} [time=Date.now()]
 * @returns {number} normalized level 0–1
 */
export function computeReactiveLevel(owner, opts, time = Date.now()) {
  const {
    source = 'bass',
    audioData,
    smoothing = 50,
    beatBoost = 1.0,
    phase = 0,
    easing = 'linear',
    gain = 1.0,
  } = opts
  if (!audioData) return 0

  // Read the RAW band value; our envelope is the single source of smoothing.
  let level = getAudioLevel(source, audioData, false)
  level = applyBeatBoost(level, audioData, beatBoost)
  level = applyPhaseOffset(level, phase, time)

  const env = getEnv(owner)
  const { attack, release } = smoothingToEnvelope(smoothing)
  const smoothed = applyEnvelope(env[source], level, attack, release)
  env[source] = smoothed

  let normalized = applyEasing(smoothed / 255, easing)
  if (gain != null && gain !== 1.0) normalized *= gain
  return Math.max(0, Math.min(1, normalized))
}

/**
 * Returns a memoized resolver so multiple effects sharing an audio source
 * advance that source's envelope only once per frame. Create one per
 * getAudioReactiveValues() call.
 *
 * @param {object} owner
 * @param {object} baseOpts - shared options (audioData, smoothing, beatBoost, …)
 * @param {number} [time]
 * @returns {(source:string)=>number}
 */
export function makeLevelResolver(owner, baseOpts, time = Date.now()) {
  const cache = new Map()
  return (source) => {
    if (!cache.has(source)) {
      cache.set(source, computeReactiveLevel(owner, { ...baseOpts, source }, time))
    }
    return cache.get(source)
  }
}

/** Test/util: clears stored envelope state for an owner. */
export function resetReactiveLevel(owner) {
  envStore.delete(owner)
}

/**
 * onsetFlourish - beat-triggered flourish amount for individual visualizers.
 *
 * Lets a visualizer add a discrete "flourish" on each beat — a particle surge,
 * a bloom pop, a grid punch — driven by the self-normalized onset signal that
 * useGlobalAudioData publishes on window.audioAnalysisData. Because the onset
 * is auto-gained, the flourish fires equally on quiet and loud tracks and
 * reacts to hits rather than sustained loudness.
 *
 * OPT-IN: the render loop bridges the store setting AND the current onset
 * values onto the shared visualizer state once per frame —
 * `visualizerState._onsetFx = { enabled, strength }` and
 * `visualizerState._onsetData = { bass, mid, treble, all }`. Reading from
 * visualizerState (rather than window.audioAnalysisData) means this works
 * identically on the main thread and inside the OffscreenCanvas worker, which
 * has no `window`; the worker path receives both via its render message. When
 * the flag is absent or disabled, onsetFlourish() returns 0, so a visualizer
 * that calls it is unchanged until the user enables the feature.
 *
 * @module visualizers/core/onsetFlourish
 */

import { visualizerState } from './state.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/**
 * Current flourish amount for a band: the onset (0–1) scaled by user strength,
 * or 0 when the feature is disabled.
 * @param {string} source - 'bass' | 'mid' | 'treble' | 'all' (default 'all')
 * @returns {number} flourish amount 0–1
 */
export function onsetFlourish(source = 'all') {
  const cfg = visualizerState._onsetFx
  if (!cfg || !cfg.enabled) return 0
  const data = visualizerState._onsetData
  if (!data) return 0
  const raw = data[source] ?? data.all ?? 0
  const strength = Math.max(0, Math.min(100, cfg.strength ?? 100)) / 100
  return clamp01(raw) * strength
}

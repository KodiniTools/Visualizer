import { visualizerState } from '../../lib/visualizers/core/state.js'
import { stepReactGate, applyReactFactor } from '../../lib/visualizers/core/reactSource.js'

/**
 * Reaktionsquelle: gatet die Audiodaten mit der Hüllkurve aus `settings`
 * (Store oder Layer: reactSource, reactStrength, reactSmoothing, reactGain,
 * reactEasing, reactBeatBoost, reactPhase). Die Kette liegt in
 * core/reactSource.js; hier wird nur der Zustand pro Ziel gehalten.
 *
 * @param {Uint8Array} data - Frequenz- oder Zeitdaten
 * @param {object} settings
 * @param {{ env?: number, buf?: Uint8Array }} state - Hüllkurve + Scratch-Puffer (wird fortgeschrieben)
 * @param {boolean} timeDomain
 * @returns {Uint8Array} gegatete Daten (oder `data` unverändert)
 */
export function gateAudioData(data, settings, state, timeDomain) {
  const src = settings.reactSource || 'spectrum'
  if (src === 'spectrum' || !(settings.reactStrength > 0)) {
    state.env = 0
    return data
  }
  const { env, factor } = stepReactGate(
    state.env || 0,
    settings,
    window.audioAnalysisData,
    visualizerState._dtMs,
    Date.now(),
  )
  state.env = env
  const out = applyReactFactor(data, factor, state.buf, timeDomain)
  if (out !== data) state.buf = out
  return out
}

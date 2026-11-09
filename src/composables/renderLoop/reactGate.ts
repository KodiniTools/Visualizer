import { visualizerState } from '../../lib/visualizers/core/state'
import {
  stepReactGate,
  applyReactFactor,
  type ReactSettings,
} from '../../lib/visualizers/core/reactSource'
import { getAudioAnalysisData } from '../../lib/audio/audioAnalysisData'

/** Hüllkurve + Scratch-Puffer je Ziel */
export interface ReactGateState {
  env?: number
  buf?: Uint8Array | null
}

/**
 * Reaktionsquelle: gatet die Audiodaten mit der Hüllkurve aus `settings`
 * (Store oder Layer: reactSource, reactStrength, reactSmoothing, reactGain,
 * reactEasing, reactBeatBoost, reactPhase). Die Kette liegt in
 * core/reactSource.js; hier wird nur der Zustand pro Ziel gehalten.
 *
 * @param data - Frequenz- oder Zeitdaten
 * @param state - Hüllkurve + Scratch-Puffer (wird fortgeschrieben)
 * @returns gegatete Daten (oder `data` unverändert)
 */
export function gateAudioData(
  data: Uint8Array,
  settings: ReactSettings,
  state: ReactGateState,
  timeDomain?: boolean,
): Uint8Array {
  const src = settings.reactSource || 'spectrum'
  if (src === 'spectrum' || !((settings.reactStrength as number) > 0)) {
    state.env = 0
    return data
  }
  const { env, factor } = stepReactGate(
    state.env || 0,
    settings,
    getAudioAnalysisData(),
    visualizerState._dtMs,
    Date.now(),
  )
  state.env = env
  const out = applyReactFactor(data, factor, state.buf ?? null, timeDomain)
  if (out !== data) state.buf = out
  return out
}

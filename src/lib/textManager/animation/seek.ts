/**
 * Animationen eines Textes auf eine Laufzeit setzen (Spulen).
 *
 * Gegenstück zu den `restart*`-Funktionen: Statt von vorn zu beginnen, steht
 * jeder aktive Effekt danach so, als liefe er seit `elapsedMs`. Inaktive
 * Effekte bleiben unberührt.
 *
 * @module textManager/animation/seek
 */
import { ensureAnimationState } from './state'
import { timelineStartForElapsed } from './timeline'
import type { TextObject, TimelineStateKey, TimedTextAnimation } from '../types'

/** Default-Pause zwischen zwei Durchläufen (wie in typewriter.ts) */
const DEFAULT_LOOP_DELAY = 1000

const TIMED: ReadonlyArray<['fade' | 'scale' | 'slide', TimelineStateKey]> = [
  ['fade', 'fadeStartTime'],
  ['scale', 'scaleStartTime'],
  ['slide', 'slideStartTime'],
]

/**
 * @param textObj - Text mit `animation`
 * @param elapsedMs - Zeit seit dem Auslösen (z.B. durch einen Beat-Marker) in ms
 * @param now - Bezugszeitpunkt in ms (Default Date.now(), wie beim Zeichnen)
 */
export function seekTextAnimation(
  textObj: TextObject | null | undefined,
  elapsedMs: number,
  now = Date.now(),
): void {
  const animation = textObj?.animation
  if (!textObj || !animation) return
  const state = ensureAnimationState(animation)

  for (const [key, stateKey] of TIMED) {
    const cfg = animation[key] as TimedTextAnimation | undefined
    if (!cfg?.enabled) continue
    state[stateKey] = timelineStartForElapsed(cfg, elapsedMs, now)
    if (key === 'fade') state.fadePhase = null
  }

  const tw = animation.typewriter
  if (tw?.enabled) {
    let sinceStart = Math.max(0, elapsedMs) - (tw.startDelay || 0)
    const typing = (textObj.content || '').length * (tw.speed || 50)
    if (tw.loop && sinceStart > 0) {
      const period = typing + (tw.loopDelay ?? DEFAULT_LOOP_DELAY)
      if (period > 0) sinceStart %= period
    }
    state.startTime = now - sinceStart || 1
    state.isPlaying = true
    state.currentIndex = 0
  }
}

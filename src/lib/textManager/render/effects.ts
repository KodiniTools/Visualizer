/**
 * Kleiner Zugriffshelfer für audio-reaktive Effektwerte.
 *
 * `drawText` wiederholte 20 Mal das Idiom
 * `audioReactive && audioReactive.hasEffects && audioReactive.effects.X`.
 *
 * @module textManager/render/effects
 */
import type { TextAudioReactiveValues, TextEffectMap } from '../types'

/**
 * Liefert die aktiven Effekte oder null.
 *
 * @param {object|null|undefined} audioReactive - Ergebnis von getAudioReactiveValues()
 * @returns {object|null} audioReactive.effects, wenn Effekte aktiv sind
 */
export function activeEffects(
  audioReactive: TextAudioReactiveValues | null | undefined,
): TextEffectMap | null {
  if (!audioReactive || !audioReactive.hasEffects) return null
  return audioReactive.effects || null
}

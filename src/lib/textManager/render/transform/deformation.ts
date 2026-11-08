/**
 * Verformung eines Text-Objekts für einen Frame: Skalierung, Drehung,
 * Scherung, Stretch und Beat-Flip.
 *
 * @module textManager/render/transform/deformation
 */
import type { TextAudioReactiveValues, TextObject } from '../../types'

/** Skalierung, Drehung und Verzerrung eines Texts im aktuellen Frame */
export interface TextDeformation {
  scale: number
  totalRotation: number
  skewX: number
  skewY: number
  stretchX: number
  stretchY: number
  flipScaleX: number
}
import { getScaleValue } from '../../animation/scale'
import { activeEffects } from '../effects'

/** Unterhalb dieser Breite würde der gespiegelte Text unsichtbar kollabieren. */
const MIN_FLIP_SCALE = 0.02

/**
 * @param {object} textObj
 * @param {object|null} audioReactive
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{scale: number, totalRotation: number, skewX: number, skewY: number,
 *   stretchX: number, stretchY: number, flipScaleX: number}}
 */
export function computeDeformation(
  textObj: TextObject,
  audioReactive: TextAudioReactiveValues | null | undefined,
  now: number,
): TextDeformation {
  const fx = activeEffects(audioReactive)

  // ✨ AUDIO-REAKTIV: Scale-Effekt (pulsieren) und Beat-Puls
  // der Scale-Effekt liefert den Wert immer
  let scale = fx && fx.scale ? (fx.scale.scale as number) : 1.0
  if (fx && fx.beatPulse) scale *= fx.beatPulse.scale || 1.0

  // ✨ AUDIO-REAKTIV: Zoom-Punch, BPM-Puls, Frequenz-Split (Skalierung) und Beat-Flip
  let flipScaleX = 1
  if (fx) {
    for (const key of ['zoomPunch', 'bpmPulse', 'freqSplit']) {
      if (fx[key] && typeof fx[key].scale === 'number') scale *= fx[key].scale
    }
    if (fx.beatFlip && typeof fx.beatFlip.flipScaleX === 'number') {
      const f = fx.beatFlip.flipScaleX
      flipScaleX = Math.abs(f) < MIN_FLIP_SCALE ? MIN_FLIP_SCALE * Math.sign(f || 1) : f
    }
  }

  // ✨ SCALE-ANIMATION: Scale aus Animation anwenden
  scale = scale * getScaleValue(textObj, now).scale

  // ✨ AUDIO-REAKTIV: 3D-Perspektive-Effekt (Skalierung + Scherung)
  let skewX = 0
  let skewY = 0
  if (fx && fx.perspective3d) {
    const p3d = fx.perspective3d
    scale = scale * (p3d.perspective3dScale || 1.0)
    skewX = p3d.perspective3dSkewX || 0
    skewY = p3d.perspective3dSkewY || 0
  }

  // ✨ AUDIO-REAKTIV: Skew-Effekt (Verzerrung)
  if (fx && fx.skew) {
    skewX += fx.skew.skewX || 0
    skewY += fx.skew.skewY || 0
  }

  // ✨ AUDIO-REAKTIV: Rotation-Effekt (oszillierende Drehung)
  const audioRotation = fx && fx.rotation ? fx.rotation.rotationAngle || 0 : 0

  // ✨ AUDIO-REAKTIV: Elastic-Effekt (Gummi-Verformung)
  let stretchX = 1.0
  let stretchY = 1.0
  if (fx && fx.elastic) {
    stretchX = fx.elastic.stretchX || 1.0
    stretchY = fx.elastic.stretchY || 1.0
  }

  return {
    scale,
    totalRotation: (textObj.rotation || 0) + audioRotation,
    skewX,
    skewY,
    stretchX,
    stretchY,
    flipScaleX,
  }
}

/**
 * Einblend-Animationen für Bilder und Videos auf dem Canvas
 * (fade, slideLeft/Right/Up/Down, zoom, bounce, spin, elastic).
 */

const NEUTRAL = Object.freeze({ opacity: 1, translateX: 0, translateY: 0, scale: 1, rotation: 0 })

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function easeOutBounce(t) {
  const n1 = 7.5625
  const d1 = 2.75

  if (t < 1 / d1) {
    return n1 * t * t
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
}

export function easeOutElastic(t) {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

/**
 * Transform eines Objekts während seiner Einblend-Animation.
 *
 * @param {{active?: boolean, type?: string, progress?: number}|undefined} animation
 *   Animationszustand des Objekts (progress 0…1)
 * @param {{width: number, height: number}} canvas  Bezug für Verschiebungen
 * @returns {{opacity: number, translateX: number, translateY: number, scale: number, rotation: number}}
 *   rotation in Grad
 */
export function getEntranceTransform(animation, canvas) {
  if (!animation || !animation.active) return { ...NEUTRAL }

  const progress = animation.progress
  const eased = easeOutCubic(progress)

  switch (animation.type) {
    case 'fade':
      // Linear für gleichmäßiges Einblenden über die gesamte Dauer
      return { ...NEUTRAL, opacity: progress }

    case 'slideLeft':
      return { ...NEUTRAL, opacity: eased, translateX: (1 - eased) * canvas.width * 0.3 }

    case 'slideRight':
      return { ...NEUTRAL, opacity: eased, translateX: (eased - 1) * canvas.width * 0.3 }

    case 'slideUp':
      return { ...NEUTRAL, opacity: eased, translateY: (1 - eased) * canvas.height * 0.3 }

    case 'slideDown':
      return { ...NEUTRAL, opacity: eased, translateY: (eased - 1) * canvas.height * 0.3 }

    case 'zoom':
      return { ...NEUTRAL, opacity: eased, scale: 0.3 + eased * 0.7 }

    case 'bounce':
      return { ...NEUTRAL, translateY: (1 - easeOutBounce(progress)) * -canvas.height * 0.2 }

    case 'spin':
      return { ...NEUTRAL, opacity: eased, scale: eased, rotation: (1 - eased) * 360 }

    case 'elastic':
      return { ...NEUTRAL, scale: easeOutElastic(progress) }

    default:
      return { ...NEUTRAL }
  }
}

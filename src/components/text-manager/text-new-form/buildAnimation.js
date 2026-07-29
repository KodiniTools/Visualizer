/**
 * Baut die Animations-Konfiguration für ein neues Text-Objekt aus den
 * einzelnen Effekt-Einstellungen zusammen.
 *
 * @param {object} settings
 * @param {object} settings.typewriter - Typewriter-Einstellungen
 * @param {object} settings.fade - Fade-Einstellungen
 * @param {object} settings.scale - Scale-Einstellungen
 * @param {object} settings.slide - Slide-Einstellungen
 * @returns {object|null} Animations-Objekt oder null, wenn kein Effekt aktiv ist
 */
export function buildAnimationConfig({ typewriter, fade, scale, slide }) {
  const hasTypewriter = typewriter.enabled
  const hasFade = fade.enabled
  const hasScale = scale.enabled
  const hasSlide = slide.enabled

  if (!hasTypewriter && !hasFade && !hasScale && !hasSlide) {
    return null
  }

  const types = []
  if (hasTypewriter) types.push('typewriter')
  if (hasFade) types.push('fade')
  if (hasScale) types.push('scale')
  if (hasSlide) types.push('slide')
  const animationType = types.join('+') || 'none'

  return {
    type: animationType,
    typewriter: {
      enabled: hasTypewriter,
      speed: typewriter.speed,
      startDelay: typewriter.startDelay,
      loop: typewriter.loop,
      loopDelay: typewriter.loopDelay,
      permanent: typewriter.permanent !== false,
      displayDuration: typewriter.displayDuration ?? 5000,
      showCursor: typewriter.showCursor,
      cursorChar: typewriter.cursorChar,
    },
    fade: {
      enabled: hasFade,
      duration: fade.duration,
      startDelay: fade.startDelay,
      direction: fade.direction,
      loop: fade.loop,
      loopDelay: fade.loopDelay,
      permanent: fade.permanent !== false,
      displayDuration: fade.displayDuration ?? 5000,
      easing: fade.easing,
    },
    scale: {
      enabled: hasScale,
      duration: scale.duration,
      startDelay: scale.startDelay,
      startScale: scale.startScale,
      endScale: scale.endScale,
      direction: scale.direction,
      loop: scale.loop,
      loopDelay: scale.loopDelay,
      permanent: scale.permanent !== false,
      displayDuration: scale.displayDuration ?? 5000,
      easing: scale.easing,
    },
    slide: {
      enabled: hasSlide,
      duration: slide.duration,
      startDelay: slide.startDelay,
      from: slide.from,
      distance: slide.distance,
      direction: slide.direction,
      loop: slide.loop,
      loopDelay: slide.loopDelay,
      permanent: slide.permanent !== false,
      displayDuration: slide.displayDuration ?? 5000,
      easing: slide.easing,
    },
    _state: {
      startTime: null,
      isPlaying: false,
      currentIndex: 0,
    },
  }
}

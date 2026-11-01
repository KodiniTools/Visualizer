import { ensureTextAudioReactive } from '../../lib/audio/audioReactiveConfig.js'

/**
 * Ergänzt fehlende Eigenschaften älterer Text-Objekte (in place), bevor der
 * Editor sie anzeigt. Vorhandene Werte bleiben unverändert.
 * @param {object} obj Text-Objekt (type === 'text')
 * @returns {object} dasselbe Objekt
 */
export function ensureTextObjectDefaults(obj) {
  if (!obj.letterSpacing && obj.letterSpacing !== 0) {
    obj.letterSpacing = 0
  }
  if (!obj.lineHeightMultiplier) {
    obj.lineHeightMultiplier = 120
  }
  if (!obj.stroke) {
    obj.stroke = { enabled: false, color: '#000000', width: 2 }
  }
  if (obj.stroke && obj.stroke.enabled === undefined) {
    obj.stroke.enabled = false
  }
  if (!obj.shadow) {
    obj.shadow = { color: '#000000', blur: 0, offsetX: 0, offsetY: 0 }
  }

  // audioReactive vervollständigen (ältere Text-Objekte kennen nur wenige Effekte)
  obj.audioReactive = ensureTextAudioReactive(obj.audioReactive)

  if (!obj.animation) {
    obj.animation = {
      type: 'none',
      typewriter: {
        enabled: false,
        speed: 50,
        startDelay: 0,
        loop: false,
        loopDelay: 1000,
        permanent: true,
        displayDuration: 5000,
        showCursor: true,
        cursorChar: '|',
      },
      _state: { startTime: null, isPlaying: false, currentIndex: 0 },
    }
  }
  return obj
}

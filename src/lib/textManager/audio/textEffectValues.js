/**
 * Audio-reaktive Effektwerte für Text-Objekte.
 *
 * 1:1 aus textManager.js herausgelöst (getAudioReactiveValues,
 * _calculateTextEffectValue). Text-Sonderfälle werden hier berechnet, alle
 * übrigen Effekte kommen aus der gemeinsamen Engine der Canvas-Bilder.
 *
 * @module textManager/audio/textEffectValues
 */
import { makeLevelResolver } from '../../audio/ReactiveLevel.js'
import { calculateBeatPulse, calculateEffectValue } from '../../audio/index.js'

/**
 * Berechnet für alle aktivierten Effekte einer Text-Konfiguration die Werte.
 *
 * @param {object|null} audioSettings - textObj.audioReactive
 * @returns {{hasEffects: true, effects: Record<string, object>}|null}
 */
export function getAudioReactiveValues(audioSettings) {
  if (!audioSettings || !audioSettings.enabled) {
    return null
  }

  const audioData = window.audioAnalysisData
  if (!audioData) return null

  const effects = audioSettings.effects
  if (!effects) return null

  // ✨ Geteilte, kontinuierliche Reaktions-Berechnung (wie Bilder/Hintergründe):
  //  - kontinuierliches Vor-Smoothing statt binärem useSmooth>30
  //  - funktionierender Beat-Boost (nutzt jetzt vorhandene Beat-Daten)
  //  - Threshold-Gate + explizites Attack/Release (Text-spezifisch)
  //  - individuelle Audio-Quelle pro Effekt (Parität mit Bildern)
  // Der Resolver berechnet jede Quelle nur einmal pro Frame.
  const globalSource = audioSettings.source || 'bass'
  const resolveLevel = makeLevelResolver(audioSettings, {
    audioData,
    preSmoothing: (audioSettings.smoothing ?? 50) / 100,
    threshold: (audioSettings.threshold || 0) / 100,
    attack: (audioSettings.attack ?? 90) / 100,
    release: (audioSettings.release ?? 50) / 100,
    beatBoost: audioSettings.beatBoost ?? 1.0,
    phase: audioSettings.phase || 0,
    easing: audioSettings.easing || 'linear',
    gain: audioSettings.gain ?? 1.0,
  })

  // Ergebnis-Objekt für alle aktivierten Effekte
  const result = {
    hasEffects: false,
    effects: {},
  }

  // Berechne Werte für jeden aktivierten Effekt
  for (const [effectName, effectConfig] of Object.entries(effects)) {
    if (effectConfig && effectConfig.enabled) {
      const effectSource = effectConfig.source || globalSource
      const baseLevel = resolveLevel(effectSource)
      const intensity = (effectConfig.intensity || 80) / 100
      const normalizedLevel = Math.min(1, baseLevel * intensity)

      result.hasEffects = true
      result.effects[effectName] = calculateTextEffectValue(
        effectName,
        normalizedLevel,
        effectConfig,
      )
    }
  }

  return result.hasEffects ? result : null
}

/**
 * ✨ Berechnet den Wert für einen einzelnen Text-Effekt
 *
 * @param {string} effectName - Name des Effekts
 * @param {number} normalizedLevel - Audio-Level normalisiert (0-1)
 * @param {object} [effectConfig] - Konfiguration des Effekts (minimum, ease, …)
 * @returns {object} Effektwerte, die drawText auswertet
 */
export function calculateTextEffectValue(effectName, normalizedLevel, effectConfig = {}) {
  // ✨ NEU: Ease-Kurve anwenden (Ease-Out für natürlichere Animation)
  let level = normalizedLevel
  if (effectConfig.ease) {
    // Ease-Out Cubic: schneller Start, sanftes Ende
    level = 1 - Math.pow(1 - normalizedLevel, 3)
  }

  switch (effectName) {
    case 'hue':
      // Hue-Rotation: 0-720 Grad (2x Durchlauf für stärkeren Effekt)
      return { hueRotate: level * 720 }
    case 'brightness':
      // Helligkeit: 60-180% basierend auf Audio-Level
      return { brightness: 60 + level * 120 }
    case 'scale':
      // Skalierung: 1.0-1.5 basierend auf Audio-Level
      return { scale: 1.0 + level * 0.5 }
    case 'glow':
      // Glow/Shadow: 0-50px basierend auf Audio-Level
      return {
        glowBlur: level * 50,
        glowColor: `rgba(139, 92, 246, ${0.5 + level * 0.5})`,
      }
    case 'shake':
      // Erschütterung: Zufällige X/Y-Verschiebung bei hohem Audio-Level
      if (level > 0.2) {
        const shakeIntensity = level * 15
        const shakeX = (Math.random() - 0.5) * 2 * shakeIntensity
        const shakeY = (Math.random() - 0.5) * 2 * shakeIntensity
        return { shakeX, shakeY }
      }
      return { shakeX: 0, shakeY: 0 }
    case 'bounce': {
      // Vertikales Hüpfen: Sinuswelle + Audio-Level
      const timeBounce = Date.now() * 0.008
      const bounceAmount = Math.abs(Math.sin(timeBounce)) * level * 30
      return { bounceY: -bounceAmount }
    }
    case 'swing': {
      // Horizontales Pendeln: Sinuswelle für sanftes Hin-und-Her
      const timeSwing = Date.now() * 0.004
      const swingAmount = Math.sin(timeSwing) * level * 40
      return { swingX: swingAmount }
    }
    case 'opacity': {
      // ✨ NEU: Minimum-Wert für Opacity unterstützen
      const minimum = effectConfig.minimum || 0
      // Opacity geht von minimum bis 100% basierend auf Audio-Level
      const opacityRange = 100 - minimum
      return { opacity: minimum + level * opacityRange }
    }
    case 'letterSpacing':
      // Dynamischer Buchstabenabstand: 0-30px basierend auf Audio-Level
      return { letterSpacing: level * 30 }
    case 'strokeWidth':
      // Pulsierende Kontur-Dicke: 0-10px basierend auf Audio-Level
      return { strokeWidth: level * 10 }

    // ✨ NEU: Erweiterte Audio-Reaktive Effekte
    case 'skew': {
      // Verzerrung: Oszillierende Scheren-Transformation (X/Y unabhängig)
      const timeSkew = Date.now() * 0.003
      const skewX = Math.sin(timeSkew) * level * 30 // -30 bis +30 Grad auf X-Achse
      const skewY = Math.cos(timeSkew * 0.7) * level * 15 // -15 bis +15 Grad auf Y-Achse (langsamer)
      return { skewX, skewY }
    }

    case 'strobe': {
      // Strobe: Blitz-Effekt bei Audio-Peaks (nur aktiviert wenn Audio > 60%)
      const strobeActive = level > 0.6
      const strobeOpacity = strobeActive ? (Math.random() > 0.3 ? 1.0 : 0.0) : 1.0
      const strobeBrightness = strobeActive ? 150 + Math.random() * 100 : 100
      return { strobeOpacity, strobeBrightness, strobeActive }
    }

    case 'rgbGlitch': {
      // RGB-Glitch: Chromatische Aberration (Rot/Grün/Blau Verschiebung)
      const glitchIntensity = level * 8 // Max 8px Verschiebung
      const timeGlitch = Date.now() * 0.01
      const redOffsetX = Math.sin(timeGlitch) * glitchIntensity
      const redOffsetY = Math.cos(timeGlitch * 1.3) * glitchIntensity * 0.5
      const blueOffsetX = Math.sin(timeGlitch + 2) * glitchIntensity
      const blueOffsetY = Math.cos(timeGlitch * 0.8 + 1) * glitchIntensity * 0.5
      return { redOffsetX, redOffsetY, blueOffsetX, blueOffsetY, glitchIntensity }
    }

    case 'perspective3d': {
      // 3D-Perspektive: Simulierter 3D-Kipp-Effekt (Skalierung + Scherung kombiniert)
      const time3d = Date.now() * 0.002
      const rotateX = Math.sin(time3d) * level * 20 // Kippung um X-Achse
      const rotateY = Math.cos(time3d * 0.8) * level * 15 // Kippung um Y-Achse
      const perspective3dScale = 1.0 + Math.sin(time3d * 0.5) * level * 0.15 // Leichte Skalierung
      const perspective3dSkewX = Math.sin(time3d) * level * 10
      const perspective3dSkewY = Math.cos(time3d * 0.6) * level * 5
      return { rotateX, rotateY, perspective3dScale, perspective3dSkewX, perspective3dSkewY }
    }

    case 'wave': {
      // Welle: Parameter für wellenförmige Buchstabenbewegung (La-Ola-Effekt)
      const waveTime = Date.now() * 0.005
      const waveAmplitude = level * 20 // Max 20px Amplitude
      const waveFrequency = 0.3 // Wellenlänge
      const waveSpeed = waveTime // Geschwindigkeit der Welle
      return { waveAmplitude, waveFrequency, waveSpeed, waveEnabled: true }
    }

    case 'rotation': {
      // Rotation: Oszillierende Drehung basierend auf Audio
      const rotTime = Date.now() * 0.003
      const rotationAngle = Math.sin(rotTime) * level * 30 // -30 bis +30 Grad
      return { rotationAngle }
    }

    case 'elastic': {
      // Elastic: Gummiartige Verformung (asymmetrisches Stretch auf X/Y)
      const elasticTime = Date.now() * 0.004
      const stretchX = 1.0 + Math.sin(elasticTime) * level * 0.3 // 0.7 - 1.3
      const stretchY = 1.0 + Math.sin(elasticTime + 1.5) * level * 0.2 // 0.8 - 1.2 (gegenläufig)
      return { stretchX, stretchY }
    }

    case 'beatPulse':
      // Rhythmus: Beat-synchroner Puls (Scale + Glow), geteilte Hüllkurve mit
      // den Bild-Effekten – schlägt auf jedem erkannten Beat an und klingt aus.
      return calculateBeatPulse(level)

    default:
      // Alle übrigen Effekte (Farbfilter, Bewegungspfade, Rhythmus, Frequenz-
      // Split …) kommen aus der gemeinsamen Engine der Canvas-Bilder.
      return calculateEffectValue(effectName, level)
  }
}

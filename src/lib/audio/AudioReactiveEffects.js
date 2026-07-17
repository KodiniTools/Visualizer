/**
 * AudioReactiveEffects - Calculate visual effect values from audio levels
 * Contains all 24 audio-reactive effect calculations
 *
 * @module audio/AudioReactiveEffects
 */

/**
 * List of all available effect names
 */
export const EFFECT_NAMES = [
  // Filter effects
  'hue',
  'brightness',
  'saturation',
  'contrast',
  'grayscale',
  'sepia',
  'invert',
  'blur',
  // Transform effects
  'scale',
  'rotation',
  'skew',
  'perspective',
  'freqSplit',
  // Visual effects
  'glow',
  'border',
  'strobe',
  'chromatic',
  'vignettePulse',
  // Motion effects
  'shake',
  'bounce',
  'swing',
  'orbit',
  'figure8',
  'wave',
  'spiral',
  'float',
  // Rhythm effects
  'beatPulse',
  'zoomPunch',
  'bpmPulse',
]

/**
 * Effect category groupings
 */
export const EFFECT_CATEGORIES = {
  filter: ['hue', 'brightness', 'saturation', 'contrast', 'grayscale', 'sepia', 'invert', 'blur'],
  transform: ['scale', 'rotation', 'skew', 'perspective', 'freqSplit'],
  visual: ['glow', 'border', 'strobe', 'chromatic', 'vignettePulse'],
  motion: ['shake', 'bounce', 'swing', 'orbit', 'figure8', 'wave', 'spiral', 'float'],
  rhythm: ['beatPulse', 'zoomPunch', 'bpmPulse'],
}

// ═══════════════════════════════════════════════════════════════════════════
// RHYTHM / BEAT-PULSE ENVELOPE (module scope)
//
// The beat signal (window.audioAnalysisData.isBeat / beatIntensity) is GLOBAL,
// so a single shared envelope is correct: every image pulses on the same beat.
// The envelope snaps up on a detected beat (fast attack) and decays smoothly,
// which visualises the RHYTHM (the beat grid) instead of continuous loudness.
// ═══════════════════════════════════════════════════════════════════════════
let _beatPulseEnv = 0
let _beatPulseLastTime = 0
const BEAT_PULSE_DECAY_TAU = 180 // ms — smaller = snappier decay

/**
 * Advances and returns the shared beat-pulse envelope (0-1).
 * @param {object|null} beat - Global audio data with { isBeat, beatIntensity }
 * @param {number} time - Current timestamp in ms
 * @returns {number} Envelope value clamped to 0-1
 */
function updateBeatPulseEnvelope(beat, time) {
  // Time-guarded decay so multiple images in the same frame don't over-decay:
  // only the first call of a new frame advances the decay.
  const dt = _beatPulseLastTime === 0 ? 0 : Math.max(0, time - _beatPulseLastTime)
  if (dt > 0) {
    _beatPulseEnv *= Math.exp(-dt / BEAT_PULSE_DECAY_TAU)
    _beatPulseLastTime = time
  } else if (_beatPulseLastTime === 0) {
    _beatPulseLastTime = time
  }
  // Trigger on a fresh beat. Using max() keeps this idempotent when several
  // images with beatPulse enabled are drawn within the same beat frame.
  if (beat && beat.isBeat) {
    const strength = beat.beatIntensity > 0 ? beat.beatIntensity : 1
    _beatPulseEnv = Math.max(_beatPulseEnv, strength)
  }
  return Math.max(0, Math.min(1, _beatPulseEnv))
}

// ═══════════════════════════════════════════════════════════════════════════
// BPM-LOCKED PHASE (module scope)
//
// A predictive phase that advances off the detected BPM so a pulse keeps
// running on the beat grid even during quiet passages, and re-syncs to the
// downbeat on every detected beat. Shared so all images pulse together.
// ═══════════════════════════════════════════════════════════════════════════
let _bpmPhase = 0
let _bpmLastTime = 0

/**
 * Advances and returns a BPM-locked pulse envelope (0-1) that peaks on each
 * beat of the grid.
 * @param {object|null} beat - Global audio data with { bpm, isBeat }
 * @param {number} time - Current timestamp in ms
 * @returns {number} Envelope value (0-1)
 */
function updateBpmPhase(beat, time) {
  const dt = _bpmLastTime === 0 ? 0 : Math.max(0, time - _bpmLastTime)
  _bpmLastTime = time
  const bpm = beat && beat.bpm > 0 ? beat.bpm : 120
  const beatMs = 60000 / Math.max(30, Math.min(300, bpm))
  if (dt > 0) _bpmPhase += dt / beatMs
  // Re-sync to the downbeat on a real detected beat so we stay locked.
  if (beat && beat.isBeat) _bpmPhase = 0
  _bpmPhase -= Math.floor(_bpmPhase)
  const raised = Math.cos(_bpmPhase * Math.PI * 2) * 0.5 + 0.5
  return raised * raised
}

/**
 * Resets the beat-pulse envelope state (e.g. when audio stops).
 */
export function resetBeatPulseEnvelope() {
  _beatPulseEnv = 0
  _beatPulseLastTime = 0
  _bpmPhase = 0
  _bpmLastTime = 0
}

/**
 * Computes the beat-pulse effect output (scale + glow) from the shared beat
 * envelope. Exported so images AND text render through the exact same pulse,
 * keeping a single source of truth for the rhythm effect.
 * @param {number} level - Normalized effect level (0-1), scales the amplitude
 * @param {number} time - Current timestamp in ms
 * @returns {{ scale: number, glowBlur: number, glowColor: string }}
 */
export function calculateBeatPulse(level, time = Date.now()) {
  const beat = (typeof window !== 'undefined' && window.audioAnalysisData) || null
  const env = updateBeatPulseEnvelope(beat, time)
  const amp = env * (0.35 + 0.65 * Math.max(0, Math.min(1, level)))
  return {
    scale: 1.0 + amp * 0.45, // up to +45% on a strong beat
    glowBlur: amp * 40,
    glowColor: `rgba(139, 92, 246, ${0.35 + amp * 0.55})`,
  }
}

/**
 * Calculates effect value for a given effect name and normalized level
 * @param {string} effectName - Name of the effect
 * @param {number} normalizedLevel - Audio level normalized to 0-1 range
 * @param {number} time - Current timestamp in ms (for animated effects)
 * @returns {object} Effect parameters
 */
export function calculateEffectValue(effectName, normalizedLevel, time = Date.now()) {
  const level = Math.max(0, Math.min(1, normalizedLevel))

  switch (effectName) {
    // ═══════════════════════════════════════════════════════════════
    // FILTER EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'hue':
      // Hue rotation: 0-720 degrees (2x cycle for stronger effect)
      return { hueRotate: level * 720 }

    case 'brightness':
      // Brightness: 60-180% based on audio level
      return { brightness: 60 + level * 120 }

    case 'saturation':
      // Saturation: 30-250% based on audio level
      return { saturation: 30 + level * 220 }

    case 'contrast':
      // Contrast pulsing: 80-200% based on audio level
      return { contrast: 80 + level * 120 }

    case 'grayscale':
      // Black-white blend: 0-100% based on audio level
      return { grayscale: level * 100 }

    case 'sepia':
      // Vintage/Sepia look: 0-100% based on audio level
      return { sepia: level * 100 }

    case 'invert':
      // Color inversion: quadratic curve for dramatic effect at peaks
      const invertLevel = Math.pow(level, 1.5) * 100
      return { invert: invertLevel }

    case 'blur':
      // Dynamic blur: 0-10px based on audio level
      return { blur: level * 10 }

    // ═══════════════════════════════════════════════════════════════
    // TRANSFORM EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'scale':
      // Pulsing/scaling: 1.0-1.5x based on audio level
      return { scale: 1.0 + level * 0.5 }

    case 'rotation': {
      // Light rotation: -15 to +15 degrees (oscillating)
      const timeRot = time * 0.005
      const oscillation = Math.sin(timeRot) * level
      return { rotation: oscillation * 15 }
    }

    case 'skew': {
      // Shear/distortion: oscillating skew in X and Y
      const timeSkew = time * 0.004
      const skewAmount = level * 15 // Max ±15 degrees
      const skewX = Math.sin(timeSkew) * skewAmount
      const skewY = Math.cos(timeSkew * 0.7) * skewAmount * 0.5
      return { skewX, skewY }
    }

    case 'perspective': {
      // 3D tilt effect: oscillating perspective rotation
      const timePerspective = time * 0.002
      const perspectiveAmount = level * 25 // Max ±25 degrees
      const rotateX = Math.sin(timePerspective) * perspectiveAmount
      const rotateY = Math.cos(timePerspective * 0.8) * perspectiveAmount * 0.7
      return { perspectiveRotateX: rotateX, perspectiveRotateY: rotateY }
    }

    case 'freqSplit': {
      // Frequency-split: two bands drive two properties at once — bass grows the
      // image (zoom), treble shifts its hue and adds an edge glow. Reads the raw
      // bands directly; `level` acts as the intensity scaler (see getAudioReactiveValues).
      const data = (typeof window !== 'undefined' && window.audioAnalysisData) || null
      const bass = data ? (data.smoothBass ?? 0) / 255 : 0
      const treble = data ? (data.smoothTreble ?? 0) / 255 : 0
      return {
        scale: 1.0 + bass * level * 0.35,
        hueRotate: treble * level * 180,
        glowBlur: treble * level * 30,
        glowColor: `rgba(99, 179, 237, ${0.3 + treble * 0.5})`,
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // VISUAL EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'glow':
      // Glow/shadow: 0-50px based on audio level
      return {
        glowBlur: level * 50,
        glowColor: `rgba(139, 92, 246, ${0.5 + level * 0.5})`,
      }

    case 'border':
      // Audio-reactive border: width and color pulse
      return {
        borderWidth: level * 20, // 0-20px
        borderOpacity: 0.5 + level * 0.5, // 50-100%
        borderGlow: level * 30, // Glow around border
      }

    case 'strobe':
      // Flash effect: quick flash at peaks (>60% audio)
      if (level > 0.6) {
        const strobeFlash = 0.8 + Math.random() * 0.2
        return { strobeOpacity: strobeFlash, strobeBrightness: 150 + level * 100 }
      } else if (level > 0.3) {
        return { strobeOpacity: 0.7 + level * 0.3, strobeBrightness: 100 }
      }
      return { strobeOpacity: 1, strobeBrightness: 100 }

    case 'chromatic':
      // Chromatic aberration (RGB shift / glitch)
      const chromaticOffset = level * 8 // Max 8px shift
      return {
        chromaticOffset,
        chromaticR: { x: chromaticOffset, y: 0 },
        chromaticG: { x: 0, y: 0 },
        chromaticB: { x: -chromaticOffset, y: 0 },
      }

    case 'vignettePulse': {
      // Per-image edge darkening that snaps on each detected beat and eases out,
      // using the shared beat envelope (in sync with beatPulse).
      const beat = (typeof window !== 'undefined' && window.audioAnalysisData) || null
      const env = updateBeatPulseEnvelope(beat, time)
      const strength = env * (0.4 + 0.6 * level)
      return { vignetteStrength: Math.max(0, Math.min(0.9, strength)) }
    }

    // ═══════════════════════════════════════════════════════════════
    // MOTION EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'shake':
      // Shake: random X/Y offset at high audio levels
      if (level > 0.2) {
        const shakeIntensity = level * 15 // Max 15px
        const shakeX = (Math.random() - 0.5) * 2 * shakeIntensity
        const shakeY = (Math.random() - 0.5) * 2 * shakeIntensity
        return { shakeX, shakeY }
      }
      return { shakeX: 0, shakeY: 0 }

    case 'bounce': {
      // Vertical bounce: sine wave + audio level
      const timeBounce = time * 0.008
      const bounceAmount = Math.abs(Math.sin(timeBounce)) * level * 30
      return { bounceY: -bounceAmount } // Negative = up
    }

    case 'swing': {
      // Horizontal pendulum: sine wave for smooth side-to-side
      const timeSwing = time * 0.004
      const swingAmount = Math.sin(timeSwing) * level * 40 // Max ±40px
      return { swingX: swingAmount }
    }

    case 'orbit': {
      // Circular motion: X and Y follow a circle
      const timeOrbit = time * 0.003
      const orbitRadius = level * 25 // Max 25px radius
      const orbitX = Math.cos(timeOrbit) * orbitRadius
      const orbitY = Math.sin(timeOrbit) * orbitRadius
      return { orbitX, orbitY }
    }

    case 'figure8': {
      // Figure-8 (Lemniscate): elegant lying 8 motion
      const timeFigure8 = time * 0.002
      const figure8Scale = level * 30 // Max 30px amplitude
      const figure8X = Math.cos(timeFigure8) * figure8Scale
      const figure8Y = Math.sin(timeFigure8 * 2) * figure8Scale * 0.5
      return { figure8X, figure8Y }
    }

    case 'wave': {
      // Sine wave motion: horizontal drift with vertical wave
      const timeWave = time * 0.003
      const waveAmplitude = level * 20 // Max 20px amplitude
      const waveX = Math.sin(timeWave * 0.5) * waveAmplitude * 1.5
      const waveY = Math.sin(timeWave * 2) * waveAmplitude
      return { waveX, waveY }
    }

    case 'spiral': {
      // Spiral outward: growing radius with rotation
      const timeSpiral = time * 0.002
      const spiralMaxRadius = level * 35 // Max 35px radius
      const spiralPhase = (timeSpiral % (Math.PI * 2)) / (Math.PI * 2)
      const spiralRadius = spiralMaxRadius * (0.3 + spiralPhase * 0.7)
      const spiralX = Math.cos(timeSpiral * 3) * spiralRadius
      const spiralY = Math.sin(timeSpiral * 3) * spiralRadius
      return { spiralX, spiralY }
    }

    case 'float': {
      // Random float: gentle, organic movement
      const timeFloat = time * 0.001
      const floatAmplitude = level * 15 // Max 15px amplitude
      const floatX = (Math.sin(timeFloat * 1.3) + Math.sin(timeFloat * 2.7) * 0.5) * floatAmplitude
      const floatY = (Math.cos(timeFloat * 1.7) + Math.cos(timeFloat * 3.1) * 0.5) * floatAmplitude
      return { floatX, floatY }
    }

    // ═══════════════════════════════════════════════════════════════
    // RHYTHM EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'beatPulse':
      // Beat-synced pulse: snaps up on each detected beat and eases out.
      // Timing comes from the global beat envelope (the rhythm), while the
      // effect's own level scales the amplitude so the intensity slider and
      // chosen source still matter. Shared with the text renderer.
      return calculateBeatPulse(level, time)

    case 'zoomPunch': {
      // Snappy zoom punch: harder, glow-free scale kick on each detected beat
      // (shares the beat envelope with beatPulse, but zooms more aggressively).
      const beat = (typeof window !== 'undefined' && window.audioAnalysisData) || null
      const env = updateBeatPulseEnvelope(beat, time)
      const amp = env * (0.4 + 0.6 * Math.max(0, Math.min(1, level)))
      return { scale: 1.0 + amp * 0.5 }
    }

    case 'bpmPulse': {
      // BPM-locked pulse: scale + glow driven by a predictive BPM phase, so it
      // keeps pulsing on the beat grid even in quiet passages.
      const beat = (typeof window !== 'undefined' && window.audioAnalysisData) || null
      const env = updateBpmPhase(beat, time)
      const amp = env * (0.35 + 0.65 * Math.max(0, Math.min(1, level)))
      return {
        scale: 1.0 + amp * 0.3,
        glowBlur: amp * 30,
        glowColor: `rgba(139, 92, 246, ${0.3 + amp * 0.5})`,
      }
    }

    default:
      return {}
  }
}

/**
 * Gets the translation offset from motion effects
 * @param {object} effects - Calculated effect values
 * @returns {object} Combined translation { x, y }
 */
export function getMotionOffset(effects) {
  let x = 0
  let y = 0

  // Shake
  if (effects.shakeX !== undefined) x += effects.shakeX
  if (effects.shakeY !== undefined) y += effects.shakeY

  // Bounce (only Y)
  if (effects.bounceY !== undefined) y += effects.bounceY

  // Swing (only X)
  if (effects.swingX !== undefined) x += effects.swingX

  // Orbit
  if (effects.orbitX !== undefined) x += effects.orbitX
  if (effects.orbitY !== undefined) y += effects.orbitY

  // Figure-8
  if (effects.figure8X !== undefined) x += effects.figure8X
  if (effects.figure8Y !== undefined) y += effects.figure8Y

  // Wave
  if (effects.waveX !== undefined) x += effects.waveX
  if (effects.waveY !== undefined) y += effects.waveY

  // Spiral
  if (effects.spiralX !== undefined) x += effects.spiralX
  if (effects.spiralY !== undefined) y += effects.spiralY

  // Float
  if (effects.floatX !== undefined) x += effects.floatX
  if (effects.floatY !== undefined) y += effects.floatY

  return { x, y }
}

/**
 * Gets CSS filter string from filter effects
 * @param {object} effects - Calculated effect values
 * @returns {string} CSS filter string
 */
export function getFilterString(effects) {
  const filters = []

  if (effects.hueRotate !== undefined) {
    filters.push(`hue-rotate(${effects.hueRotate}deg)`)
  }
  if (effects.brightness !== undefined) {
    filters.push(`brightness(${effects.brightness}%)`)
  }
  if (effects.saturation !== undefined) {
    filters.push(`saturate(${effects.saturation}%)`)
  }
  if (effects.contrast !== undefined) {
    filters.push(`contrast(${effects.contrast}%)`)
  }
  if (effects.grayscale !== undefined && effects.grayscale > 0) {
    filters.push(`grayscale(${effects.grayscale}%)`)
  }
  if (effects.sepia !== undefined && effects.sepia > 0) {
    filters.push(`sepia(${effects.sepia}%)`)
  }
  if (effects.invert !== undefined && effects.invert > 0) {
    filters.push(`invert(${effects.invert}%)`)
  }
  if (effects.blur !== undefined && effects.blur > 0) {
    filters.push(`blur(${effects.blur}px)`)
  }

  return filters.length > 0 ? filters.join(' ') : ''
}

/**
 * AudioReactiveEffects class
 * Manages effect calculation with state
 */
export class AudioReactiveEffects {
  /**
   * Creates a new AudioReactiveEffects instance
   */
  constructor() {
    this.lastCalculatedEffects = {}
  }

  /**
   * Calculates all enabled effects
   * @param {object} effectsConfig - Effect configuration { effectName: { enabled, intensity, source } }
   * @param {number} normalizedLevel - Base normalized audio level (0-1)
   * @param {number} time - Current timestamp
   * @returns {object} Calculated effect values
   */
  calculateAll(effectsConfig, normalizedLevel, time = Date.now()) {
    const result = {}

    for (const [effectName, config] of Object.entries(effectsConfig)) {
      if (config && config.enabled) {
        const intensity = (config.intensity || 80) / 100
        const effectLevel = normalizedLevel * intensity
        const effectValues = calculateEffectValue(effectName, effectLevel, time)
        Object.assign(result, effectValues)
      }
    }

    this.lastCalculatedEffects = result
    return result
  }

  /**
   * Gets the last calculated effects
   * @returns {object} Last calculated effect values
   */
  getLastEffects() {
    return { ...this.lastCalculatedEffects }
  }

  /**
   * Checks if effect is a motion effect
   * @param {string} effectName - Effect name
   * @returns {boolean} True if motion effect
   */
  isMotionEffect(effectName) {
    return EFFECT_CATEGORIES.motion.includes(effectName)
  }

  /**
   * Checks if effect is a filter effect
   * @param {string} effectName - Effect name
   * @returns {boolean} True if filter effect
   */
  isFilterEffect(effectName) {
    return EFFECT_CATEGORIES.filter.includes(effectName)
  }
}

export default {
  EFFECT_NAMES,
  EFFECT_CATEGORIES,
  calculateEffectValue,
  getMotionOffset,
  getFilterString,
  resetBeatPulseEnvelope,
  AudioReactiveEffects,
}

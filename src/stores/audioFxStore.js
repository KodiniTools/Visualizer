import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAudioFxStore = defineStore('audioFx', () => {
  const enabled = ref(false)

  // Brightness — canvas filter brightness()
  const brightnessEnabled = ref(true)
  const brightnessSource = ref('volume')
  const brightnessMin = ref(80) // % at silence
  const brightnessMax = ref(130) // % at peak

  // Hue Rotate — canvas filter hue-rotate()
  const hueEnabled = ref(false)
  const hueSource = ref('treble')
  const hueRange = ref(60) // max degrees rotation

  // Saturation — canvas filter saturate()
  const saturationEnabled = ref(false)
  const saturationSource = ref('mid')
  const saturationMin = ref(80) // % at silence
  const saturationMax = ref(200) // % at peak

  // Contrast — canvas filter contrast()
  const contrastEnabled = ref(false)
  const contrastSource = ref('bass')
  const contrastMin = ref(90) // % at silence
  const contrastMax = ref(130) // % at peak

  // Pulse (scale) — ctx.scale around centre
  const pulseEnabled = ref(false)
  const pulseSource = ref('bass')
  const pulseStrength = ref(40) // 0–100, maps to 0–0.08 scale delta

  // Glow — blur + screen blend overlay
  const glowEnabled = ref(false)
  const glowSource = ref('bass')
  const glowColor = ref('#6ea8fe')
  const glowIntensity = ref(50) // 0–100

  // Color Tint — semi-transparent fill overlay
  const tintEnabled = ref(false)
  const tintSource = ref('mid')
  const tintColor = ref('#ff6600')
  const tintIntensity = ref(40) // 0–100

  // Vignette — permanent edge darkening, audio-reactive strength
  const vignetteEnabled = ref(false)
  const vignetteSource = ref('volume')
  const vignetteIntensity = ref(50) // 0–100

  // ── Rhythm / beat-synced camera effects ──────────────────────────────────

  // Zoom-Punch — snappy scale punch that snaps on each detected beat and eases
  // out (distinct from the continuous, loudness-driven "Pulse" above).
  const zoomPunchEnabled = ref(false)
  const zoomPunchStrength = ref(50) // 0–100 → up to ~0.18 scale delta on a strong beat

  // Vignette-Puls — edge darkening that snaps on each beat and eases out.
  const vignettePulseEnabled = ref(false)
  const vignettePulseIntensity = ref(60) // 0–100

  // BPM-Lock-Puls — whole-frame scale pulse locked to the detected BPM. Keeps
  // pulsing on the beat grid even during quiet passages (predictive phase that
  // re-syncs on every detected beat).
  const bpmPulseEnabled = ref(false)
  const bpmPulseStrength = ref(45) // 0–100

  // Frequenz-Split — two bands at once: bass drives a subtle zoom, treble drives
  // a hue shift + edge glow. Showcases the frequency spectrum in a single effect.
  const freqSplitEnabled = ref(false)
  const freqSplitStrength = ref(60) // 0–100

  return {
    enabled,
    brightnessEnabled,
    brightnessSource,
    brightnessMin,
    brightnessMax,
    hueEnabled,
    hueSource,
    hueRange,
    saturationEnabled,
    saturationSource,
    saturationMin,
    saturationMax,
    contrastEnabled,
    contrastSource,
    contrastMin,
    contrastMax,
    pulseEnabled,
    pulseSource,
    pulseStrength,
    glowEnabled,
    glowSource,
    glowColor,
    glowIntensity,
    tintEnabled,
    tintSource,
    tintColor,
    tintIntensity,
    vignetteEnabled,
    vignetteSource,
    vignetteIntensity,
    zoomPunchEnabled,
    zoomPunchStrength,
    vignettePulseEnabled,
    vignettePulseIntensity,
    bpmPulseEnabled,
    bpmPulseStrength,
    freqSplitEnabled,
    freqSplitStrength,
  }
})

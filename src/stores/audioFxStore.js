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
  }
})

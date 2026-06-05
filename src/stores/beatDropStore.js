import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBeatDropStore = defineStore('beatDrop', () => {
  const enabled = ref(false)
  const source = ref('bass') // bass | mid | treble | volume | dynamic

  // Flash
  const flashEnabled = ref(true)
  const flashColor = ref('#ffffff')
  const flashIntensity = ref(70) // 0–100
  const flashDecay = ref(60) // 0–100

  // Color Burst
  const colorBurstEnabled = ref(false)
  const colorBurstColor = ref('#ff4400')
  const colorBurstIntensity = ref(60) // 0–100

  // Strobe
  const strobeEnabled = ref(false)
  const strobeRate = ref(8) // Hz
  const strobeIntensity = ref(80) // 0–100

  // Vignette Pulse
  const vignettePulseEnabled = ref(false)
  const vignettePulseColor = ref('#ff0044')
  const vignettePulseIntensity = ref(70) // 0–100

  return {
    enabled,
    source,
    flashEnabled,
    flashColor,
    flashIntensity,
    flashDecay,
    colorBurstEnabled,
    colorBurstColor,
    colorBurstIntensity,
    strobeEnabled,
    strobeRate,
    strobeIntensity,
    vignettePulseEnabled,
    vignettePulseColor,
    vignettePulseIntensity,
  }
})

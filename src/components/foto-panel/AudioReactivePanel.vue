<template>
  <div class="audio-reactive-section">
    <AudioReactiveMaster />
    <AudioReactivePresets v-if="isEnabled" />
    <AudioReactiveEffects v-if="isEnabled" />
    <AudioReactiveActions v-if="isEnabled" />
  </div>
</template>

<script setup>
import { ref, computed, toRef, provide } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import AudioReactiveMaster from './audio-reactive/AudioReactiveMaster.vue'
import AudioReactivePresets from './audio-reactive/AudioReactivePresets.vue'
import AudioReactiveEffects from './audio-reactive/AudioReactiveEffects.vue'
import AudioReactiveActions from './audio-reactive/AudioReactiveActions.vue'

const { t } = useI18n()

const props = defineProps({
  hasActiveImage: {
    type: Boolean,
    default: false,
  },
  hasSavedSettings: {
    type: Boolean,
    default: false,
  },
  activeAudioPreset: {
    type: String,
    default: null,
  },
})

const emit = defineEmits([
  'audio-reactive-toggle',
  'source-change',
  'smoothing-change',
  'easing-change',
  'beat-boost-change',
  'phase-change',
  'gain-change',
  'toggle-preset',
  'effect-toggle',
  'effect-intensity-change',
  'effect-source-change',
  'save-settings',
  'apply-settings',
])

// Refs
const audioReactiveEnabledRef = ref(null)
const audioLevelBarRef = ref(null)
const audioReactiveSourceRef = ref(null)
const audioReactiveSmoothingRef = ref(null)
const audioReactiveSmoothingValueRef = ref(null)
const audioReactiveEasingRef = ref(null)
const audioReactiveBeatBoostRef = ref(null)
const audioReactiveBeatBoostValueRef = ref(null)
const audioReactivePhaseRef = ref(null)
const audioReactivePhaseValueRef = ref(null)
const audioReactiveGainRef = ref(null)
const audioReactiveGainValueRef = ref(null)

const isEnabled = ref(false)

// Preset-Liste
const presetList = [
  { id: 'pulse', name: 'Pulse', icon: '💓' },
  { id: 'dance', name: 'Dance', icon: '💃' },
  { id: 'shake', name: 'Shake', icon: '🎸' },
  { id: 'glow', name: 'Glow', icon: '✨' },
  { id: 'strobe', name: 'Strobe', icon: '⚡' },
  { id: 'glitch', name: 'Glitch', icon: '🔥' },
]

// Effekt-Kategorien (mit i18n)
const colorEffects = computed(() => [
  { id: 'hue', name: t('foto.effectNames.hue') },
  { id: 'brightness', name: t('foto.effectNames.brightness') },
  { id: 'saturation', name: t('foto.effectNames.saturation') },
  { id: 'contrast', name: t('foto.effectNames.contrast') },
  { id: 'grayscale', name: t('foto.effectNames.grayscale') },
  { id: 'sepia', name: t('foto.effectNames.sepia') },
  { id: 'invert', name: t('foto.effectNames.invert') },
])

const transformEffects = computed(() => [
  { id: 'scale', name: t('foto.effectNames.scale') },
  { id: 'rotation', name: t('foto.effectNames.rotation') },
  { id: 'skew', name: t('foto.effectNames.skew') },
  { id: 'perspective', name: t('foto.effectNames.perspective') },
])

const movementEffects = computed(() => [
  { id: 'shake', name: t('foto.effectNames.shake') },
  { id: 'bounce', name: t('foto.effectNames.bounce') },
  { id: 'swing', name: t('foto.effectNames.swing') },
  { id: 'orbit', name: t('foto.effectNames.orbit') },
  { id: 'figure8', name: t('foto.effectNames.figure8') },
  { id: 'wave', name: t('foto.effectNames.wave') },
  { id: 'spiral', name: t('foto.effectNames.spiral') },
  { id: 'float', name: t('foto.effectNames.float') },
])

const specialEffects = computed(() => [
  { id: 'glow', name: t('foto.effectNames.glow') },
  { id: 'border', name: t('foto.effectNames.border') },
  { id: 'blur', name: t('foto.effectNames.blur') },
  { id: 'strobe', name: t('foto.effectNames.strobe') },
  { id: 'chromatic', name: t('foto.effectNames.chromatic') },
])

// Handlers
function onAudioReactiveToggle(event) {
  isEnabled.value = event.target.checked
  emit('audio-reactive-toggle', event)
}

function onAudioReactiveSourceChange(event) {
  emit('source-change', event)
}

function onAudioReactiveSmoothingChange(event) {
  const value = parseInt(event.target.value)
  if (audioReactiveSmoothingValueRef.value) {
    audioReactiveSmoothingValueRef.value.textContent = value + '%'
  }
  emit('smoothing-change', event)
}

function onAudioReactiveEasingChange(event) {
  emit('easing-change', event)
}

function onAudioReactiveBeatBoostChange(event) {
  const value = parseFloat(event.target.value)
  const displayValue = value <= 1.0 ? t('foto.beatBoostOff') : `${Math.round((value - 1) * 100)}%`
  if (audioReactiveBeatBoostValueRef.value) {
    audioReactiveBeatBoostValueRef.value.textContent = displayValue
  }
  emit('beat-boost-change', event)
}

function onAudioReactivePhaseChange(event) {
  const value = parseInt(event.target.value)
  if (audioReactivePhaseValueRef.value) {
    audioReactivePhaseValueRef.value.textContent = value + '°'
  }
  emit('phase-change', event)
}

function onAudioReactiveGainChange(event) {
  const value = parseFloat(event.target.value)
  if (audioReactiveGainValueRef.value) {
    audioReactiveGainValueRef.value.textContent = Math.round(value * 100) + '%'
  }
  emit('gain-change', event)
}

/**
 * Lädt Audio-Reaktiv Einstellungen in die UI
 */
function loadSettings(imageData) {
  if (!imageData) {
    // Reset to defaults
    isEnabled.value = false
    if (audioReactiveEnabledRef.value) {
      audioReactiveEnabledRef.value.checked = false
    }
    return
  }

  const audioReactive = imageData.fotoSettings?.audioReactive || {}

  // Master-Einstellungen
  const enabled = audioReactive.enabled || false
  isEnabled.value = enabled
  if (audioReactiveEnabledRef.value) {
    audioReactiveEnabledRef.value.checked = enabled
  }

  if (audioReactiveSourceRef.value) {
    audioReactiveSourceRef.value.value = audioReactive.source || 'bass'
  }

  if (audioReactiveSmoothingRef.value) {
    const smoothing = audioReactive.smoothing ?? 50
    audioReactiveSmoothingRef.value.value = smoothing
    if (audioReactiveSmoothingValueRef.value) {
      audioReactiveSmoothingValueRef.value.textContent = smoothing + '%'
    }
  }

  if (audioReactiveEasingRef.value) {
    audioReactiveEasingRef.value.value = audioReactive.easing || 'linear'
  }

  if (audioReactiveBeatBoostRef.value) {
    const beatBoost = audioReactive.beatBoost ?? 1.0
    audioReactiveBeatBoostRef.value.value = beatBoost
    if (audioReactiveBeatBoostValueRef.value) {
      const displayValue =
        beatBoost <= 1.0 ? t('foto.beatBoostOff') : `${Math.round((beatBoost - 1) * 100)}%`
      audioReactiveBeatBoostValueRef.value.textContent = displayValue
    }
  }

  if (audioReactivePhaseRef.value) {
    const phase = audioReactive.phase ?? 0
    audioReactivePhaseRef.value.value = phase
    if (audioReactivePhaseValueRef.value) {
      audioReactivePhaseValueRef.value.textContent = phase + '°'
    }
  }

  if (audioReactiveGainRef.value) {
    const gain = audioReactive.gain ?? 1.0
    audioReactiveGainRef.value.value = gain
    if (audioReactiveGainValueRef.value) {
      audioReactiveGainValueRef.value.textContent = Math.round(gain * 100) + '%'
    }
  }

  // Effekte laden (alle Effekt-Checkboxen und Slider)
  const effects = audioReactive.effects || {}
  const allEffectIds = [
    'hue',
    'brightness',
    'saturation',
    'contrast',
    'grayscale',
    'sepia',
    'invert',
    'scale',
    'rotation',
    'skew',
    'perspective',
    'shake',
    'bounce',
    'swing',
    'orbit',
    'figure8',
    'wave',
    'spiral',
    'float',
    'glow',
    'border',
    'blur',
    'strobe',
    'chromatic',
  ]

  // DOM-Elemente für Effekte suchen und aktualisieren (über data-effect-id)
  setTimeout(() => {
    allEffectIds.forEach((effectId) => {
      const effectData = effects[effectId]
      const enabled = effectData?.enabled || false
      const intensity = effectData?.intensity ?? 80
      const source = effectData?.source || ''

      // Finde die Effekt-Elemente im DOM über data-effect-id
      const effectItem = document.querySelector(`.effect-item[data-effect-id="${effectId}"]`)
      if (effectItem) {
        const checkbox = effectItem.querySelector('.effect-checkbox')
        const slider = effectItem.querySelector('.effect-slider')
        const valueSpan = effectItem.querySelector('.effect-value')
        const sourceSelect = effectItem.querySelector('.effect-source-select')

        if (checkbox) checkbox.checked = enabled
        if (slider) slider.value = intensity
        if (valueSpan) valueSpan.textContent = intensity + '%'
        if (sourceSelect) sourceSelect.value = source
      }
    })
  }, 0)

  console.log('🔊 Audio-Reaktiv Einstellungen geladen:', audioReactive)
}

// The sub-sections consume state, refs and handlers through provide/inject.
provide('audioReactiveControls', {
  hasActiveImage: toRef(props, 'hasActiveImage'),
  hasSavedSettings: toRef(props, 'hasSavedSettings'),
  activeAudioPreset: toRef(props, 'activeAudioPreset'),
  isEnabled,
  audioReactiveEnabledRef,
  audioLevelBarRef,
  audioReactiveSourceRef,
  audioReactiveSmoothingRef,
  audioReactiveSmoothingValueRef,
  audioReactiveEasingRef,
  audioReactiveBeatBoostRef,
  audioReactiveBeatBoostValueRef,
  audioReactivePhaseRef,
  audioReactivePhaseValueRef,
  audioReactiveGainRef,
  audioReactiveGainValueRef,
  presetList,
  colorEffects,
  transformEffects,
  movementEffects,
  specialEffects,
  onAudioReactiveToggle,
  onAudioReactiveSourceChange,
  onAudioReactiveSmoothingChange,
  onAudioReactiveEasingChange,
  onAudioReactiveBeatBoostChange,
  onAudioReactivePhaseChange,
  onAudioReactiveGainChange,
  togglePreset: (id) => emit('toggle-preset', id),
  effectToggle: (id, checked) => emit('effect-toggle', id, checked),
  effectSourceChange: (id, value) => emit('effect-source-change', id, value),
  effectIntensityChange: (id, value) => emit('effect-intensity-change', id, value),
  saveSettings: () => emit('save-settings'),
  applySettings: () => emit('apply-settings'),
})

// Expose refs and methods (unchanged public API; loadSettings is consumed by
// ImageAudioReactivePanel).
defineExpose({
  audioReactiveEnabledRef,
  audioLevelBarRef,
  audioReactiveSourceRef,
  audioReactiveSmoothingRef,
  audioReactiveSmoothingValueRef,
  audioReactiveEasingRef,
  audioReactiveBeatBoostRef,
  audioReactiveBeatBoostValueRef,
  audioReactivePhaseRef,
  audioReactivePhaseValueRef,
  isEnabled,
  loadSettings,
})
</script>

<style scoped>
.audio-reactive-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>

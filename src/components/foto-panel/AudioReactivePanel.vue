<template>
  <div class="audio-reactive-section">
    <AudioReactiveMaster />
    <AudioReactivePresets v-if="isEnabled" />
    <AudioReactiveEffects v-if="isEnabled" />
    <AudioReactiveActions v-if="isEnabled" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, toRef, provide } from 'vue'
import { EFFECT_NAMES } from '../../lib/audio/AudioReactiveEffects'
import {
  AUDIO_REACTIVE_PRESETS,
  AUDIO_REACTIVE_PRESET_LIST,
} from '../../lib/audio/audioReactiveConfig'
import { useI18n } from '../../lib/i18n'
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
  /**
   * Zusätzliche Effekt-Kategorien (z. B. Gradient-Effekte des Hintergrunds):
   * [{ title, effects: [{ id, name }], defaultIntensity }]
   */
  extraCategories: {
    type: Array,
    default: () => [],
  },
  /**
   * Nur diese Effekt-IDs anzeigen (null = alle). Kategorien ohne sichtbare
   * Effekte und Presets, deren Effekte alle ausgeblendet sind, entfallen.
   */
  allowedEffects: {
    type: Array,
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
  'clear-preset',
  'effect-toggle',
  'effect-intensity-change',
  'effect-source-change',
  'save-settings',
  'apply-settings',
])

// Einziger DOM-Zugriff: der Pegelbalken, den die Verwender pro Frame setzen.
const audioLevelBarRef = ref(null)

const isEnabled = ref(false)

const MASTER_DEFAULTS = {
  source: 'bass',
  smoothing: 50,
  gain: 1,
  easing: 'linear',
  beatBoost: 1,
  phase: 0,
}
/** Event je Master-Einstellung (Verwender hängen an diesen Namen). */
const MASTER_EVENTS = {
  source: 'source-change',
  smoothing: 'smoothing-change',
  gain: 'gain-change',
  easing: 'easing-change',
  beatBoost: 'beat-boost-change',
  phase: 'phase-change',
}
const master = reactive({ ...MASTER_DEFAULTS })

/** Zustand je Effekt-ID; fehlt ein Eintrag, gilt der Kategorie-Standard. */
const effectStates = reactive({})
function effectState(id, defaultIntensity = 80) {
  return effectStates[id] ?? { enabled: false, intensity: defaultIntensity, source: '' }
}
function patchEffect(id, defaultIntensity, patch) {
  effectStates[id] = { ...effectState(id, defaultIntensity), ...patch }
}

/**
 * Die Verwender lesen `event.target.value` bzw. `event.target.checked`
 * (früher echte DOM-Events). Dieses Format bleibt erhalten; Werte als String
 * wie vom nativen Input.
 */
const asEvent = (target) => ({ target })

function isAllowed(id) {
  return props.allowedEffects === null || props.allowedEffects.includes(id)
}
const filterAllowed = (list) => list.filter((e) => isAllowed(e.id))

// Preset-Liste (gemeinsam mit Hintergrund-/Kachel-Panel); Presets, deren
// Effekte hier alle ausgeblendet sind, werden nicht angeboten.
const presetList = computed(() =>
  AUDIO_REACTIVE_PRESET_LIST.filter((p) =>
    Object.keys(AUDIO_REACTIVE_PRESETS[p.id]?.effects || {}).some(isAllowed),
  ),
)

// Effekt-Kategorien (mit i18n)
const colorEffects = computed(() =>
  filterAllowed([
    { id: 'hue', name: t('foto.effectNames.hue') },
    { id: 'brightness', name: t('foto.effectNames.brightness') },
    { id: 'saturation', name: t('foto.effectNames.saturation') },
    { id: 'contrast', name: t('foto.effectNames.contrast') },
    { id: 'grayscale', name: t('foto.effectNames.grayscale') },
    { id: 'sepia', name: t('foto.effectNames.sepia') },
    { id: 'invert', name: t('foto.effectNames.invert') },
  ]),
)

const transformEffects = computed(() =>
  filterAllowed([
    { id: 'scale', name: t('foto.effectNames.scale') },
    { id: 'rotation', name: t('foto.effectNames.rotation') },
    { id: 'skew', name: t('foto.effectNames.skew') },
    { id: 'perspective', name: t('foto.effectNames.perspective') },
    { id: 'freqSplit', name: t('foto.effectNames.freqSplit') },
  ]),
)

const movementEffects = computed(() =>
  filterAllowed([
    { id: 'shake', name: t('foto.effectNames.shake') },
    { id: 'bounce', name: t('foto.effectNames.bounce') },
    { id: 'swing', name: t('foto.effectNames.swing') },
    { id: 'orbit', name: t('foto.effectNames.orbit') },
    { id: 'figure8', name: t('foto.effectNames.figure8') },
    { id: 'wave', name: t('foto.effectNames.wave') },
    { id: 'spiral', name: t('foto.effectNames.spiral') },
    { id: 'float', name: t('foto.effectNames.float') },
  ]),
)

const specialEffects = computed(() =>
  filterAllowed([
    { id: 'glow', name: t('foto.effectNames.glow') },
    { id: 'border', name: t('foto.effectNames.border') },
    { id: 'blur', name: t('foto.effectNames.blur') },
    { id: 'strobe', name: t('foto.effectNames.strobe') },
    { id: 'chromatic', name: t('foto.effectNames.chromatic') },
    { id: 'vignettePulse', name: t('foto.effectNames.vignettePulse') },
  ]),
)

const rhythmEffects = computed(() =>
  filterAllowed([
    { id: 'beatPulse', name: t('foto.effectNames.beatPulse') },
    { id: 'zoomPunch', name: t('foto.effectNames.zoomPunch') },
    { id: 'bpmPulse', name: t('foto.effectNames.bpmPulse') },
    { id: 'beatFlip', name: t('foto.effectNames.beatFlip') },
    { id: 'colorStrobe', name: t('foto.effectNames.colorStrobe') },
    { id: 'impulseShake', name: t('foto.effectNames.impulseShake') },
  ]),
)

// Handlers
function setEnabled(enabled) {
  isEnabled.value = enabled
  emit('audio-reactive-toggle', asEvent({ checked: enabled }))
}

function setMaster(prop, value) {
  master[prop] = value
  emit(MASTER_EVENTS[prop], asEvent({ value: String(value) }))
}

function effectToggle(id, enabled, defaultIntensity) {
  patchEffect(id, defaultIntensity, { enabled })
  emit('effect-toggle', id, enabled)
}
function effectSourceChange(id, source, defaultIntensity) {
  patchEffect(id, defaultIntensity, { source })
  emit('effect-source-change', id, source)
}
function effectIntensityChange(id, intensity, defaultIntensity) {
  patchEffect(id, defaultIntensity, { intensity })
  emit('effect-intensity-change', id, String(intensity))
}

/**
 * Lädt Audio-Reaktiv Einstellungen in die UI.
 *
 * Akzeptiert ein Bild (`{ fotoSettings: { audioReactive } }`), ein Objekt mit
 * `audioReactive` oder direkt eine Konfiguration (`{ enabled, effects, … }`).
 */
function loadSettings(imageData) {
  if (!imageData) {
    isEnabled.value = false
    Object.assign(master, MASTER_DEFAULTS)
    for (const id of Object.keys(effectStates)) delete effectStates[id]
    return
  }

  const audioReactive =
    imageData.fotoSettings?.audioReactive ||
    imageData.audioReactive ||
    (imageData.effects ? imageData : {})

  isEnabled.value = audioReactive.enabled || false
  Object.assign(master, {
    source: audioReactive.source || 'bass',
    smoothing: audioReactive.smoothing ?? 50,
    gain: audioReactive.gain ?? 1,
    easing: audioReactive.easing || 'linear',
    beatBoost: audioReactive.beatBoost ?? 1,
    phase: audioReactive.phase ?? 0,
  })

  // Alle Effekte setzen – inkl. Rhythmus-Effekte und zusätzlicher Kategorien
  // (z. B. Gradient-Effekte des Hintergrunds)
  const effects = audioReactive.effects || {}
  const allEffectIds = [
    ...EFFECT_NAMES,
    ...props.extraCategories.flatMap((cat) => (cat.effects || []).map((e) => e.id)),
  ]
  for (const id of allEffectIds) {
    const fx = effects[id]
    effectStates[id] = {
      enabled: fx?.enabled || false,
      intensity: fx?.intensity ?? 80,
      source: fx?.source || '',
    }
  }

  console.log('🔊 Audio-Reaktiv Einstellungen geladen:', audioReactive)
}

// The sub-sections consume state, refs and handlers through provide/inject.
provide('audioReactiveControls', {
  hasActiveImage: toRef(props, 'hasActiveImage'),
  hasSavedSettings: toRef(props, 'hasSavedSettings'),
  activeAudioPreset: toRef(props, 'activeAudioPreset'),
  isEnabled,
  master,
  audioLevelBarRef,
  presetList,
  colorEffects,
  transformEffects,
  movementEffects,
  specialEffects,
  rhythmEffects,
  extraCategories: toRef(props, 'extraCategories'),
  setEnabled,
  setMaster,
  effectState,
  togglePreset: (id) => emit('toggle-preset', id),
  clearPreset: () => emit('clear-preset'),
  effectToggle,
  effectSourceChange,
  effectIntensityChange,
  saveSettings: () => emit('save-settings'),
  applySettings: () => emit('apply-settings'),
})

// Öffentliche API: loadSettings (alle Verwender), audioLevelBarRef
// (Pegelanzeige), isEnabled.
defineExpose({
  audioLevelBarRef,
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

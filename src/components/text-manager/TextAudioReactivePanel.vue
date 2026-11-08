<template>
  <!-- ✨ AUDIO-REACTIVE EFFECTS (collapsible) -->
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">🎵</span>
      <span>{{ t('canvasControl.audioReactive') }}</span>
      <span v-if="selectedText.audioReactive?.enabled" class="status-badge active">{{
        t('textManager.active')
      }}</span>
    </summary>
    <div class="section-content">
      <!--
        Identisches Panel wie bei Bild-Audio-Reaktiv (Master, Presets, Effekte mit
        eigener Quelle, Speichern/Laden). Bild-Effekte ohne Text-Pendant entfallen,
        Text-eigene Effekte bilden eine zusätzliche Kategorie.
      -->
      <AudioReactivePanel
        ref="panelRef"
        :has-active-image="!!selectedText"
        :has-saved-settings="hasAudioEffectsPreset"
        :active-audio-preset="activeEffectPreset"
        :allowed-effects="allowedEffects"
        :extra-categories="extraCategories"
        @audio-reactive-toggle="(e) => setAudioEnabled(e.target.checked)"
        @source-change="(e) => setAudioProperty('source', e.target.value)"
        @smoothing-change="(e) => setAudioProperty('smoothing', parseInt(e.target.value))"
        @easing-change="(e) => setAudioProperty('easing', e.target.value)"
        @beat-boost-change="(e) => setAudioProperty('beatBoost', parseFloat(e.target.value))"
        @phase-change="(e) => setAudioProperty('phase', parseInt(e.target.value))"
        @gain-change="(e) => setAudioProperty('gain', parseFloat(e.target.value))"
        @toggle-preset="toggleEffectPreset"
        @clear-preset="clearEffectPreset"
        @effect-toggle="setEffectEnabled"
        @effect-intensity-change="setEffectIntensity"
        @effect-source-change="setEffectSource"
        @save-settings="saveAudioEffectsPreset"
        @apply-settings="loadAudioEffectsPreset"
      />

      <!-- Text-spezifische Einstellungen (gibt es bei Bildern nicht) -->
      <details v-if="selectedText.audioReactive?.enabled" class="advanced-settings">
        <summary>⚙️ {{ t('textManager.textSpecific') }}</summary>

        <div class="control-group">
          <label>{{ t('textManager.reactionPresets') }}:</label>
          <div class="preset-buttons">
            <UiButton
              v-for="preset in REACTION_PRESETS"
              :key="preset.id"
              size="sm"
              :title="t(preset.titleKey)"
              @click="applyAudioPreset(preset.id)"
            >
              {{ t(preset.labelKey) }}
            </UiButton>
          </div>
        </div>

        <div v-for="field in REACTION_FIELDS" :key="field.key" class="control-group">
          <label>{{ t(field.label) }}: {{ reactionValue(field) }}%</label>
          <SliderField
            :model-value="reactionValue(field)"
            :min="field.min"
            :max="field.max"
            :default-value="field.fallback"
            class="slider"
            @update:model-value="(v) => setAudioProperty(field.key, v)"
          />
          <div class="hint-text">{{ t(field.hint) }}</div>
        </div>

        <!-- Blinken: Minimum + Ease-Kurve (nur wenn der Effekt aktiv ist) -->
        <template v-if="selectedText.audioReactive.effects?.opacity?.enabled">
          <div class="control-group">
            <label>
              {{ t('textManager.blink') }} – {{ t('textManager.minimum') }}:
              {{ selectedText.audioReactive.effects.opacity.minimum || 0 }}%
            </label>
            <SliderField
              :model-value="selectedText.audioReactive.effects.opacity.minimum || 0"
              :min="0"
              :max="90"
              :default-value="0"
              class="slider"
              @update:model-value="(v) => setOpacityOption('minimum', v)"
            />
          </div>
          <div class="control-group">
            <UiSwitch
              :model-value="Boolean(selectedText.audioReactive.effects.opacity.ease)"
              :label="t('textManager.easeCurve')"
              @update:model-value="(v) => setOpacityOption('ease', v)"
            />
          </div>
        </template>

        <div class="button-group">
          <UiButton variant="ghost" size="sm" @click="resetAudioSettings">
            {{ t('textManager.reset') }}
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="resetAllAudioEffects">
            {{ t('textManager.resetAllEffects') }}
          </UiButton>
        </div>
      </details>

      <div class="hint-text" style="margin-top: 10px">
        {{ t('textManager.effectsTip') }}
      </div>
    </div>
  </details>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useToastStore } from '../../stores/toastStore'
import { useAudioReactiveText } from '../../composables/useAudioReactiveText'
import {
  TEXT_REACTION_DEFAULTS,
  TEXT_SHARED_EFFECT_NAMES,
} from '../../lib/audio/audioReactiveConfig'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'
import { getAudioAnalysisData } from '../../lib/audio/audioAnalysisData'
import SliderField from '../ui/SliderField.vue'
import { UiButton, UiSwitch } from '../ui'

const props = defineProps({
  selectedText: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()
const toastStore = useToastStore()
const canvasManager = inject('canvasManager')

// Reaktive Referenz auf den aktuell markierten Text (siehe TextAnimationsPanel)
const selectedTextRef = toRef(props, 'selectedText')

const {
  hasAudioEffectsPreset,
  revision,
  activeEffectPreset,
  ensureConfig,
  setAudioEnabled,
  setAudioProperty,
  setEffectEnabled,
  setEffectIntensity,
  setEffectSource,
  toggleEffectPreset,
  clearEffectPreset,
  applyAudioPreset,
  resetAudioSettings,
  resetAllAudioEffects,
  saveAudioEffectsPreset,
  loadAudioEffectsPreset,
} = useAudioReactiveText(selectedTextRef, canvasManager, toastStore)

const panelRef = ref(null)

// Bild-Effekte mit Text-Pendant/Wirkung; Text-eigene Effekte als eigene Kategorie
const allowedEffects = [...TEXT_SHARED_EFFECT_NAMES]
const extraCategories = computed(() => [
  {
    title: t('textManager.textEffects'),
    effects: [
      { id: 'opacity', name: t('textManager.blink') },
      { id: 'letterSpacing', name: t('textManager.spacing') },
      { id: 'strokeWidth', name: t('textManager.outline') },
      { id: 'rgbGlitch', name: t('textManager.rgbGlitch') },
      { id: 'perspective3d', name: t('textManager.perspective3d') },
      { id: 'elastic', name: t('textManager.elastic') },
    ],
    defaultIntensity: 80,
  },
])

const REACTION_PRESETS = [
  { id: 'punchy', labelKey: 'textManager.presetPunchy', titleKey: 'textManager.presetPunchyTitle' },
  { id: 'smooth', labelKey: 'textManager.presetSmooth', titleKey: 'textManager.presetSmoothTitle' },
  { id: 'subtle', labelKey: 'textManager.presetSubtle', titleKey: 'textManager.presetSubtleTitle' },
  {
    id: 'extreme',
    labelKey: 'textManager.presetExtreme',
    titleKey: 'textManager.presetExtremeTitle',
  },
]

// Schwellenwert/Attack/Release: Bereich, Standard (Reset-Knopf) und Hinweis
const REACTION_FIELDS = [
  {
    key: 'threshold',
    min: 0,
    max: 50,
    label: 'textManager.threshold',
    hint: 'textManager.thresholdHint',
  },
  { key: 'attack', min: 10, max: 100, label: 'textManager.attack', hint: 'textManager.attackHint' },
  {
    key: 'release',
    min: 10,
    max: 100,
    label: 'textManager.release',
    hint: 'textManager.releaseHint',
  },
].map((field) => ({ ...field, fallback: TEXT_REACTION_DEFAULTS[field.key] }))

function reactionValue(field) {
  return props.selectedText.audioReactive?.[field.key] ?? field.fallback
}

function setOpacityOption(key, value) {
  const cfg = ensureConfig()
  if (!cfg?.effects?.opacity) return
  cfg.effects.opacity[key] = value
  if (canvasManager.value?.redrawCallback) canvasManager.value.redrawCallback()
}

function syncPanel() {
  panelRef.value?.loadSettings(ensureConfig())
}

// Text gewechselt oder externe Änderung (Preset/Laden/Reset) → Panel neu einlesen
watch([() => props.selectedText?.id, revision], async () => {
  await nextTick()
  syncPanel()
})

// ── Audio-Pegel-Anzeige für die Quelle des Textes ──
let levelAnimationId = null

function levelFor(audioData, source) {
  switch (source) {
    case 'mid':
      return audioData.smoothMid ?? 0
    case 'treble':
      return audioData.smoothTreble ?? 0
    case 'volume':
      return audioData.smoothVolume ?? 0
    case 'bass':
    default:
      return audioData.smoothBass ?? 0
  }
}

function updateLevel() {
  levelAnimationId = null
  const bar = panelRef.value?.audioLevelBarRef
  const cfg = props.selectedText?.audioReactive
  if (!bar || !cfg?.enabled) return
  const audioData = getAudioAnalysisData()
  if (audioData) {
    const percent = Math.min(100, (levelFor(audioData, cfg.source) / 255) * 100)
    bar.style.width = percent + '%'
    bar.style.background =
      percent > 70
        ? 'linear-gradient(90deg, #4ade80, #fbbf24, #ef4444)'
        : percent > 40
          ? 'linear-gradient(90deg, #4ade80, #fbbf24)'
          : '#4ade80'
  }
  levelAnimationId = requestAnimationFrame(updateLevel)
}

function startLevelIndicator() {
  if (levelAnimationId === null) levelAnimationId = requestAnimationFrame(updateLevel)
}

function stopLevelIndicator() {
  if (levelAnimationId !== null) cancelAnimationFrame(levelAnimationId)
  levelAnimationId = null
}

watch(
  () => props.selectedText?.audioReactive?.enabled,
  async (enabled) => {
    await nextTick()
    if (enabled) startLevelIndicator()
    else stopLevelIndicator()
  },
)

onMounted(async () => {
  await nextTick()
  syncPanel()
  if (props.selectedText?.audioReactive?.enabled) startLevelIndicator()
})

onBeforeUnmount(stopLevelIndicator)
</script>

<style scoped src="./text-edit/text-edit-shared.css"></style>
<style scoped>
.collapsible-section {
  margin-top: 10px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-secondary);
  padding: 6px 0;
  list-style: none;
}
.section-icon {
  font-size: var(--ds-text-sm);
}
.status-badge {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: var(--ds-radius-md);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
}
.status-badge.active {
  background: color-mix(in srgb, var(--ds-success) 15%, transparent);
  color: var(--ds-success);
}
.section-content {
  padding: 4px 0 8px;
}
.advanced-settings {
  margin-top: 10px;
  padding: 8px;
  background: color-mix(in srgb, var(--ds-link) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-radius: var(--ds-radius-sm);
}
.advanced-settings summary {
  cursor: pointer;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-secondary);
  list-style: none;
}
.advanced-settings .control-group {
  margin-top: 8px;
}
.preset-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  margin-top: 4px;
}
.button-group {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.hint-text {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-top: 3px;
  line-height: 1.4;
}
</style>

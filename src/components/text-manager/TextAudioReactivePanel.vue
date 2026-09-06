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
            <button
              v-for="preset in REACTION_PRESETS"
              :key="preset.id"
              class="btn-preset"
              :title="t(preset.titleKey)"
              @click="applyAudioPreset(preset.id)"
            >
              {{ preset.icon }} {{ t(preset.labelKey) }}
            </button>
          </div>
        </div>

        <div class="control-group">
          <label>
            {{ t('textManager.threshold') }}: {{ selectedText.audioReactive.threshold || 0 }}%
          </label>
          <input
            type="range"
            :value="selectedText.audioReactive.threshold || 0"
            min="0"
            max="50"
            class="slider"
            @input="setAudioProperty('threshold', parseInt($event.target.value))"
          />
          <div class="hint-text">{{ t('textManager.thresholdHint') }}</div>
        </div>

        <div class="control-group">
          <label>
            {{ t('textManager.attack') }}: {{ selectedText.audioReactive.attack ?? 90 }}%
          </label>
          <input
            type="range"
            :value="selectedText.audioReactive.attack ?? 90"
            min="10"
            max="100"
            class="slider"
            @input="setAudioProperty('attack', parseInt($event.target.value))"
          />
          <div class="hint-text">{{ t('textManager.attackHint') }}</div>
        </div>

        <div class="control-group">
          <label>
            {{ t('textManager.release') }}: {{ selectedText.audioReactive.release ?? 50 }}%
          </label>
          <input
            type="range"
            :value="selectedText.audioReactive.release ?? 50"
            min="10"
            max="100"
            class="slider"
            @input="setAudioProperty('release', parseInt($event.target.value))"
          />
          <div class="hint-text">{{ t('textManager.releaseHint') }}</div>
        </div>

        <!-- Blinken: Minimum + Ease-Kurve (nur wenn der Effekt aktiv ist) -->
        <template v-if="selectedText.audioReactive.effects?.opacity?.enabled">
          <div class="control-group">
            <label>
              {{ t('textManager.blink') }} – {{ t('textManager.minimum') }}:
              {{ selectedText.audioReactive.effects.opacity.minimum || 0 }}%
            </label>
            <input
              type="range"
              :value="selectedText.audioReactive.effects.opacity.minimum || 0"
              min="0"
              max="90"
              class="slider"
              @input="setOpacityOption('minimum', parseInt($event.target.value))"
            />
          </div>
          <div class="control-group">
            <label class="effect-checkbox-small">
              <input
                type="checkbox"
                :checked="selectedText.audioReactive.effects.opacity.ease"
                @change="setOpacityOption('ease', $event.target.checked)"
              />
              {{ t('textManager.easeCurve') }}
            </label>
          </div>
        </template>

        <div class="button-group">
          <button class="btn-reset" @click="resetAudioSettings">
            🔄 {{ t('textManager.reset') }}
          </button>
          <button class="btn-reset" @click="resetAllAudioEffects">
            🔄 {{ t('textManager.resetAllEffects') }}
          </button>
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
import { useI18n } from '../../lib/i18n.js'
import { useToastStore } from '../../stores/toastStore.js'
import { useAudioReactiveText } from '../../composables/useAudioReactiveText.js'
import { TEXT_SHARED_EFFECT_NAMES } from '../../lib/audio/audioReactiveConfig.js'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'

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
  {
    id: 'punchy',
    icon: '⚡',
    labelKey: 'textManager.presetPunchy',
    titleKey: 'textManager.presetPunchyTitle',
  },
  {
    id: 'smooth',
    icon: '🌊',
    labelKey: 'textManager.presetSmooth',
    titleKey: 'textManager.presetSmoothTitle',
  },
  {
    id: 'subtle',
    icon: '🎭',
    labelKey: 'textManager.presetSubtle',
    titleKey: 'textManager.presetSubtleTitle',
  },
  {
    id: 'extreme',
    icon: '🔥',
    labelKey: 'textManager.presetExtreme',
    titleKey: 'textManager.presetExtremeTitle',
  },
]

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
  const audioData = typeof window !== 'undefined' ? window.audioAnalysisData : null
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
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary, #f5dfa0);
  padding: 6px 0;
  list-style: none;
}
.section-icon {
  font-size: 0.8rem;
}
.status-badge {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
}
.status-badge.active {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}
.section-content {
  padding: 4px 0 8px;
}
.advanced-settings {
  margin-top: 10px;
  padding: 8px;
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
}
.advanced-settings summary {
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary, #f5dfa0);
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
.btn-preset {
  padding: 5px 6px;
  font-size: 0.6rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
}
.btn-preset:hover {
  background: rgba(139, 92, 246, 0.3);
}
.effect-checkbox-small {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.6rem;
  cursor: pointer;
}
.button-group {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.btn-reset {
  flex: 1;
  padding: 5px 6px;
  font-size: 0.6rem;
  background: var(--secondary-bg, #0c1828);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
}
.btn-reset:hover {
  border-color: var(--accent-primary, #c9984d);
}
.hint-text {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 3px;
  line-height: 1.4;
}
</style>

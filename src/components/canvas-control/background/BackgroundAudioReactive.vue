<template>
  <div class="audio-reactive-section">
    <h5>{{ t('canvasControl.audioReactive') }}</h5>

    <!--
      Identisches Panel wie bei Bild-Audio-Reaktiv (Master, Presets, alle Effekt-
      Kategorien, Speichern/Anwenden) – plus Gradient-Effekte als eigene Kategorie.
    -->
    <AudioReactivePanel
      ref="panelRef"
      :has-active-image="true"
      :has-saved-settings="hasSavedBgAudioSettings"
      :active-audio-preset="activeBgAudioPreset"
      :extra-categories="extraCategories"
      @audio-reactive-toggle="(e) => setBgAudioEnabled(e.target.checked)"
      @source-change="(e) => setBgAudioProperty('source', e.target.value)"
      @smoothing-change="(e) => setBgAudioProperty('smoothing', parseInt(e.target.value))"
      @easing-change="(e) => setBgAudioProperty('easing', e.target.value)"
      @beat-boost-change="(e) => setBgAudioProperty('beatBoost', parseFloat(e.target.value))"
      @phase-change="(e) => setBgAudioProperty('phase', parseInt(e.target.value))"
      @gain-change="(e) => setBgAudioProperty('gain', parseFloat(e.target.value))"
      @toggle-preset="toggleBgAudioPreset"
      @clear-preset="clearBgAudioPreset"
      @effect-toggle="setBgEffectEnabled"
      @effect-intensity-change="setBgEffectIntensity"
      @effect-source-change="setBgEffectSource"
      @save-settings="saveBgAudioSettings"
      @apply-settings="applyBgAudioSettings"
    />
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import AudioReactivePanel from '../../foto-panel/AudioReactivePanel.vue'

const { t } = useI18n()
const bg = inject('bgSettings')
const {
  gradientEnabled,
  bgAudioReactive,
  activeBgAudioPreset,
  bgAudioRevision,
  hasSavedBgAudioSettings,
  setBgAudioEnabled,
  setBgAudioProperty,
  setBgEffectEnabled,
  setBgEffectIntensity,
  setBgEffectSource,
  toggleBgAudioPreset,
  clearBgAudioPreset,
  saveBgAudioSettings,
  applyBgAudioSettings,
} = bg

const panelRef = ref(null)

// Gradient-Effekte nur anbieten, wenn der Gradient aktiv ist
const extraCategories = computed(() =>
  gradientEnabled.value
    ? [
        {
          title: t('canvasControl.gradientEffects'),
          effects: [
            { id: 'gradientPulse', name: t('canvasControl.gradientPulse') },
            { id: 'gradientRotation', name: t('canvasControl.gradientRotation') },
          ],
          defaultIntensity: 80,
        },
      ]
    : [],
)

function syncPanel() {
  panelRef.value?.loadSettings(bgAudioReactive)
}

// Bei externen Änderungen (Preset, Snapshot, Anwenden, Gradient an/aus) die
// unkontrollierten Panel-Controls neu einlesen.
watch([bgAudioRevision, extraCategories], async () => {
  await nextTick()
  syncPanel()
})

// ── Audio-Pegel-Anzeige (wie beim Bild-Panel, aber für die Hintergrund-Quelle) ──
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
  if (!bar || !bgAudioReactive.enabled) return
  const audioData = typeof window !== 'undefined' ? window.audioAnalysisData : null
  if (audioData) {
    const percent = Math.min(100, (levelFor(audioData, bgAudioReactive.source) / 255) * 100)
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
  () => bgAudioReactive.enabled,
  async (enabled) => {
    await nextTick()
    if (enabled) startLevelIndicator()
    else stopLevelIndicator()
  },
)

onMounted(async () => {
  await nextTick()
  syncPanel()
  if (bgAudioReactive.enabled) startLevelIndicator()
})

onBeforeUnmount(stopLevelIndicator)
</script>

<style scoped src="./background-shared.css"></style>
<style scoped>
.audio-reactive-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid #8b5cf6;
  border-radius: 6px;
}
.audio-reactive-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
[data-theme='light'] .audio-reactive-section h5 {
  color: #014f99;
}
[data-theme='light'] .audio-reactive-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
}
</style>

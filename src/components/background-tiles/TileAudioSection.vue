<template>
  <div class="audio-section">
    <!--
      Identisches Panel wie bei Bild-Audio-Reaktiv. Effekte, die auf der
      gewählten Kachel wirkungslos wären (reine Farbkachel ohne Bild/Video:
      Skalierung, Bewegung, Glow, Weichzeichnen, Chromatik …), werden ausgelassen.
    -->
    <AudioReactivePanel
      ref="panelRef"
      :has-active-image="!!tilesStore.selectedTile"
      :has-saved-settings="hasSavedTileAudioSettings"
      :active-audio-preset="activeTileAudioPreset"
      :allowed-effects="allowedEffects"
      @audio-reactive-toggle="(e) => toggleAudioReactive(e.target.checked)"
      @source-change="(e) => setAudioSource(e.target.value)"
      @smoothing-change="(e) => setAudioSmoothing(e.target.value)"
      @easing-change="(e) => setAudioProperty('easing', e.target.value)"
      @beat-boost-change="(e) => setAudioProperty('beatBoost', parseFloat(e.target.value))"
      @phase-change="(e) => setAudioProperty('phase', parseInt(e.target.value))"
      @gain-change="(e) => setAudioProperty('gain', parseFloat(e.target.value))"
      @toggle-preset="toggleTileAudioPreset"
      @clear-preset="clearTileAudioPreset"
      @effect-toggle="toggleEffect"
      @effect-intensity-change="setEffectIntensity"
      @effect-source-change="setEffectSource"
      @save-settings="saveTileAudioSettings"
      @apply-settings="applyTileAudioSettings"
    />
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'
import { tileEffectNames } from '../../lib/audio/audioReactiveConfig.js'

const {
  tilesStore,
  toggleAudioReactive,
  setAudioSource,
  setAudioSmoothing,
  toggleEffect,
  setEffectIntensity,
  setAudioProperty,
  setEffectSource,
  activeTileAudioPreset,
  tileAudioRevision,
  hasSavedTileAudioSettings,
  toggleTileAudioPreset,
  clearTileAudioPreset,
  saveTileAudioSettings,
  applyTileAudioSettings,
} = inject('tileControls')

const panelRef = ref(null)

const tileHasMedia = computed(() => {
  const tile = tilesStore.selectedTile
  return Boolean(tile && (tile.image || tile.video || tile.imageSrc || tile.videoSrc))
})

// Nur Effekte anbieten, die auf dieser Kachel sichtbar wirken
const allowedEffects = computed(() => [...tileEffectNames(tileHasMedia.value)])

function syncPanel() {
  panelRef.value?.loadSettings(tilesStore.selectedTile?.audioReactive ?? null)
}

// Beim Wechsel der Kachel, nach Preset/Anwenden oder wenn sich die verfügbaren
// Effekte ändern, die unkontrollierten Panel-Controls neu einlesen.
watch([() => tilesStore.selectedTileIndex, tileAudioRevision, allowedEffects], async () => {
  await nextTick()
  syncPanel()
})

// ── Audio-Pegel-Anzeige für die Quelle der gewählten Kachel ──
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
  const ar = tilesStore.selectedTile?.audioReactive
  if (!bar || !ar?.enabled) return
  const audioData = typeof window !== 'undefined' ? window.audioAnalysisData : null
  if (audioData) {
    const percent = Math.min(100, (levelFor(audioData, ar.source) / 255) * 100)
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
  () => tilesStore.selectedTile?.audioReactive?.enabled,
  async (enabled) => {
    await nextTick()
    if (enabled) startLevelIndicator()
    else stopLevelIndicator()
  },
)

onMounted(async () => {
  await nextTick()
  syncPanel()
  if (tilesStore.selectedTile?.audioReactive?.enabled) startLevelIndicator()
})

onBeforeUnmount(stopLevelIndicator)
</script>

<style scoped>
.audio-section {
  margin-top: 10px;
}
</style>

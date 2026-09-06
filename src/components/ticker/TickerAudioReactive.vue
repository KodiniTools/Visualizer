<template>
  <div class="ticker-audio">
    <!--
      Identisches Panel wie bei Bild-Audio-Reaktiv (Master, Presets, Effekte mit
      eigener Quelle, Speichern/Anwenden). Bild-Effekte, die auf einem Lauftext
      nichts bewirken (Perspektive, Rahmen, Chromatik, Vignette), entfallen;
      Lauftext-eigene Effekte (Tempo, Deckkraft) bilden eine eigene Kategorie.
    -->
    <AudioReactivePanel
      ref="panelRef"
      :has-active-image="true"
      :has-saved-settings="hasSavedSettings"
      :active-audio-preset="activePreset"
      :allowed-effects="allowedEffects"
      :extra-categories="extraCategories"
      @audio-reactive-toggle="(e) => setEnabled(e.target.checked)"
      @source-change="(e) => setProperty('source', e.target.value)"
      @smoothing-change="(e) => setProperty('smoothing', parseInt(e.target.value))"
      @easing-change="(e) => setProperty('easing', e.target.value)"
      @beat-boost-change="(e) => setProperty('beatBoost', parseFloat(e.target.value))"
      @phase-change="(e) => setProperty('phase', parseInt(e.target.value))"
      @gain-change="(e) => setProperty('gain', parseFloat(e.target.value))"
      @toggle-preset="togglePreset"
      @clear-preset="clearPreset"
      @effect-toggle="setEffectEnabled"
      @effect-intensity-change="setEffectIntensity"
      @effect-source-change="setEffectSource"
      @save-settings="saveSettings"
      @apply-settings="applySettings"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useTickerStore } from '../../stores/tickerStore.js'
import {
  TICKER_SHARED_EFFECT_NAMES,
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  cloneAudioReactiveConfig,
} from '../../lib/audio/audioReactiveConfig.js'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'

const STORAGE_KEY = 'visualizer_tickerAudioReactivePreset'

const { t } = useI18n()
const ticker = useTickerStore()
const panelRef = ref(null)

const allowedEffects = [...TICKER_SHARED_EFFECT_NAMES]
const extraCategories = computed(() => [
  {
    title: t('ticker.tickerEffects'),
    effects: [
      { id: 'tempo', name: t('ticker.reactModeTempo') },
      { id: 'opacity', name: t('ticker.reactModeOpacity') },
    ],
    defaultIntensity: 60,
  },
])

const activePreset = ref(null)
let userEffectsBackup = null
const revision = ref(0)

function loadSaved() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
const savedSettings = ref(loadSaved())
const hasSavedSettings = computed(() => savedSettings.value !== null)

const cfg = () => ticker.audioFx

function setEnabled(enabled) {
  ticker.audioReactive = Boolean(enabled)
  if (!enabled) activePreset.value = null
}

function setProperty(property, value) {
  const c = cfg()
  if (!c || property === 'effects' || !(property in c)) return
  c[property] = value
}

function setEffectEnabled(name, enabled) {
  const fx = cfg()?.effects?.[name]
  if (fx) fx.enabled = Boolean(enabled)
}

function setEffectIntensity(name, value) {
  const fx = cfg()?.effects?.[name]
  const n = parseInt(value)
  if (fx && Number.isFinite(n)) fx.intensity = Math.max(0, Math.min(100, n))
}

function setEffectSource(name, source) {
  const fx = cfg()?.effects?.[name]
  if (fx) fx.source = source ? source : null
}

function togglePreset(name) {
  const c = cfg()
  if (activePreset.value === name) {
    clearPreset()
    return
  }
  if (activePreset.value === null) userEffectsBackup = cloneAudioReactiveConfig(c)
  if (!applyAudioReactivePreset(c, name)) return
  ticker.audioReactive = true
  activePreset.value = name
  revision.value++
}

function clearPreset() {
  if (userEffectsBackup) {
    assignAudioReactiveConfig(cfg(), userEffectsBackup)
    cfg().enabled = ticker.audioReactive
  }
  activePreset.value = null
  revision.value++
}

function saveSettings() {
  const copy = cloneAudioReactiveConfig(cfg())
  savedSettings.value = copy
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  } catch (e) {
    console.warn('⚠️ Lauftext-Audio-Einstellungen konnten nicht gespeichert werden:', e)
  }
}

function applySettings() {
  if (!savedSettings.value) return
  assignAudioReactiveConfig(cfg(), savedSettings.value)
  ticker.audioReactive = Boolean(savedSettings.value.enabled)
  cfg().enabled = ticker.audioReactive
  activePreset.value = null
  revision.value++
}

function syncPanel() {
  panelRef.value?.loadSettings(cfg())
}

// Externe Änderungen (Preset, Anwenden, Sektion zurücksetzen) → Panel neu einlesen
watch([revision, () => ticker.audioReactive], async () => {
  await nextTick()
  syncPanel()
})

// ── Audio-Pegel-Anzeige ──
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
  if (!bar || !ticker.audioReactive) return
  const audioData = typeof window !== 'undefined' ? window.audioAnalysisData : null
  if (audioData) {
    const percent = Math.min(100, (levelFor(audioData, cfg().source) / 255) * 100)
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
  () => ticker.audioReactive,
  async (enabled) => {
    await nextTick()
    if (enabled) startLevelIndicator()
    else stopLevelIndicator()
  },
)

onMounted(async () => {
  await nextTick()
  syncPanel()
  if (ticker.audioReactive) startLevelIndicator()
})

onBeforeUnmount(stopLevelIndicator)
</script>

<style scoped>
.ticker-audio {
  margin-top: 4px;
}
</style>

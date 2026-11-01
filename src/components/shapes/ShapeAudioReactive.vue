<template>
  <div class="shape-audio-reactive" data-shape-audio>
    <!--
      Identisches Panel wie bei Bild-Audio-Reaktiv (Master, Presets, Effekte mit
      eigener Quelle, Speichern/Anwenden). Bild-Effekte, die eine Bildfläche
      voraussetzen (Rahmen, Chromatik, Vignette), entfallen bei Formen.
    -->
    <AudioReactivePanel
      ref="panelRef"
      :has-active-image="!!shape"
      :has-saved-settings="hasSavedSettings"
      :active-audio-preset="activePreset"
      :allowed-effects="allowedEffects"
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
import { getAudioAnalysisData } from '../../lib/audio/audioAnalysisData.js'
/**
 * Audio-Reaktiv für die ausgewählte Form (Formen & Symbole). Arbeitet auf
 * `shape.audioReactive` im shapeStore – gleiche Struktur, Presets und Effekte
 * wie `fotoSettings.audioReactive` bei Bildern. Die Konfiguration entsteht
 * erst bei der ersten Änderung, damit das bloße Öffnen keinen Verlaufsschritt
 * erzeugt. Undo/Redo läuft über das History-Segment `shapes`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { historyApplyRevision } from '../../lib/history/historyRecorder.js'
import {
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  cloneAudioReactiveConfig,
} from '../../lib/audio/audioReactiveConfig.js'
import { SHAPE_EFFECT_NAMES } from '../../lib/shapes/shapeAudio.js'
import { useShapeStore } from '../../stores/shapeStore.js'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'

const STORAGE_KEY = 'visualizer_shapeAudioReactivePreset'

const props = defineProps({
  /** Ausgewählte Form aus dem shapeStore */
  shape: { type: Object, default: null },
})

const store = useShapeStore()
const panelRef = ref(null)
const allowedEffects = [...SHAPE_EFFECT_NAMES]
const revision = ref(0)
// Undo/Redo gilt als externe Änderung → Panel neu einlesen
watch(historyApplyRevision, () => revision.value++)

// Aktives Preset + Backup der eigenen Effekte pro Form (id)
const activePresets = ref(new Map())
const userBackups = new Map()
const activePreset = computed(() =>
  props.shape ? (activePresets.value.get(props.shape.id) ?? null) : null,
)

function setActivePreset(name) {
  if (!props.shape) return
  const next = new Map(activePresets.value)
  next.set(props.shape.id, name)
  activePresets.value = next
}

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

/** Konfiguration der Form (wird bei Bedarf angelegt) */
const cfg = () => (props.shape ? store.ensureAudioReactive(props.shape.id) : null)

function setEnabled(enabled) {
  const c = cfg()
  if (!c) return
  c.enabled = Boolean(enabled)
  if (!enabled) setActivePreset(null)
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
  if (!c) return
  if (activePreset.value === name) {
    clearPreset()
    return
  }
  if (activePreset.value === null) userBackups.set(props.shape.id, cloneAudioReactiveConfig(c))
  if (!applyAudioReactivePreset(c, name)) return
  setActivePreset(name)
  revision.value++
}

function clearPreset() {
  const c = cfg()
  if (!c) return
  const backup = userBackups.get(props.shape.id)
  if (backup) assignAudioReactiveConfig(c, backup)
  setActivePreset(null)
  revision.value++
}

function saveSettings() {
  const c = cfg()
  if (!c) return
  const copy = cloneAudioReactiveConfig(c)
  savedSettings.value = copy
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  } catch (e) {
    console.warn('⚠️ Formen-Audio-Einstellungen konnten nicht gespeichert werden:', e)
  }
}

function applySettings() {
  const c = cfg()
  if (!c || !savedSettings.value) return
  assignAudioReactiveConfig(c, savedSettings.value)
  setActivePreset(null)
  revision.value++
}

function syncPanel() {
  panelRef.value?.loadSettings(props.shape?.audioReactive ?? null)
}

// Form gewechselt oder externe Änderung → Panel neu einlesen
watch([() => props.shape, revision], async () => {
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
  const c = props.shape?.audioReactive
  if (!bar || !c?.enabled) return
  const audioData = getAudioAnalysisData()
  if (audioData) {
    const percent = Math.min(100, (levelFor(audioData, c.source) / 255) * 100)
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
  () => !!props.shape?.audioReactive?.enabled,
  async (enabled) => {
    await nextTick()
    if (enabled) startLevelIndicator()
    else stopLevelIndicator()
  },
)

onMounted(async () => {
  await nextTick()
  syncPanel()
  if (props.shape?.audioReactive?.enabled) startLevelIndicator()
})

onBeforeUnmount(stopLevelIndicator)
</script>

<style scoped>
.shape-audio-reactive {
  display: flex;
  flex-direction: column;
}
</style>

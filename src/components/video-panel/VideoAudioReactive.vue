<template>
  <div class="video-audio-reactive">
    <div class="var-header">
      <span class="var-title">🎵 {{ t('canvasControl.audioReactive') }}</span>
      <span v-if="label" class="var-label">{{ label }}</span>
    </div>
    <!--
      Identisches Panel wie bei Bild-Audio-Reaktiv (Master, Presets, alle 32
      Effekte mit eigener Quelle, Speichern/Anwenden) – Videos werden wie Bilder
      gezeichnet, daher gelten alle Effekte.
    -->
    <AudioReactivePanel
      ref="panelRef"
      :has-active-image="!!video"
      :has-saved-settings="hasSavedSettings"
      :active-audio-preset="activePreset"
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
/**
 * Audio-Reaktiv-Panel für ein Video-Objekt (Canvas-Video, Video-Hintergrund,
 * Workspace-Video-Hintergrund). Arbeitet direkt auf
 * `video.fotoSettings.audioReactive` (Struktur wie bei Canvas-Bildern).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import {
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  cloneAudioReactiveConfig,
  ensureAudioReactiveConfig,
} from '../../lib/audio/audioReactiveConfig.js'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'

const STORAGE_KEY = 'visualizer_videoAudioReactivePreset'

const props = defineProps({
  /** Video-Datenobjekt mit `fotoSettings` (wird in-place bearbeitet) */
  video: { type: Object, default: null },
  /** Optionale Bezeichnung (z. B. "Hintergrund") */
  label: { type: String, default: '' },
})

const { t } = useI18n()
const panelRef = ref(null)
const revision = ref(0)

// Aktives Preset + Backup der Nutzer-Effekte pro Video-Objekt
const activePresets = new WeakMap()
const userBackups = new WeakMap()
const activePresetTick = ref(0)
const activePreset = computed(() => {
  activePresetTick.value
  return props.video ? (activePresets.get(props.video) ?? null) : null
})

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

/** Stellt die vollständige Konfiguration des Videos sicher. */
function cfg() {
  const v = props.video
  if (!v) return null
  if (!v.fotoSettings) v.fotoSettings = {}
  v.fotoSettings.audioReactive = ensureAudioReactiveConfig(v.fotoSettings.audioReactive)
  return v.fotoSettings.audioReactive
}

function setActivePreset(name) {
  if (!props.video) return
  activePresets.set(props.video, name)
  activePresetTick.value++
}

function setEnabled(enabled) {
  const c = cfg()
  if (!c) return
  c.enabled = Boolean(enabled)
  if (!enabled) setActivePreset(null)
  // Video-Objekte sind nicht reaktiv → Pegelanzeige explizit steuern
  nextTick(() => (c.enabled ? startLevelIndicator() : stopLevelIndicator()))
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
  if (activePreset.value === null) userBackups.set(props.video, cloneAudioReactiveConfig(c))
  if (!applyAudioReactivePreset(c, name)) return
  setActivePreset(name)
  revision.value++
}

function clearPreset() {
  const c = cfg()
  if (!c) return
  const backup = userBackups.get(props.video)
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
    console.warn('⚠️ Video-Audio-Einstellungen konnten nicht gespeichert werden:', e)
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
  panelRef.value?.loadSettings(cfg())
}

// Video gewechselt oder externe Änderung → Panel neu einlesen
watch([() => props.video, revision], async () => {
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
  const c = props.video?.fotoSettings?.audioReactive
  if (!bar || !c?.enabled) return
  const audioData = typeof window !== 'undefined' ? window.audioAnalysisData : null
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

// Nach externen Änderungen (Preset/Anwenden) Pegelanzeige neu bewerten
watch(revision, () => {
  const c = props.video?.fotoSettings?.audioReactive
  if (c?.enabled) startLevelIndicator()
  else stopLevelIndicator()
})

onMounted(async () => {
  await nextTick()
  syncPanel()
  if (props.video?.fotoSettings?.audioReactive?.enabled) startLevelIndicator()
})

onBeforeUnmount(stopLevelIndicator)
</script>

<style scoped>
.video-audio-reactive {
  margin-top: 10px;
  padding: 8px;
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-left: 2px solid #8b5cf6;
  border-radius: 6px;
}
.var-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.var-title {
  font-size: 0.6rem;
  font-weight: 600;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.var-label {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
}
[data-theme='light'] .var-title {
  color: #014f99;
}
[data-theme='light'] .video-audio-reactive {
  border-left-color: #014f99;
  background: rgba(1, 79, 153, 0.05);
}
</style>

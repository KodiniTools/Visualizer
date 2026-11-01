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
      v-on="panelListeners"
    />
  </div>
</template>

<script setup>
/**
 * Audio-Reaktiv-Panel für ein Video-Objekt (Canvas-Video, Video-Hintergrund,
 * Workspace-Video-Hintergrund). Arbeitet direkt auf
 * `video.fotoSettings.audioReactive` (Struktur wie bei Canvas-Bildern).
 */
import { ref } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { ensureAudioReactiveConfig } from '../../lib/audio/audioReactiveConfig.js'
import { useAudioReactiveTarget } from '../../composables/audioReactive/useAudioReactiveTarget.js'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'

const props = defineProps({
  /** Video-Datenobjekt mit `fotoSettings` (wird in-place bearbeitet) */
  video: { type: Object, default: null },
  /** Optionale Bezeichnung (z. B. "Hintergrund") */
  label: { type: String, default: '' },
})

const { t } = useI18n()
const panelRef = ref(null)

/** Stellt die vollständige Konfiguration des Videos sicher. */
function cfg() {
  const v = props.video
  if (!v) return null
  if (!v.fotoSettings) v.fotoSettings = {}
  v.fotoSettings.audioReactive = ensureAudioReactiveConfig(v.fotoSettings.audioReactive)
  return v.fotoSettings.audioReactive
}

// Video-Objekte sind nicht reaktiv: Preset/Backup je Objekt (WeakMap im Composable)
const { activePreset, hasSavedSettings, panelListeners } = useAudioReactiveTarget({
  panelRef,
  storageKey: 'visualizer_videoAudioReactivePreset',
  saveWarning: '⚠️ Video-Audio-Einstellungen konnten nicht gespeichert werden:',
  getConfig: cfg,
  peekConfig: () => props.video?.fotoSettings?.audioReactive ?? null,
  panelConfig: cfg,
  targetKey: () => props.video,
  setEnabled(enabled) {
    const c = cfg()
    if (!c) return false
    c.enabled = enabled
  },
  syncSources: [() => props.video],
})
</script>

<style scoped>
.video-audio-reactive {
  margin-top: 10px;
  padding: 8px;
  background: color-mix(in srgb, var(--ds-link) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-left: 2px solid var(--ds-link);
  border-radius: var(--ds-radius-sm);
}
.var-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.var-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-link);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.var-label {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}
[data-theme='light'] .var-title {
  color: var(--accent-ink);
}
[data-theme='light'] .video-audio-reactive {
  border-left-color: var(--accent-primary);
  background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
}
</style>

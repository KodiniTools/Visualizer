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
      v-on="panelListeners"
    />
  </div>
</template>

<script setup>
/**
 * Audio-Reaktiv für die ausgewählte Form (Formen & Symbole). Arbeitet auf
 * `shape.audioReactive` im shapeStore – gleiche Struktur, Presets und Effekte
 * wie `fotoSettings.audioReactive` bei Bildern. Die Konfiguration entsteht
 * erst bei der ersten Änderung, damit das bloße Öffnen keinen Verlaufsschritt
 * erzeugt. Undo/Redo läuft über das History-Segment `shapes`.
 */
import { ref } from 'vue'
import { SHAPE_EFFECT_NAMES } from '../../lib/shapes/shapeAudio.js'
import { useShapeStore } from '../../stores/shapeStore.js'
import { useAudioReactiveTarget } from '../../composables/audioReactive/useAudioReactiveTarget.js'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'

const props = defineProps({
  /** Ausgewählte Form aus dem shapeStore */
  shape: { type: Object, default: null },
})

const store = useShapeStore()
const panelRef = ref(null)
const allowedEffects = [...SHAPE_EFFECT_NAMES]

/** Konfiguration der Form (wird bei Bedarf angelegt) */
const cfg = () => (props.shape ? store.ensureAudioReactive(props.shape.id) : null)

const { activePreset, hasSavedSettings, panelListeners } = useAudioReactiveTarget({
  panelRef,
  storageKey: 'visualizer_shapeAudioReactivePreset',
  saveWarning: '⚠️ Formen-Audio-Einstellungen konnten nicht gespeichert werden:',
  getConfig: cfg,
  peekConfig: () => props.shape?.audioReactive ?? null,
  targetKey: () => props.shape?.id ?? null,
  setEnabled(enabled) {
    const c = cfg()
    if (!c) return false
    c.enabled = enabled
  },
  syncSources: [() => props.shape],
})
</script>

<style scoped>
.shape-audio-reactive {
  display: flex;
  flex-direction: column;
}
</style>

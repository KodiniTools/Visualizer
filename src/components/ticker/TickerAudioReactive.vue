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
      v-on="panelListeners"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useTickerStore } from '../../stores/tickerStore.js'
import { TICKER_SHARED_EFFECT_NAMES } from '../../lib/audio/audioReactiveConfig.js'
import { useAudioReactiveTarget } from '../../composables/audioReactive/useAudioReactiveTarget.js'
import AudioReactivePanel from '../foto-panel/AudioReactivePanel.vue'

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

// Der Ein/Aus-Schalter ist `ticker.audioReactive`; `audioFx.enabled` spiegelt ihn.
const { activePreset, hasSavedSettings, panelListeners } = useAudioReactiveTarget({
  panelRef,
  storageKey: 'visualizer_tickerAudioReactivePreset',
  saveWarning: '⚠️ Lauftext-Audio-Einstellungen konnten nicht gespeichert werden:',
  getConfig: () => ticker.audioFx,
  targetKey: () => 'ticker',
  isEnabled: () => ticker.audioReactive,
  setEnabled(enabled) {
    ticker.audioReactive = enabled
  },
  syncSources: [() => ticker.audioReactive],
  onPresetApplied() {
    ticker.audioReactive = true
  },
  onPresetRestored(c) {
    c.enabled = ticker.audioReactive
  },
  onSettingsApplied(c, saved) {
    ticker.audioReactive = Boolean(saved.enabled)
    c.enabled = ticker.audioReactive
  },
})
</script>

<style scoped>
.ticker-audio {
  margin-top: 4px;
}
</style>

<template>
  <AudioReactivePanel
    ref="audioReactivePanelRef"
    :hasActiveImage="!!currentActiveImage"
    :hasSavedSettings="hasSavedAudioSettings"
    :activeAudioPreset="activeAudioPreset"
    @audio-reactive-toggle="onAudioReactiveToggle"
    @source-change="onAudioReactiveSourceChange"
    @smoothing-change="onAudioReactiveSmoothingChange"
    @easing-change="onAudioReactiveEasingChange"
    @beat-boost-change="onAudioReactiveBeatBoostChange"
    @phase-change="onAudioReactivePhaseChange"
    @gain-change="onAudioReactiveGainChange"
    @toggle-preset="toggleAudioPreset"
    @effect-toggle="onEffectToggle"
    @effect-intensity-change="onEffectIntensityChange"
    @effect-source-change="onEffectSourceChange"
    @save-settings="saveAudioReactiveSettings"
    @apply-settings="applyAudioReactiveSettings"
  />
</template>

<script setup>
import { ref, inject, watch, onMounted, nextTick } from 'vue'
import AudioReactivePanel from './foto-panel/AudioReactivePanel.vue'
import { useImageAudioReactive } from '../composables/useImageAudioReactive.js'

const fotoManagerRef = inject('fotoManager')

const audioReactivePanelRef = ref(null)

const {
  currentActiveImage,
  activeAudioPreset,
  hasSavedAudioSettings,
  onAudioReactiveToggle,
  onAudioReactiveSourceChange,
  onAudioReactiveSmoothingChange,
  onAudioReactiveEasingChange,
  onAudioReactiveBeatBoostChange,
  onAudioReactivePhaseChange,
  onAudioReactiveGainChange,
  toggleAudioPreset,
  onEffectToggle,
  onEffectIntensityChange,
  onEffectSourceChange,
  saveAudioReactiveSettings,
  applyAudioReactiveSettings,
} = useImageAudioReactive(fotoManagerRef)

// Reflect the currently selected image's settings in the panel UI.
watch(
  currentActiveImage,
  (newImage) => {
    audioReactivePanelRef.value?.loadSettings(newImage)
  },
  { immediate: false },
)

onMounted(async () => {
  // The panel mounts lazily (when the popover opens): sync it with whatever
  // image is currently active.
  await nextTick()
  audioReactivePanelRef.value?.loadSettings(currentActiveImage.value)
})
</script>

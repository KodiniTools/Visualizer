<template>
  <div class="video-panel-wrapper">
    <VideoUploadSection />
    <VideoPlacementControls />
    <CanvasVideosList />
    <BackgroundVideoControls />
  </div>
</template>

<script setup>
import { provide, inject } from 'vue'
import { useVideoPanel } from '../composables/useVideoPanel.js'
import VideoUploadSection from './video-panel/VideoUploadSection.vue'
import VideoPlacementControls from './video-panel/VideoPlacementControls.vue'
import CanvasVideosList from './video-panel/CanvasVideosList.vue'
import BackgroundVideoControls from './video-panel/BackgroundVideoControls.vue'

// Der Video-Zustand (hochgeladene Videos, Platzierung, Ton) lebt in der
// Sticky-Player-Bar, die immer gemountet ist. So bleibt die Video-Liste
// erhalten, während dieses Panel in seinem Popover geöffnet und geschlossen
// wird. Ohne bereitgestellten Zustand erzeugt das Panel ihn selbst.
const vp = inject('videoPanel', null) || useVideoPanel()
provide('videoPanel', vp)
</script>

<style scoped>
.video-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}
</style>

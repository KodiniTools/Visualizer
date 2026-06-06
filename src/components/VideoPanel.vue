<template>
  <div class="video-panel-wrapper">
    <VideoUploadSection />
    <VideoPlacementControls />
    <CanvasVideosList />
    <BackgroundVideoControls />
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useVideoPanel } from '../composables/useVideoPanel.js'
import VideoUploadSection from './video-panel/VideoUploadSection.vue'
import VideoPlacementControls from './video-panel/VideoPlacementControls.vue'
import CanvasVideosList from './video-panel/CanvasVideosList.vue'
import BackgroundVideoControls from './video-panel/BackgroundVideoControls.vue'

const vp = useVideoPanel()
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

<template>
  <div ref="barRef" class="sticky-player-bar">
    <!-- ══════════════ POPOVERS (open above the bar; several at once) ══════════════ -->
    <AudioSourcePopover v-if="popover.isOpen('audio')" />
    <VolumeEqPopover v-if="popover.isOpen('volume')" />
    <BeatMarkerPopover v-if="popover.isOpen('markers')" />
    <PlaylistPopover v-if="popover.isOpen('playlist')" />
    <CanvasFormatPopover v-if="popover.isOpen('canvasFormat')" />
    <ScreenshotPopover v-if="popover.isOpen('screenshot')" />
    <RecorderPopover v-if="popover.isOpen('recorder')" />

    <!-- ══════════════ THE BAR ══════════════ -->
    <PlayerBarControls />
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import { usePlayerPopover } from '../composables/usePlayerPopover.js'
import { usePlayerVolumeEq } from '../composables/usePlayerVolumeEq.js'
import { usePlayMode } from '../composables/usePlayMode.js'
import { useAudioSourceControls } from '../composables/useAudioSourceControls.js'
import { useBeatMarkers } from '../composables/useBeatMarkers.js'
import { usePlaylistManager } from '../composables/usePlaylistManager.js'
import AudioSourcePopover from './sticky-player-bar/AudioSourcePopover.vue'
import VolumeEqPopover from './sticky-player-bar/VolumeEqPopover.vue'
import BeatMarkerPopover from './sticky-player-bar/BeatMarkerPopover.vue'
import PlaylistPopover from './sticky-player-bar/PlaylistPopover.vue'
import CanvasFormatPopover from './sticky-player-bar/CanvasFormatPopover.vue'
import ScreenshotPopover from './sticky-player-bar/ScreenshotPopover.vue'
import RecorderPopover from './sticky-player-bar/RecorderPopover.vue'
import PlayerBarControls from './sticky-player-bar/PlayerBarControls.vue'

const barRef = ref(null)

// The bar owns all shared state via composables (so watchers and DOM listeners
// register exactly once) and hands it to the child popovers/controls through a
// single `provide` context.
const popover = usePlayerPopover()
const volumeEq = usePlayerVolumeEq()
const playMode = usePlayMode()
const audioSource = useAudioSourceControls()
const markers = useBeatMarkers(() => popover.openPopover('markers'))
const playlist = usePlaylistManager()

provide('playerBar', { popover, volumeEq, playMode, audioSource, markers, playlist })
</script>

<style scoped>
.sticky-player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* Above the floating help button (z-index 9998) so open popovers are never
     covered by it. The bar row itself sits below the help button, which floats
     just above the bar, so they never overlap spatially. */
  z-index: 9999;
}
</style>

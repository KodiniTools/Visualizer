<template>
  <div ref="barRef" class="sticky-player-bar">
    <!-- ══════════════ POPOVERS (open above the bar; several at once) ══════════════ -->
    <!-- Der Text-Manager bleibt dauerhaft gemountet (v-show statt v-if): Er
         registriert die Tastatureingabe zum Anlegen von Text, hält die
         Auswahl-Rückmeldung des Canvas (die sich nicht abmelden lässt) und
         den Timer der Text-Sequenz. Ein Ab- und Neuaufbau beim Schließen
         würde diese verlieren bzw. Listener anhäufen. -->
    <TextManagerPopover v-show="popover.isOpen('textManager')" />
    <AudioSourcePopover v-if="popover.isOpen('audio')" />
    <VolumeEqPopover v-if="popover.isOpen('volume')" />
    <BeatMarkerPopover v-if="popover.isOpen('markers')" />
    <PlaylistPopover v-if="popover.isOpen('playlist')" />
    <GalleryPopover v-if="popover.isOpen('gallery')" />
    <PresetsPopover v-if="popover.isOpen('presets')" />
    <AudioReactivePopover v-if="popover.isOpen('audioReactive')" />
    <TextAudioReactivePopover v-if="popover.isOpen('textAudioReactive')" />
    <CanvasFormatPopover v-if="popover.isOpen('canvasFormat')" />
    <ScreenshotPopover v-if="popover.isOpen('screenshot')" />
    <VisualizerPopover v-if="popover.isOpen('visualizer')" />
    <MultiLayerPopover v-if="popover.isOpen('multiLayer')" />
    <EffectsPopover v-if="popover.isOpen('effects')" />
    <CanvasControlPopover v-if="popover.isOpen('canvasControl')" />
    <VideoPopover v-if="popover.isOpen('video')" />
    <RecorderPopover v-if="popover.isOpen('recorder')" />

    <!-- ══════════════ THE BAR ══════════════ -->
    <PlayerBarControls />
  </div>
</template>

<script setup>
import { ref, provide, onMounted, onUnmounted } from 'vue'
import { usePlayerPopover } from '../composables/usePlayerPopover.js'
import { usePlayerVolumeEq } from '../composables/usePlayerVolumeEq.js'
import { usePlayMode } from '../composables/usePlayMode.js'
import { useAudioSourceControls } from '../composables/useAudioSourceControls.js'
import { useBeatMarkers } from '../composables/useBeatMarkers.js'
import { usePlaylistManager } from '../composables/usePlaylistManager.js'
import { useBgSettings } from '../composables/useBgSettings.js'
import { useVideoPanel } from '../composables/useVideoPanel.js'
import TextManagerPopover from './sticky-player-bar/TextManagerPopover.vue'
import AudioSourcePopover from './sticky-player-bar/AudioSourcePopover.vue'
import VolumeEqPopover from './sticky-player-bar/VolumeEqPopover.vue'
import BeatMarkerPopover from './sticky-player-bar/BeatMarkerPopover.vue'
import PlaylistPopover from './sticky-player-bar/PlaylistPopover.vue'
import GalleryPopover from './sticky-player-bar/GalleryPopover.vue'
import PresetsPopover from './sticky-player-bar/PresetsPopover.vue'
import AudioReactivePopover from './sticky-player-bar/AudioReactivePopover.vue'
import TextAudioReactivePopover from './sticky-player-bar/TextAudioReactivePopover.vue'
import CanvasFormatPopover from './sticky-player-bar/CanvasFormatPopover.vue'
import ScreenshotPopover from './sticky-player-bar/ScreenshotPopover.vue'
import VisualizerPopover from './sticky-player-bar/VisualizerPopover.vue'
import MultiLayerPopover from './sticky-player-bar/MultiLayerPopover.vue'
import EffectsPopover from './sticky-player-bar/EffectsPopover.vue'
import CanvasControlPopover from './sticky-player-bar/CanvasControlPopover.vue'
import VideoPopover from './sticky-player-bar/VideoPopover.vue'
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

// Hintergrund-/Canvas-Zustand hier erzeugen, nicht im Panel: die Leiste ist
// immer gemountet, das Canvas-Steuerung-Popover dagegen nur bei Bedarf. So
// überleben Undo-Verlauf, Gradient- und Audio-Reaktiv-Einstellungen sowie die
// bei Beat-Markern genutzte Hintergrund-Bridge das Schließen des Popovers.
provide('bgSettings', useBgSettings())

// Ebenso der Video-Zustand: die hochgeladene Video-Liste und die
// Platzierungs-Einstellungen sollen das Schließen des Popovers überleben.
provide('videoPanel', useVideoPanel())

provide('playerBar', { popover, volumeEq, playMode, audioSource, markers, playlist })

// Tippen auf dem Canvas legt sofort einen Text an (TextManagerPanel reagiert
// auf dieses Ereignis). Da der Text-Manager jetzt im Popover sitzt, wird es
// dabei geöffnet, damit der Editor wie zuvor direkt sichtbar ist.
const openTextManager = () => popover.openPopover('textManager')
onMounted(() => window.addEventListener('openTextEditorWithChar', openTextManager))
onUnmounted(() => window.removeEventListener('openTextEditorWithChar', openTextManager))
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

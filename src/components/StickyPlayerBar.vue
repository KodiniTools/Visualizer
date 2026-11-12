<template>
  <div ref="barRef" class="sticky-player-bar">
    <!-- ══════════════ POPOVERS (open above the bar; several at once) ══════════════ -->
    <!-- Der Text-Manager bleibt dauerhaft gemountet (v-show statt v-if): Er
         registriert die Tastatureingabe zum Anlegen von Text, hält die
         Auswahl-Rückmeldung des Canvas (die sich nicht abmelden lässt) und
         den Timer der Text-Sequenz. Ein Ab- und Neuaufbau beim Schließen
         würde diese verlieren bzw. Listener anhäufen. -->
    <TextManagerPopover v-show="popover.isOpen('textManager')" />
    <!-- Slideshow-Fenster ebenfalls dauerhaft gemountet: es ist das Teleport-
         Ziel des Slideshow-Panels im FotoPanel (Zustand bleibt beim Schließen). -->
    <SlideshowPopover v-show="popover.isOpen('slideshow')" />
    <AudioSourcePopover v-if="popover.isOpen('audio')" />
    <VolumeEqPopover v-if="popover.isOpen('volume')" />
    <BeatMarkerPopover v-if="popover.isOpen('markers')" />
    <PlaylistPopover v-if="popover.isOpen('playlist')" />
    <GalleryPopover v-if="popover.isOpen('gallery')" />
    <PresetsPopover v-if="popover.isOpen('presets')" />
    <AudioReactivePopover v-if="popover.isOpen('audioReactive')" />
    <TextAudioReactivePopover v-if="popover.isOpen('textAudioReactive')" />
    <ShapesPopover v-if="popover.isOpen('shapes')" />
    <CanvasFormatPopover v-if="popover.isOpen('canvasFormat')" />
    <ScreenshotPopover v-if="popover.isOpen('screenshot')" />
    <VisualizerPopover v-if="popover.isOpen('visualizer')" />
    <VisualizerControlsPopover v-if="popover.isOpen('visualizerControls')" />
    <MultiLayerPopover v-if="popover.isOpen('multiLayer')" />
    <EffectsPopover v-if="popover.isOpen('effects')" />
    <CanvasControlPopover v-if="popover.isOpen('canvasControl')" />
    <VideoPopover v-if="popover.isOpen('video')" />
    <RecorderPopover v-if="popover.isOpen('recorder')" />

    <!-- ══════════════ THE BAR ══════════════ -->
    <PlayerBarControls />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { usePlayerPopover, isOutsidePopoverClick } from '../composables/usePlayerPopover'
import { usePlayerVolumeEq } from '../composables/usePlayerVolumeEq'
import { usePlayMode } from '../composables/usePlayMode'
import { useAudioSourceControls } from '../composables/useAudioSourceControls'
import { useBeatMarkers } from '../composables/useBeatMarkers'
import { usePlaylistManager } from '../composables/usePlaylistManager'
import { useBgSettings } from '../composables/useBgSettings'
import { useVideoPanel } from '../composables/useVideoPanel'
import TextManagerPopover from './sticky-player-bar/TextManagerPopover.vue'
import PlayerBarControls from './sticky-player-bar/PlayerBarControls.vue'
import SlideshowPopover from './sticky-player-bar/SlideshowPopover.vue'
import { SLIDESHOW_EDIT_EVENT } from '../lib/slideshowEditRequest'
import { SHAPES_OPEN_EVENT } from '../lib/shapes/shapeInteraction'
import type { PlayerBarContext } from './sticky-player-bar/playerBarContext'

// Popover, die nur bei Bedarf (v-if) gerendert werden, liegen in eigenen
// Chunks: ihr JS und CSS gehört nicht in den kritischen Ladepfad von /app.
// Bei der ersten Interaktion mit der Seite (Zeiger, Tastatur, Fokus) werden
// sie vorgeladen, damit das erste Öffnen nicht auf das Netz wartet. Erst dann,
// weil das Auswerten der Chunks samt CSS sonst den Seitenstart belastet.
const popoverLoaders = {
  AudioSourcePopover: () => import('./sticky-player-bar/AudioSourcePopover.vue'),
  VolumeEqPopover: () => import('./sticky-player-bar/VolumeEqPopover.vue'),
  BeatMarkerPopover: () => import('./sticky-player-bar/BeatMarkerPopover.vue'),
  PlaylistPopover: () => import('./sticky-player-bar/PlaylistPopover.vue'),
  GalleryPopover: () => import('./sticky-player-bar/GalleryPopover.vue'),
  PresetsPopover: () => import('./sticky-player-bar/PresetsPopover.vue'),
  AudioReactivePopover: () => import('./sticky-player-bar/AudioReactivePopover.vue'),
  TextAudioReactivePopover: () => import('./sticky-player-bar/TextAudioReactivePopover.vue'),
  ShapesPopover: () => import('./sticky-player-bar/ShapesPopover.vue'),
  CanvasFormatPopover: () => import('./sticky-player-bar/CanvasFormatPopover.vue'),
  ScreenshotPopover: () => import('./sticky-player-bar/ScreenshotPopover.vue'),
  VisualizerPopover: () => import('./sticky-player-bar/VisualizerPopover.vue'),
  VisualizerControlsPopover: () => import('./sticky-player-bar/VisualizerControlsPopover.vue'),
  MultiLayerPopover: () => import('./sticky-player-bar/MultiLayerPopover.vue'),
  EffectsPopover: () => import('./sticky-player-bar/EffectsPopover.vue'),
  CanvasControlPopover: () => import('./sticky-player-bar/CanvasControlPopover.vue'),
  VideoPopover: () => import('./sticky-player-bar/VideoPopover.vue'),
  RecorderPopover: () => import('./sticky-player-bar/RecorderPopover.vue'),
}
const AudioSourcePopover = defineAsyncComponent(popoverLoaders.AudioSourcePopover)
const VolumeEqPopover = defineAsyncComponent(popoverLoaders.VolumeEqPopover)
const BeatMarkerPopover = defineAsyncComponent(popoverLoaders.BeatMarkerPopover)
const PlaylistPopover = defineAsyncComponent(popoverLoaders.PlaylistPopover)
const GalleryPopover = defineAsyncComponent(popoverLoaders.GalleryPopover)
const PresetsPopover = defineAsyncComponent(popoverLoaders.PresetsPopover)
const AudioReactivePopover = defineAsyncComponent(popoverLoaders.AudioReactivePopover)
const TextAudioReactivePopover = defineAsyncComponent(popoverLoaders.TextAudioReactivePopover)
const ShapesPopover = defineAsyncComponent(popoverLoaders.ShapesPopover)
const CanvasFormatPopover = defineAsyncComponent(popoverLoaders.CanvasFormatPopover)
const ScreenshotPopover = defineAsyncComponent(popoverLoaders.ScreenshotPopover)
const VisualizerPopover = defineAsyncComponent(popoverLoaders.VisualizerPopover)
const VisualizerControlsPopover = defineAsyncComponent(popoverLoaders.VisualizerControlsPopover)
const MultiLayerPopover = defineAsyncComponent(popoverLoaders.MultiLayerPopover)
const EffectsPopover = defineAsyncComponent(popoverLoaders.EffectsPopover)
const CanvasControlPopover = defineAsyncComponent(popoverLoaders.CanvasControlPopover)
const VideoPopover = defineAsyncComponent(popoverLoaders.VideoPopover)
const RecorderPopover = defineAsyncComponent(popoverLoaders.RecorderPopover)

const PREFETCH_EVENTS = ['pointerover', 'pointerdown', 'keydown', 'focusin', 'touchstart'] as const
let popoversPrefetched = false

function prefetchPopovers() {
  if (popoversPrefetched) return
  popoversPrefetched = true
  removePrefetchListeners()
  for (const load of Object.values(popoverLoaders)) {
    load().catch((error: unknown) =>
      console.warn('[StickyPlayerBar] Popover-Vorladen fehlgeschlagen:', error),
    )
  }
}

function removePrefetchListeners() {
  for (const type of PREFETCH_EVENTS) document.removeEventListener(type, prefetchPopovers, true)
}

const barRef = ref<HTMLElement | null>(null)

// The bar owns all shared state via composables (so watchers and DOM listeners
// register exactly once) and hands it to the child popovers/controls through a
// single `provide` context.
const popover = usePlayerPopover()
const volumeEq = usePlayerVolumeEq()
const playMode = usePlayMode()
const audioSource = useAudioSourceControls()
// Video-Zustand vor den Markern anlegen: Marker können hochgeladene Videos
// als Hintergrund aktivieren oder mit den Platzierungs-Einstellungen des
// Video-Panels auf den Canvas legen („Video auf Canvas“).
const videoPanel = useVideoPanel()
const markers = useBeatMarkers(() => popover.openPopover('markers'), {
  videoGallery: videoPanel.videoGallery,
  canvasVideoPlacement: {
    place: (entry, options) =>
      videoPanel.placeVideoOnCanvas(
        videoPanel.videoGallery.value.find((v) => v.id === entry.id),
        options,
      ),
    loop: videoPanel.videoLoop,
    connectAudio: videoPanel.connectVideoAudioForRecording,
  },
})
const playlist = usePlaylistManager()

// Hintergrund-/Canvas-Zustand hier erzeugen, nicht im Panel: die Leiste ist
// immer gemountet, das Canvas-Steuerung-Popover dagegen nur bei Bedarf. So
// überleben Undo-Verlauf, Gradient- und Audio-Reaktiv-Einstellungen sowie die
// bei Beat-Markern genutzte Hintergrund-Bridge das Schließen des Popovers.
provide('bgSettings', useBgSettings())

// Ebenso der Video-Zustand: die hochgeladene Video-Liste und die
// Platzierungs-Einstellungen sollen das Schließen des Popovers überleben.
provide('videoPanel', videoPanel)

provide('playerBar', {
  popover,
  volumeEq,
  playMode,
  audioSource,
  markers,
  playlist,
} satisfies PlayerBarContext)

// Tippen auf dem Canvas legt sofort einen Text an (TextManagerPanel reagiert
// auf dieses Ereignis). Da der Text-Manager jetzt im Popover sitzt, wird es
// dabei geöffnet, damit der Editor wie zuvor direkt sichtbar ist.
const openTextManager = () => popover.openPopover('textManager')
// Klick auf ein Bild der pausierten Slideshow öffnet dessen Einstellungen im
// Slideshow-Fenster – das Fenster dafür öffnen.
const openSlideshow = () => popover.openPopover('slideshow')
// Klick auf eine Form im Canvas öffnet die Formen-Galerie zum Bearbeiten.
const openShapes = () => popover.openPopover('shapes')
// Klick daneben: blendet alle offenen Fenster aus, die Funktionen bleiben in
// der Leiste aktiv (erneuter Klick dort öffnet sie wieder).
const onDocumentPointerDown = (event: PointerEvent) => {
  if (!popover.openPopovers.value.length) return
  if (isOutsidePopoverClick(event.target, barRef.value)) popover.hideAllPopovers()
}
onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  window.addEventListener(SHAPES_OPEN_EVENT, openShapes)
  window.addEventListener('openTextEditorWithChar', openTextManager)
  window.addEventListener(SLIDESHOW_EDIT_EVENT, openSlideshow)
  if (!popoversPrefetched) {
    for (const type of PREFETCH_EVENTS) {
      document.addEventListener(type, prefetchPopovers, { capture: true, passive: true })
    }
  }
})
onUnmounted(() => {
  removePrefetchListeners()
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener(SHAPES_OPEN_EVENT, openShapes)
  window.removeEventListener('openTextEditorWithChar', openTextManager)
  window.removeEventListener(SLIDESHOW_EDIT_EVENT, openSlideshow)
})
</script>

<style scoped>
.sticky-player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--ds-z-player);
}
</style>

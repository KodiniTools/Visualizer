<template>
  <div class="panel-section">
    <h4>{{ t('canvasControl.backgroundColor') }}</h4>

    <BackgroundBaseColor />
    <BackgroundGradient />
    <BackgroundAudioReactive />

    <!-- Kachel-Hintergrund Panel -->
    <BackgroundTilesPanel />

    <BackgroundFlipControls />
    <BackgroundThumbnails />
  </div>

  <!-- Modal zum Ersetzen des Hintergrundbildes (Teleport to body) -->
  <BackgroundReplaceModal />
</template>

<script setup>
import { useI18n } from '../../lib/i18n.js'
import BackgroundTilesPanel from '../BackgroundTilesPanel.vue'
import BackgroundBaseColor from './background/BackgroundBaseColor.vue'
import BackgroundGradient from './background/BackgroundGradient.vue'
import BackgroundAudioReactive from './background/BackgroundAudioReactive.vue'
import BackgroundFlipControls from './background/BackgroundFlipControls.vue'
import BackgroundThumbnails from './background/BackgroundThumbnails.vue'
import BackgroundReplaceModal from './background/BackgroundReplaceModal.vue'

const { t } = useI18n()
</script>

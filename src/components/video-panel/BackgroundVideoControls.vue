<template>
  <!-- Hintergrund-Video-Steuerung -->
  <div v-if="hasVideoBackground" class="background-video-section">
    <h4>{{ t('videoPanel.bgVideoTitle') }}</h4>

    <!-- Globaler Video-Hintergrund -->
    <BackgroundVideoItem
      v-if="videoBackground"
      :label="t('videoPanel.bgLabel')"
      :video="videoBackground"
      :playing="isVideoBackgroundPlaying"
      :time="videoBackgroundTime"
      :duration="videoBackgroundDuration"
      :volume="videoBackgroundVolume"
      :format-time="formatTime"
      @toggle="toggleVideoBackground"
      @seek-back="seekBackwardBg"
      @seek-forward="seekForwardBg"
      @remove="removeVideoBackground"
      @seek="seekVideoBackground"
      @volume="updateBgVideoVolume"
    />

    <!-- Workspace Video-Hintergrund -->
    <BackgroundVideoItem
      v-if="workspaceVideoBackground"
      :label="t('videoPanel.wsBgLabel')"
      :video="workspaceVideoBackground"
      :playing="isWsVideoBackgroundPlaying"
      :time="wsVideoBackgroundTime"
      :duration="wsVideoBackgroundDuration"
      :volume="wsVideoBackgroundVolume"
      :format-time="formatTime"
      workspace
      @toggle="toggleWsVideoBackground"
      @seek-back="seekBackwardWsBg"
      @seek-forward="seekForwardWsBg"
      @remove="removeWsVideoBackground"
      @seek="seekWsVideoBackground"
      @volume="updateWsBgVideoVolume"
    />
  </div>
</template>

<script setup>
import BackgroundVideoItem from './BackgroundVideoItem.vue'
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()

const {
  hasVideoBackground,
  videoBackground,
  workspaceVideoBackground,
  isVideoBackgroundPlaying,
  isWsVideoBackgroundPlaying,
  videoBackgroundTime,
  videoBackgroundDuration,
  wsVideoBackgroundTime,
  wsVideoBackgroundDuration,
  videoBackgroundVolume,
  wsVideoBackgroundVolume,
  toggleVideoBackground,
  toggleWsVideoBackground,
  seekVideoBackground,
  seekBackwardBg,
  seekForwardBg,
  seekWsVideoBackground,
  seekBackwardWsBg,
  seekForwardWsBg,
  updateBgVideoVolume,
  updateWsBgVideoVolume,
  removeVideoBackground,
  removeWsVideoBackground,
  formatTime,
} = inject('videoPanel')
</script>

<style scoped>
.background-video-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  margin-top: var(--ds-space-4);
  padding-top: var(--ds-space-4);
  border-top: var(--ds-border-width) solid var(--ds-border);
}

.background-video-section h4 {
  margin: 0;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}
</style>

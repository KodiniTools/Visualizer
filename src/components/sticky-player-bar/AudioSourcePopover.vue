<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-audio">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.audioSource') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="source-toggle">
      <button
        class="source-btn"
        :class="{ active: audioSourceStore.isPlayerSource }"
        :title="t('player.playerSource')"
        @click="selectSource('player')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
          />
        </svg>
        <span>{{ t('player.player') }}</span>
      </button>
      <button
        class="source-btn"
        :class="{
          active: audioSourceStore.isMicrophoneSource,
          listening: audioSourceStore.isMicrophoneActive,
        }"
        :title="t('player.microphoneSource')"
        @click="selectSource('microphone')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
          />
        </svg>
        <span>{{ t('player.microphone') }}</span>
      </button>
    </div>

    <div v-if="audioSourceStore.isMicrophoneSource" class="mic-status">
      <div v-if="audioSourceStore.isMicrophoneActive" class="mic-active">
        <span class="mic-indicator"></span>
        <span>{{ t('player.microphoneListening') }}</span>
      </div>
      <div v-else-if="audioSourceStore.errorMessage" class="mic-error">
        {{ audioSourceStore.errorMessage }}
      </div>
    </div>

    <div
      v-if="audioSourceStore.isMicrophoneSource && audioSourceStore.audioInputDevices.length > 1"
      class="device-selector"
    >
      <label>{{ t('player.selectDevice') }}:</label>
      <select v-model="selectedDevice" class="device-select" @change="changeDevice">
        <option
          v-for="device in audioSourceStore.audioInputDevices"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useAudioSourceStore } from '../../stores/audioSourceStore.js'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()
const audioSourceStore = useAudioSourceStore()

const { popover, audioSource } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('audio')
const initOffset = cascadeOffset('audio')
const { selectedDevice, selectSource, changeDevice } = audioSource
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.source-toggle {
  display: flex;
  gap: 8px;
}
.source-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--ds-text-xs);
  transition: all var(--ds-duration) var(--ds-ease);
}
.source-btn svg {
  width: 18px;
  height: 18px;
}
.source-btn:hover {
  background-color: var(--btn-hover);
  color: var(--text-primary);
}
.source-btn.active {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--accent-text);
}
.source-btn.listening {
  border-color: var(--ds-success);
}
.mic-status {
  font-size: var(--ds-text-xs);
}
.mic-active {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ds-success);
}
.mic-indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-success);
  animation: recPulse 1s infinite;
}
.mic-error {
  color: var(--ds-danger);
}
.device-selector {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}
.device-select {
  padding: 5px 6px;
  font-size: var(--ds-text-xs);
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
}
@keyframes recPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>

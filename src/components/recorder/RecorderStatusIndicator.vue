<template>
  <div class="status-indicator" :class="state">
    <div class="status-dot"></div>
    <span class="status-text">{{ t(`recorder.status.${state}`) }}</span>
    <span
      v-if="recorderStore.isRecording"
      class="recording-timer"
      :class="{ paused: recorderStore.isPaused }"
    >
      {{ displayTime }}
    </span>
  </div>
</template>

<script setup>
// Statuszeile des Recorders: Zustand (processing > paused > recording > ready > idle)
// und Laufzeit während der Aufnahme.
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useRecorderStore } from '../../stores/recorderStore.js'

defineProps({
  displayTime: { type: String, default: '00:00' },
})

const { t } = useI18n()
const recorderStore = useRecorderStore()

const state = computed(() => {
  if (recorderStore.statusType === 'processing') return 'processing'
  if (recorderStore.isPaused) return 'paused'
  if (recorderStore.isRecording) return 'recording'
  if (recorderStore.isPrepared) return 'ready'
  return 'idle'
})
</script>

<style scoped>
.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-accent-soft);
  border: 1px solid var(--border-color);
  transition: all var(--ds-duration-slow) var(--ds-ease);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--ds-radius-full);
  background: var(--text-muted);
  animation: pulse 2s infinite;
}

.status-text {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.4px;
  color: var(--text-muted);
}

.recording-timer {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  font-family: var(--ds-font-mono);
  color: var(--ds-danger);
  margin-left: auto;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--ds-danger) 15%, transparent);
  border-radius: var(--ds-radius-sm);
  letter-spacing: 1px;
  min-width: 50px;
  text-align: center;
}

.recording-timer.paused {
  color: var(--ds-warning);
  background: color-mix(in srgb, var(--ds-warning) 15%, transparent);
  animation: timerBlink 1s ease-in-out infinite;
}

@keyframes timerBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-indicator.idle .status-dot {
  background: var(--ds-surface-3);
  animation: none;
}

.status-indicator.processing {
  background-color: color-mix(in srgb, var(--ds-warning) 15%, transparent);
  border-color: color-mix(in srgb, var(--ds-warning) 40%, transparent);
}

.status-indicator.processing .status-dot {
  background-color: var(--ds-warning);
  animation: processingPulse 1.5s ease-in-out infinite;
}

@keyframes processingPulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
}

.status-indicator.ready {
  background: color-mix(in srgb, var(--ds-success) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-success) 30%, transparent);
}

.status-indicator.ready .status-dot {
  background: var(--ds-success);
}

.status-indicator.ready .status-text {
  color: var(--ds-success);
}

.status-indicator.recording {
  background: color-mix(in srgb, var(--ds-danger) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 30%, transparent);
}

.status-indicator.recording .status-dot {
  background: var(--ds-danger);
}

.status-indicator.recording .status-text {
  color: var(--ds-danger);
}

.status-indicator.paused {
  background: color-mix(in srgb, var(--ds-warning) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-warning) 30%, transparent);
}

.status-indicator.paused .status-dot {
  background: var(--ds-warning);
  animation: none;
}

.status-indicator.paused .status-text {
  color: var(--ds-warning);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

[data-theme='light'] .status-indicator {
  background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .recording-timer {
  background: color-mix(in srgb, var(--ds-danger) 10%, transparent);
}

[data-theme='light'] .recording-timer.paused {
  background: color-mix(in srgb, var(--ds-warning) 10%, transparent);
}

[data-theme='light'] .status-indicator.processing {
  background-color: color-mix(in srgb, var(--ds-warning) 10%, transparent);
}

[data-theme='light'] .status-indicator.ready {
  background: color-mix(in srgb, var(--ds-success) 8%, transparent);
}

[data-theme='light'] .status-indicator.recording {
  background: color-mix(in srgb, var(--ds-danger) 8%, transparent);
}

[data-theme='light'] .status-indicator.paused {
  background: color-mix(in srgb, var(--ds-warning) 8%, transparent);
}
</style>

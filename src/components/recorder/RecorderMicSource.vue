<template>
  <div class="control-section audio-source-section">
    <div class="section-header">
      <span class="section-label">{{ t('recorder.audioSource') }}</span>
      <span class="source-indicator active">
        🎵 Player {{ microphoneEnabled ? '+ 🎤 Mic' : '' }}
      </span>
    </div>
    <label class="mic-toggle-row">
      <input
        v-model="microphoneEnabled"
        type="checkbox"
        :disabled="isSwitchingSource"
        @change="toggleMicrophone"
      />
      <span class="toggle-label">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        {{ t('recorder.addMicrophone') }}
      </span>
    </label>
    <p v-if="isSwitchingSource" class="source-hint">{{ t('recorder.activatingMicrophone') }}</p>
    <p v-else-if="microphoneEnabled" class="source-hint info">{{ t('recorder.micOnlyHint') }}</p>
  </div>
</template>

<script setup>
// Mikrofon zur laufenden Aufnahme zuschalten. Das Panel zeigt diesen Abschnitt
// nur während der Aufnahme; der Zustand beginnt daher bei jeder Aufnahme bei „aus“.
import { useI18n } from '../../lib/i18n.js'
import { useMicrophoneToggle } from '../../composables/useMicrophoneToggle.js'

const { t } = useI18n()
const { microphoneEnabled, isSwitchingSource, toggleMicrophone } = useMicrophoneToggle()
</script>

<style scoped src="./recorder-section.css"></style>

<style scoped>
.audio-source-section {
  background: color-mix(in srgb, var(--ds-link) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-radius: var(--ds-radius-sm);
  padding: 8px 10px;
}

.source-indicator {
  font-size: var(--ds-text-xs);
  padding: 2px 6px;
  border-radius: var(--ds-radius-sm);
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
  color: var(--ds-success);
}

.mic-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 10px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  transition: all var(--ds-duration) var(--ds-ease);
}

.mic-toggle-row:hover {
  background: var(--btn-hover);
  border-color: color-mix(in srgb, var(--ds-link) 30%, transparent);
}

.mic-toggle-row input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--ds-link);
  cursor: pointer;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
  font-weight: var(--ds-weight-medium);
}

.toggle-label .icon {
  width: 16px;
  height: 16px;
  color: var(--ds-link);
}

.source-hint {
  margin: 6px 0 0 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-link);
  text-align: center;
  animation: pulse 1s ease-in-out infinite;
}

.source-hint.info {
  color: var(--ds-warning);
  animation: none;
  background: color-mix(in srgb, var(--ds-warning) 10%, transparent);
  padding: 4px 8px;
  border-radius: var(--ds-radius-sm);
}

[data-theme='light'] .audio-source-section {
  background: color-mix(in srgb, var(--ds-link) 5%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 15%, transparent);
}

[data-theme='light'] .source-indicator {
  background: color-mix(in srgb, var(--ds-success) 12%, transparent);
}

[data-theme='light'] .mic-toggle-row {
  background: rgba(0, 0, 0, 0.03);
  border-color: var(--ds-border);
}

[data-theme='light'] .mic-toggle-row:hover {
  background: rgba(0, 0, 0, 0.06);
}

[data-theme='light'] .mic-toggle-row input[type='checkbox'] {
  accent-color: var(--accent-primary);
}

[data-theme='light'] .source-hint.info {
  background: color-mix(in srgb, var(--ds-warning) 8%, transparent);
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
</style>

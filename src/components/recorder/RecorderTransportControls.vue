<template>
  <div class="recorder-controls">
    <button
      v-if="!recorderStore.isPrepared && !recorderStore.isRecording"
      class="btn btn-prepare"
      :disabled="disabled"
      @click="emit('prepare')"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8M12 8v8" />
      </svg>
      {{ t('recorder.prepare') }}
    </button>

    <button
      v-if="recorderStore.isPrepared && !recorderStore.isRecording"
      class="btn btn-start"
      :disabled="disabled"
      @click="emit('start')"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="8" />
      </svg>
      {{ t('recorder.start') }}
    </button>

    <button
      v-if="recorderStore.isRecording && !recorderStore.isPaused"
      class="btn btn-pause"
      :disabled="disabled"
      @click="emit('pause')"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
      {{ t('recorder.pause') }}
    </button>

    <button
      v-if="recorderStore.isRecording && recorderStore.isPaused"
      class="btn btn-resume"
      :disabled="disabled"
      @click="emit('resume')"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
      {{ t('recorder.resume') }}
    </button>

    <button
      v-if="recorderStore.isRecording"
      class="btn btn-stop"
      :disabled="disabled"
      @click="emit('stop')"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
      {{ t('recorder.stop') }}
    </button>

    <button
      v-if="recorderStore.isPrepared && !recorderStore.isRecording"
      class="btn btn-reset"
      :disabled="disabled"
      @click="emit('reset')"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      {{ t('recorder.reset') }}
    </button>
  </div>
</template>

<script setup>
// Steuerknöpfe des Recorders. Welche Knöpfe sichtbar sind, folgt dem Store;
// die Aktionen selbst führt das RecorderPanel aus.
import { useI18n } from '../../lib/i18n.js'
import { useRecorderStore } from '../../stores/recorderStore.js'

defineProps({
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['prepare', 'start', 'pause', 'resume', 'stop', 'reset'])
const { t } = useI18n()
const recorderStore = useRecorderStore()
</script>

<style scoped src="./recorder-buttons.css"></style>

<style scoped>
.recorder-controls {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.btn-prepare {
  background: var(--ds-accent-soft);
  color: var(--accent-tertiary);
  border: 1px solid var(--ds-border);
}

.btn-prepare:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
}

.btn-start {
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
  color: var(--ds-success);
  border: 1px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
}

.btn-start:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-success) 30%, transparent);
}

.btn-pause {
  background: color-mix(in srgb, var(--ds-warning) 20%, transparent);
  color: var(--ds-warning);
  border: 1px solid color-mix(in srgb, var(--ds-warning) 30%, transparent);
}

.btn-pause:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-warning) 30%, transparent);
}

.btn-resume {
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  color: var(--ds-link);
  border: 1px solid color-mix(in srgb, var(--ds-link) 30%, transparent);
}

.btn-resume:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
}

.btn-stop {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  color: var(--ds-danger);
  border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
}

.btn-stop:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-danger) 30%, transparent);
}

.btn-reset {
  background: var(--ds-surface-3);
  color: var(--ds-text-2);
  border: 1px solid var(--ds-border-strong);
}

.btn-reset:hover:not(:disabled) {
  background: var(--ds-surface-3);
}

[data-theme='light'] .btn-prepare {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  color: var(--accent-ink);
  border-color: var(--border-color);
}

[data-theme='light'] .btn-prepare:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

[data-theme='light'] .btn-start {
  background: color-mix(in srgb, var(--ds-success) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-success) 25%, transparent);
}

[data-theme='light'] .btn-start:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
}

[data-theme='light'] .btn-pause {
  background: color-mix(in srgb, var(--ds-warning) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-warning) 25%, transparent);
}

[data-theme='light'] .btn-pause:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-warning) 20%, transparent);
}

[data-theme='light'] .btn-resume {
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 25%, transparent);
}

[data-theme='light'] .btn-resume:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
}

[data-theme='light'] .btn-stop {
  background: color-mix(in srgb, var(--ds-danger) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 25%, transparent);
}

[data-theme='light'] .btn-stop:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
}

[data-theme='light'] .btn-reset {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ds-text-3);
  border-color: var(--ds-border);
}

[data-theme='light'] .btn-reset:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .recorder-controls {
    flex-direction: column;
  }
}
</style>

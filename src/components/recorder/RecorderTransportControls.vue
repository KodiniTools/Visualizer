<template>
  <div class="recorder-controls">
    <UiButton
      v-for="action in actions"
      :key="action.id"
      :class="['btn', `btn-${action.id}`]"
      :variant="action.variant"
      size="sm"
      :disabled="disabled"
      @click="emit(action.id)"
    >
      <template #icon>
        <svg
          v-if="action.id === 'prepare'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8M12 8v8" />
        </svg>
        <svg v-else-if="action.id === 'start'" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" />
        </svg>
        <svg v-else-if="action.id === 'pause'" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
        <svg v-else-if="action.id === 'resume'" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else-if="action.id === 'stop'" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </template>
      {{ t(`recorder.${action.id}`) }}
    </UiButton>
  </div>
</template>

<script setup>
// Steuerknöpfe des Recorders. Welche Knöpfe sichtbar sind, folgt dem Store;
// die Aktionen selbst führt das RecorderPanel aus. Die Klassen btn-<aktion>
// bleiben als Anker für Tests und das Panel.
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useRecorderStore } from '../../stores/recorderStore'
import { UiButton } from '../ui'

defineProps({
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['prepare', 'start', 'pause', 'resume', 'stop', 'reset'])
const { t } = useI18n()
const recorderStore = useRecorderStore()

/** Sichtbare Aktionen je Zustand, in Anzeige-Reihenfolge. */
const actions = computed(() => {
  const { isPrepared, isRecording, isPaused } = recorderStore
  if (isRecording) {
    return [
      isPaused ? { id: 'resume', variant: 'primary' } : { id: 'pause', variant: 'secondary' },
      { id: 'stop', variant: 'danger' },
    ]
  }
  if (isPrepared) {
    return [
      { id: 'start', variant: 'primary' },
      { id: 'reset', variant: 'ghost' },
    ]
  }
  return [{ id: 'prepare', variant: 'primary' }]
})
</script>

<style scoped>
.recorder-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1);
}

.recorder-controls > * {
  flex: 1 1 0;
  min-width: 70px;
}

@media (max-width: 768px) {
  .recorder-controls {
    flex-direction: column;
  }
}
</style>

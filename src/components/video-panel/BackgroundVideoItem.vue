<template>
  <section :class="['bg-video-item', { workspace }]" :aria-label="label">
    <header class="bg-video-header">
      <span class="bg-video-label">{{ label }}</span>
      <span :class="['bg-video-status', { playing }]">
        {{ playing ? t('videoPanel.playing') : t('videoPanel.paused') }}
      </span>
    </header>

    <div class="bg-video-controls">
      <UiIconButton
        :label="playing ? t('videoPanel.pause') : t('videoPanel.play')"
        variant="primary"
        size="sm"
        @click="emit('toggle')"
      >
        <svg v-if="playing" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"
          />
        </svg>
      </UiIconButton>
      <UiIconButton
        :label="t('videoPanel.seekBack5')"
        variant="secondary"
        size="sm"
        @click="emit('seek-back', 5)"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 6v12l-8.5-6L11 6zm9.5 0v12L12 12l8.5-6z" />
        </svg>
      </UiIconButton>
      <UiIconButton
        :label="t('videoPanel.seekForward5')"
        variant="secondary"
        size="sm"
        @click="emit('seek-forward', 5)"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 6v12l8.5-6L13 6zM3.5 6v12L12 12 3.5 6z" />
        </svg>
      </UiIconButton>
      <UiIconButton
        :label="t('common.remove')"
        size="sm"
        class="bg-video-remove"
        @click="emit('remove')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
        </svg>
      </UiIconButton>
    </div>

    <div class="bg-video-seek">
      <span class="seek-time">{{ formatTime(time) }}</span>
      <SliderField
        :model-value="time"
        :min="0"
        :max="duration"
        :step="0.1"
        :default-value="0"
        class="seek-slider"
        @update:model-value="emit('seek', $event)"
      />
      <span class="seek-time">{{ formatTime(duration) }}</span>
    </div>

    <SliderControl
      :label="t('videoPanel.volume')"
      :model-value="volume"
      :min="0"
      :max="1"
      :step="0.01"
      :default-value="1"
      :value-text="`${Math.round(volume * 100)}%`"
      @update:model-value="emit('volume', $event)"
    />

    <!-- Audio-Reaktiv: identische Einstellungen wie bei Bildern -->
    <VideoAudioReactive :video="video" :label="label" />
  </section>
</template>

<script setup>
import { useI18n } from '../../lib/i18n.js'
import SliderControl from '../ui/SliderControl.vue'
import SliderField from '../ui/SliderField.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import VideoAudioReactive from './VideoAudioReactive.vue'

/**
 * Ein Hintergrund-Video (normal oder Workspace) mit Abspielen, Spulen,
 * Entfernen, Zeit, Lautstärke und Audio-Reaktiv. Rein darstellend:
 * Aktionen gehen als Events an BackgroundVideoControls.
 */
defineProps({
  label: { type: String, required: true },
  video: { type: Object, required: true },
  playing: { type: Boolean, default: false },
  time: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  volume: { type: Number, default: 1 },
  /** Workspace-Hintergrund: andere Akzentfarbe */
  workspace: { type: Boolean, default: false },
  formatTime: { type: Function, required: true },
})

const emit = defineEmits(['toggle', 'seek-back', 'seek-forward', 'remove', 'seek', 'volume'])

const { t } = useI18n()
</script>

<style scoped>
.bg-video-item {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-left: 3px solid var(--ds-link);
  border-radius: var(--ds-radius-md);
}

.bg-video-item.workspace {
  border-left-color: var(--ds-warning);
}

.bg-video-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
}

.bg-video-label {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.bg-video-status {
  padding: 0 var(--ds-space-2);
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-full);
}

.bg-video-status.playing {
  color: var(--ds-on-success);
  background: var(--ds-success);
  border-color: var(--ds-success);
}

.bg-video-controls {
  display: flex;
  align-items: center;
  gap: var(--ds-space-1);
}

.bg-video-controls svg {
  width: 14px;
  height: 14px;
}

.bg-video-remove {
  margin-left: auto;
}

.bg-video-remove:hover,
.bg-video-remove:focus-visible {
  color: var(--ds-danger);
}

.bg-video-seek {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.seek-slider {
  flex: 1;
  min-width: 0;
}

.seek-time {
  min-width: 32px;
  font-family: var(--ds-font-mono);
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
}
</style>

<!-- Spur und Daumen des Zeit-Reglers wie bei allen Standard-Reglern -->
<style scoped src="../ui/slider-control.css"></style>

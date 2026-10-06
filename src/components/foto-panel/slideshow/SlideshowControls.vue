<template>
  <div>
    <!-- Action Buttons -->
    <div class="action-buttons">
      <button v-if="!isActive" class="btn-start" :disabled="!canStart" @click="emit('start')">
        {{ t('slideshow.start') }}
      </button>

      <template v-else>
        <button v-if="!isPaused" class="btn-pause" @click="emit('pause')">
          {{ t('slideshow.pause') }}
        </button>
        <button v-else class="btn-resume" @click="emit('resume')">
          {{ t('slideshow.resume') }}
        </button>
        <button class="btn-stop" @click="emit('stop')">
          {{ t('slideshow.stop') }}
        </button>
      </template>
    </div>

    <!-- Progress Indicator -->
    <div v-if="isActive" class="progress-section">
      <div class="progress-info">
        <span>{{ t('slideshow.image') }} {{ currentImageIndex + 1 }} / {{ totalImages }}</span>
        <span class="phase-indicator" :class="currentPhase">{{ phaseLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/** Start/Pause/Fortsetzen/Stopp und Fortschrittsanzeige der Slideshow. */
import { computed } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const props = defineProps({
  isActive: { type: Boolean, default: false },
  // Start erst ab 2 Bildern möglich
  canStart: { type: Boolean, default: true },
  isPaused: { type: Boolean, default: false },
  currentImageIndex: { type: Number, default: 0 },
  totalImages: { type: Number, default: 0 },
  currentPhase: { type: String, default: 'fadeIn' },
})
const emit = defineEmits(['start', 'pause', 'resume', 'stop'])
const { t, locale } = useI18n()

const phaseLabel = computed(() => {
  switch (props.currentPhase) {
    case 'fadeIn':
      return locale.value === 'de' ? 'Einblenden' : 'Fading In'
    case 'display':
      return locale.value === 'de' ? 'Anzeige' : 'Displaying'
    case 'fadeOut':
      return locale.value === 'de' ? 'Ausblenden' : 'Fading Out'
    default:
      return ''
  }
})
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.action-buttons button {
  flex: 1;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.btn-start {
  background: var(--ds-link);
  color: #fff;
}
.btn-start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-start:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.4);
}
.btn-pause {
  background: var(--ds-warning);
  color: var(--text-primary);
}
.btn-pause:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(241, 196, 15, 0.4);
}
.btn-resume {
  background: var(--ds-success);
  color: #fff;
}
.btn-resume:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
}
.btn-stop {
  background: var(--ds-danger);
  color: #fff;
}
.btn-stop:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}
.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--text-muted);
}
.phase-indicator {
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 9px;
}
.phase-indicator.fadeIn {
  background-color: color-mix(in srgb, var(--ds-success) 20%, transparent);
  color: var(--ds-success);
}
.phase-indicator.display {
  background-color: color-mix(in srgb, var(--ds-link) 20%, transparent);
  color: var(--ds-link);
}
.phase-indicator.fadeOut {
  background-color: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  color: var(--ds-danger);
}
[data-theme='light'] .btn-start {
  background: var(--accent-primary);
  color: var(--accent-text);
}
[data-theme='light'] .btn-start:hover {
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-primary) 40%, transparent);
}
[data-theme='light'] .progress-section {
  border-top-color: var(--ds-border);
}
</style>

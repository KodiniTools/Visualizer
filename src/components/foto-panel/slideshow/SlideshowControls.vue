<template>
  <div>
    <!-- Action Buttons -->
    <div class="action-buttons">
      <button v-if="!isActive" class="btn-start" @click="emit('start')">
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
  background: linear-gradient(135deg, #6ea8fe 0%, #5a9af8 100%);
  color: #fff;
}
.btn-start:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.4);
}
.btn-pause {
  background: linear-gradient(135deg, #f1c40f 0%, #e2b70e 100%);
  color: var(--text-primary);
}
.btn-pause:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(241, 196, 15, 0.4);
}
.btn-resume {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: #fff;
}
.btn-resume:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
}
.btn-stop {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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
  background-color: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}
.phase-indicator.display {
  background-color: rgba(110, 168, 254, 0.2);
  color: #6ea8fe;
}
.phase-indicator.fadeOut {
  background-color: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}
[data-theme='light'] .btn-start {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  color: #f5f4d6;
}
[data-theme='light'] .btn-start:hover {
  box-shadow: 0 4px 12px rgba(1, 79, 153, 0.4);
}
[data-theme='light'] .btn-pause {
  color: #003971;
}
[data-theme='light'] .progress-section {
  border-top-color: #d4c8a8;
}
[data-theme='light'] .progress-info {
  color: #4d6d8e;
}
</style>

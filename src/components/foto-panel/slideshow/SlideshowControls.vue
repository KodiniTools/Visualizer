<template>
  <div>
    <!-- Aktionen; die btn-*-Klassen sind nur Test-Anker -->
    <div class="action-buttons">
      <UiButton
        v-if="!isActive"
        class="btn-start"
        variant="primary"
        block
        :disabled="!canStart"
        @click="emit('start')"
      >
        {{ t('slideshow.start') }}
      </UiButton>

      <template v-else>
        <UiButton v-if="!isPaused" class="btn-pause" block @click="emit('pause')">
          {{ t('slideshow.pause') }}
        </UiButton>
        <UiButton v-else class="btn-resume" block @click="emit('resume')">
          {{ t('slideshow.resume') }}
        </UiButton>
        <UiButton class="btn-stop" variant="danger" block @click="emit('stop')">
          {{ t('slideshow.stop') }}
        </UiButton>
      </template>
    </div>

    <!-- Fortschritt -->
    <div v-if="isActive" class="progress-section">
      <div class="progress-info">
        <span>{{ t('slideshow.image') }} {{ currentImageIndex + 1 }} / {{ totalImages }}</span>
        <span v-if="phaseLabel" class="phase-indicator" :class="currentPhase">{{
          phaseLabel
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/** Start/Pause/Fortsetzen/Stopp und Fortschrittsanzeige der Slideshow. */
import { computed } from 'vue'
import { useI18n } from '../../../lib/i18n'
import UiButton from '../../ui/UiButton.vue'

const PHASES = ['fadeIn', 'display', 'fadeOut']

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
const { t } = useI18n()

/** Übersetzte Phase; unbekannte Phasen bleiben leer. */
const phaseLabel = computed(() =>
  PHASES.includes(props.currentPhase) ? t(`slideshow.phases.${props.currentPhase}`) : '',
)
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
}
/* Phase wie der Status-Badge: neutraler Text, Farbe nur im Punkt, damit sie in
   beiden Themes lesbar bleibt. */
.phase-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  padding: 0 var(--ds-space-2);
  height: 20px;
  border-radius: var(--ds-radius-full);
  background-color: var(--ds-surface-2);
  color: var(--ds-text);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  font-size: var(--ds-text-xs);
}
.phase-indicator::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: var(--ds-radius-full);
  background-color: var(--ds-text-3);
  flex-shrink: 0;
}
.phase-indicator.fadeIn::before {
  background-color: var(--ds-success);
}
.phase-indicator.display::before {
  background-color: var(--ds-link);
}
.phase-indicator.fadeOut::before {
  background-color: var(--ds-danger);
}
.progress-section {
  margin-top: var(--ds-space-3);
  border-top-color: var(--ds-border);
}
</style>

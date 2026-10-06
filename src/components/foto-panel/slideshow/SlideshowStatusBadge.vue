<template>
  <!-- Status der Slideshow: Läuft / Pausiert / Bereit -->
  <div class="status-badge" :class="{ active: isActive, paused: isPaused }">
    <span v-if="isActive && !isPaused">{{ t('slideshow.running') }}</span>
    <span v-else-if="isPaused">{{ t('slideshow.paused') }}</span>
    <span v-else>{{ t('slideshow.ready') }}</span>
  </div>
</template>

<script setup>
/** Status-Anzeige der Slideshow (Panel-Kopf bzw. Kopfzeile des Sticky-Bar-Fensters). */
import { useI18n } from '../../../lib/i18n.js'

defineProps({
  isActive: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
})
const { t } = useI18n()
</script>

<style scoped>
/* Status als Punkt (ds-success / ds-warning), Text neutral: so bleibt der Badge
   in beiden Themes lesbar (im Light Theme erreicht Statusfarbe als Text auf
   getönter Fläche keine 4,5:1) und folgt dem v2-Muster „Status nur im Icon“. */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  padding: 0 var(--ds-space-2);
  height: 20px;
  border-radius: var(--ds-radius-full);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  background-color: var(--ds-surface-2);
  color: var(--ds-text-2);
}
.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: var(--ds-radius-full);
  background-color: var(--ds-text-3);
  flex-shrink: 0;
}
.status-badge.active {
  color: var(--ds-text);
}
.status-badge.active::before {
  background-color: var(--ds-success);
}
.status-badge.paused {
  color: var(--ds-text);
}
.status-badge.paused::before {
  background-color: var(--ds-warning);
}
</style>

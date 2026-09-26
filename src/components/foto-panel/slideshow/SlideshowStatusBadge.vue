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
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background-color: var(--secondary-bg);
  color: var(--text-muted);
}
.status-badge.active {
  background-color: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}
.status-badge.paused {
  background-color: rgba(241, 196, 15, 0.2);
  color: #f1c40f;
}
[data-theme='light'] .status-badge {
  background-color: #f0ead0;
  color: #4d6d8e;
}
/* Statusfarben auch im Hellmodus (dunklere Töne, Kontrast ≥ 5:1 auf hellem Grund) */
[data-theme='light'] .status-badge.active {
  background-color: rgba(22, 163, 74, 0.15);
  color: #166534;
}
[data-theme='light'] .status-badge.paused {
  background-color: rgba(234, 179, 8, 0.22);
  color: #854d0e;
}
</style>

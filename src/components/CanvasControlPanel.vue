<template>
  <div class="panel">
    <div class="panel-header" @click="isExpanded = !isExpanded">
      <h3>{{ t('canvasControl.title') }}</h3>
      <span class="chevron" :class="{ open: isExpanded }" aria-hidden="true"></span>
    </div>
    <div class="panel-content" v-show="isExpanded">
      <BackgroundColorSection />

      <div class="divider"></div>
      <PresetsSection />
      <div class="divider"></div>
      <ResetSection />
      <div class="divider"></div>
      <BeatDropSection />
      <div class="panel-section"><AudioFxPanel /></div>
    </div>
  </div>
</template>

<script setup>
import { ref, provide, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useBgSettings } from '../composables/useBgSettings.js'
import BackgroundColorSection from './canvas-control/BackgroundColorSection.vue'
import PresetsSection from './canvas-control/PresetsSection.vue'
import BeatDropSection from './canvas-control/BeatDropSection.vue'
import ResetSection from './canvas-control/ResetSection.vue'
import AudioFxPanel from './AudioFxPanel.vue'

const { t } = useI18n()
const isExpanded = ref(true)

// Der Hintergrund-Zustand (Farbe, Gradient, Audio-Reaktiv) und
// die Bridge für Beat-Marker leben in der Sticky-Player-Bar, die immer
// gemountet ist. So bleibt alles erhalten, während dieses Panel in seinem
// Popover geöffnet und geschlossen wird. Ohne bereitgestellten Zustand (z.B.
// im Test oder bei eigenständiger Nutzung) erzeugt das Panel ihn selbst.
const bg = inject('bgSettings', null) || useBgSettings()
provide('bgSettings', bg)
// Undo/Redo läuft global über die Player-Leiste bzw. Strg+Z / Strg+Y.
</script>

<style scoped>
.panel {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0;
  user-select: none;
  transition: all 0.2s;
}

.panel-header:hover h3 {
  color: var(--accent-tertiary);
}

.chevron {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid var(--accent-primary);
  border-bottom: 1.5px solid var(--accent-primary);
  transform: rotate(45deg);
  transition: transform 0.2s;
  display: inline-block;
  margin-left: 6px;
}

.chevron.open {
  transform: rotate(-135deg);
}

.panel-content {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h3 {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

h3::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M9 3v18M15 3v18M3 9h18M3 15h18'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.8));
}

h4 {
  margin: 0 0 5px 0;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.panel-section {
  margin-bottom: 8px;
}

.undo-section {
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 8px;
}

.btn-primary,
.btn-secondary,
.btn-danger,
.btn-undo {
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-undo {
  background: color-mix(in srgb, var(--ds-warning) 20%, transparent);
  color: var(--ds-warning);
  border: 1px solid color-mix(in srgb, var(--ds-warning) 30%, transparent);
}

.btn-undo:hover {
  background: color-mix(in srgb, var(--ds-warning) 30%, transparent);
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--ds-accent-soft);
  color: var(--accent-tertiary);
  border: 1px solid var(--ds-border);
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: var(--btn-hover);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.btn-danger {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  color: var(--ds-danger);
  border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
}

.btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-danger) 30%, transparent);
  transform: translateY(-1px);
}

.btn-danger:disabled {
  background-color: var(--secondary-bg);
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.5;
}

.full-width {
  width: 100%;
}

.divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 0;
}

.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted);
  font-style: italic;
}

.info-text {
  font-size: 0.55rem;
  color: var(--text-muted);
  line-height: 1.3;
  margin: 0 0 6px 0;
}

.info-text.warning {
  color: var(--ds-warning);
  font-weight: 500;
}

/* Light theme overrides */
[data-theme='light'] h3::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M9 3v18M15 3v18M3 9h18M3 15h18'/%3E%3C/svg%3E");
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.15));
}

[data-theme='light'] .btn-primary {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border: 1px solid var(--border-color);
  color: var(--accent-ink);
}

[data-theme='light'] .btn-primary:hover {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

[data-theme='light'] .btn-undo {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  color: var(--accent-ink);
  border-color: var(--border-color);
}

[data-theme='light'] .btn-undo:hover {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

[data-theme='light'] .info-text.warning {
  color: var(--accent-ink);
}

/* Responsive */
@media (max-width: 768px) {
  .panel {
    padding: 8px;
    gap: 8px;
  }

  h3 {
    font-size: 0.75rem;
  }

  h4 {
    font-size: 0.65rem;
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger,
  .btn-undo {
    padding: 8px 12px;
    font-size: 0.65rem;
    min-height: 40px;
  }
}

@media (max-width: 480px) {
  .btn-primary,
  .btn-secondary,
  .btn-danger,
  .btn-undo {
    min-height: 44px;
    font-size: 0.7rem;
  }
}
</style>

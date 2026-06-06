<template>
  <div class="panel">
    <div class="panel-header" @click="isExpanded = !isExpanded">
      <h3>{{ t('canvasControl.title') }}</h3>
      <span class="chevron" :class="{ open: isExpanded }">▼</span>
    </div>
    <div class="panel-content" v-show="isExpanded">
      <BackgroundColorSection />

      <!-- Undo -->
      <div v-if="canUndo" class="panel-section undo-section">
        <button @click="undoLastChange" class="btn-undo full-width">
          {{ t('canvasControl.undo') }}
        </button>
        <div class="hint-text" style="text-align: center; margin-top: 6px">
          {{ undoHistory.length }} {{ t('canvasControl.inHistory') }}
        </div>
      </div>

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
import { ref, provide } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useBgSettings } from '../composables/useBgSettings.js'
import BackgroundColorSection from './canvas-control/BackgroundColorSection.vue'
import PresetsSection from './canvas-control/PresetsSection.vue'
import BeatDropSection from './canvas-control/BeatDropSection.vue'
import ResetSection from './canvas-control/ResetSection.vue'
import AudioFxPanel from './AudioFxPanel.vue'

const { t } = useI18n()
const isExpanded = ref(true)
const bg = useBgSettings()
provide('bgSettings', bg)

const { undoHistory, canUndo, undoLastChange } = bg
</script>

<style scoped>
.panel {
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary, #e9e9eb);
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
  color: var(--accent-tertiary, #f8e1a9);
}

.chevron {
  font-size: 8px;
  color: var(--accent-primary, #c9984d);
  transition: transform 0.2s;
  display: inline-block;
  margin-left: 6px;
}

.chevron.open {
  transform: rotate(180deg);
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
  color: var(--text-primary, #e9e9eb);
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
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.panel-section {
  margin-bottom: 8px;
}

.undo-section {
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
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
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.btn-undo:hover {
  background: rgba(255, 152, 0, 0.3);
  transform: translateY(-1px);
}

.btn-primary {
  background: rgba(201, 152, 77, 0.2);
  color: var(--accent-tertiary, #f8e1a9);
  border: 1px solid rgba(201, 152, 77, 0.3);
}

.btn-primary:hover {
  background: rgba(201, 152, 77, 0.3);
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
}

.btn-secondary:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateY(-1px);
}

.btn-danger {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.3);
  transform: translateY(-1px);
}

.btn-danger:disabled {
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-muted, #7a8da0);
  cursor: not-allowed;
  opacity: 0.5;
}

.full-width {
  width: 100%;
}

.divider {
  height: 1px;
  background-color: var(--border-color, rgba(201, 152, 77, 0.2));
  margin: 8px 0;
}

.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  font-style: italic;
}

.info-text {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  line-height: 1.3;
  margin: 0 0 6px 0;
}

.info-text.warning {
  color: #ff9800;
  font-weight: 500;
}

/* Light theme overrides */
[data-theme='light'] h3::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M9 3v18M15 3v18M3 9h18M3 15h18'/%3E%3C/svg%3E");
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.15));
}

[data-theme='light'] .btn-primary {
  background: rgba(1, 79, 153, 0.1);
  border: 1px solid rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-primary:hover {
  background: rgba(1, 79, 153, 0.18);
}

[data-theme='light'] .btn-undo {
  background: rgba(1, 79, 153, 0.1);
  color: #014f99;
  border-color: rgba(1, 79, 153, 0.3);
}

[data-theme='light'] .btn-undo:hover {
  background: rgba(1, 79, 153, 0.18);
}

[data-theme='light'] .info-text.warning {
  color: #014f99;
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

<template>
  <div>
    <!-- Bild-Hintergrund Spiegeln -->
    <div v-if="hasImageBackground" class="flip-section">
      <h5>{{ t('canvasControl.flipBackground') }}</h5>
      <div class="flip-buttons">
        <button
          type="button"
          class="flip-button"
          :class="{ active: bgFlipH }"
          @click="toggleBgFlipH"
          :title="t('canvasControl.flipHorizontal')"
        >
          {{ t('canvasControl.horizontal') }}
        </button>
        <button
          type="button"
          class="flip-button"
          :class="{ active: bgFlipV }"
          @click="toggleBgFlipV"
          :title="t('canvasControl.flipVertical')"
        >
          {{ t('canvasControl.vertical') }}
        </button>
      </div>
    </div>

    <!-- Workspace-Hintergrund Spiegeln -->
    <div v-if="hasWorkspaceBackground" class="flip-section">
      <h5>{{ t('canvasControl.flipWorkspaceBackground') }}</h5>
      <div class="flip-buttons">
        <button
          type="button"
          class="flip-button"
          :class="{ active: wsBgFlipH }"
          @click="toggleWsBgFlipH"
          :title="t('canvasControl.flipHorizontal')"
        >
          {{ t('canvasControl.horizontal') }}
        </button>
        <button
          type="button"
          class="flip-button"
          :class="{ active: wsBgFlipV }"
          @click="toggleWsBgFlipV"
          :title="t('canvasControl.flipVertical')"
        >
          {{ t('canvasControl.vertical') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const bg = inject('bgSettings')
const {
  hasImageBackground,
  hasWorkspaceBackground,
  bgFlipH,
  bgFlipV,
  wsBgFlipH,
  wsBgFlipV,
  toggleBgFlipH,
  toggleBgFlipV,
  toggleWsBgFlipH,
  toggleWsBgFlipV,
} = bg
</script>

<style scoped>
.flip-section {
  margin-top: 10px;
  padding: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-left: 2px solid var(--accent-primary);
  border-radius: 6px;
}
.flip-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.flip-buttons {
  display: flex;
  gap: 6px;
}
.flip-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  color: var(--text-primary);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.flip-button:hover {
  background: var(--btn-hover);
  border-color: var(--accent-primary);
}
.flip-button.active {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
  border-color: var(--accent-primary);
  color: var(--accent-tertiary);
}

[data-theme='light'] .flip-section h5 {
  color: var(--accent-ink);
}
[data-theme='light'] .flip-section {
  border-left-color: var(--accent-primary);
}
[data-theme='light'] .flip-button {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}
[data-theme='light'] .flip-button.active {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
  color: var(--accent-ink);
}

@media (max-width: 480px) {
  .flip-buttons {
    flex-direction: column;
  }
}
</style>

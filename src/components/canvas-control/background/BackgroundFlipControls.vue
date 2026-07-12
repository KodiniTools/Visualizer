<template>
  <div>
    <!-- Bild-Hintergrund Spiegeln -->
    <div v-if="hasImageBackground" class="flip-section">
      <h5>🔄 {{ t('canvasControl.flipBackground') }}</h5>
      <div class="flip-buttons">
        <button
          type="button"
          class="flip-button"
          :class="{ active: bgFlipH }"
          @click="toggleBgFlipH"
          :title="t('canvasControl.flipHorizontal')"
        >
          ↔ {{ t('canvasControl.horizontal') }}
        </button>
        <button
          type="button"
          class="flip-button"
          :class="{ active: bgFlipV }"
          @click="toggleBgFlipV"
          :title="t('canvasControl.flipVertical')"
        >
          ↕ {{ t('canvasControl.vertical') }}
        </button>
      </div>
    </div>

    <!-- Workspace-Hintergrund Spiegeln -->
    <div v-if="hasWorkspaceBackground" class="flip-section">
      <h5>🔄 {{ t('canvasControl.flipWorkspaceBackground') }}</h5>
      <div class="flip-buttons">
        <button
          type="button"
          class="flip-button"
          :class="{ active: wsBgFlipH }"
          @click="toggleWsBgFlipH"
          :title="t('canvasControl.flipHorizontal')"
        >
          ↔ {{ t('canvasControl.horizontal') }}
        </button>
        <button
          type="button"
          class="flip-button"
          :class="{ active: wsBgFlipV }"
          @click="toggleWsBgFlipV"
          :title="t('canvasControl.flipVertical')"
        >
          ↕ {{ t('canvasControl.vertical') }}
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
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
  border-radius: 6px;
}
.flip-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #f8e1a9);
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
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.flip-button:hover {
  background: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
}
.flip-button.active {
  background: rgba(201, 152, 77, 0.3);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
}

[data-theme='light'] .flip-section h5 {
  color: #014f99;
}
[data-theme='light'] .flip-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
}
[data-theme='light'] .flip-button {
  background: #fdfbf2;
  border-color: var(--border-color);
  color: #003971;
}
[data-theme='light'] .flip-button:hover {
  background: var(--btn-hover);
  border-color: #014f99;
}
[data-theme='light'] .flip-button.active {
  background: rgba(1, 79, 153, 0.15);
  border-color: #014f99;
  color: #014f99;
}

@media (max-width: 480px) {
  .flip-buttons {
    flex-direction: column;
  }
}
</style>

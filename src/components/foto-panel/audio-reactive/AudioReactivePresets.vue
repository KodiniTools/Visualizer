<template>
  <div class="preset-buttons">
    <div class="modern-label">
      <span class="label-text">{{ t('foto.presets') }}</span>
    </div>
    <div class="preset-grid">
      <button
        v-for="preset in presetList"
        :key="preset.id"
        class="preset-btn"
        :class="{ active: activeAudioPreset === preset.id }"
        @click="togglePreset(preset.id)"
      >
        {{ preset.icon }} {{ preset.name }}
      </button>
      <button
        class="preset-btn preset-btn-none"
        :class="{ active: activeAudioPreset === null }"
        :title="t('foto.noPresetHint')"
        @click="clearPreset()"
      >
        ⊘ {{ t('foto.noPreset') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const arc = inject('audioReactiveControls')
const { presetList, activeAudioPreset, togglePreset, clearPreset } = arc
</script>

<style scoped src="./audio-reactive-shared.css"></style>
<style scoped>
.preset-buttons {
  margin-top: 8px;
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 6px;
}
.preset-btn {
  padding: 6px 4px;
  font-size: 0.6rem;
  background: color-mix(in srgb, var(--ds-link) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 30%, transparent);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.preset-btn:hover {
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 50%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}
.preset-btn.active {
  background: color-mix(in srgb, var(--ds-link) 60%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 80%, transparent);
  box-shadow:
    0 0 12px rgba(139, 92, 246, 0.5),
    0 0 20px rgba(236, 72, 153, 0.3);
  color: var(--text-primary);
  animation: presetGlow 2s ease-in-out infinite alternate;
}
@keyframes presetGlow {
  0% {
    box-shadow:
      0 0 8px rgba(139, 92, 246, 0.5),
      0 0 16px rgba(236, 72, 153, 0.2);
  }
  100% {
    box-shadow:
      0 0 16px rgba(139, 92, 246, 0.7),
      0 0 24px rgba(236, 72, 153, 0.4);
  }
}

/* "Kein Preset" – neutral gehalten (Reset), hebt sich von den Effekt-Presets ab */
.preset-btn-none {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--border-color);
  color: var(--text-muted);
}
.preset-btn-none:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--accent-primary);
  box-shadow: none;
  color: var(--text-primary);
}
.preset-btn-none.active {
  background: color-mix(in srgb, var(--ds-success) 16%, transparent);
  border-color: color-mix(in srgb, var(--ds-success) 60%, transparent);
  color: var(--ds-success);
  box-shadow: none;
  animation: none;
}

[data-theme='light'] .preset-btn {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}
[data-theme='light'] .preset-btn-none {
  background: var(--ds-surface-2);
  color: var(--ds-text-3);
}
[data-theme='light'] .preset-btn-none.active {
  background: color-mix(in srgb, var(--ds-success) 12%, transparent);
  border-color: color-mix(in srgb, var(--ds-success) 50%, transparent);
}
[data-theme='light'] .preset-btn:hover {
  background: var(--btn-hover);
  border-color: var(--accent-secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

@media (max-width: 768px) {
  .preset-btn {
    padding: 8px 6px;
    font-size: 0.7rem;
    min-height: 40px;
  }
}
@media (max-width: 480px) {
  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .preset-btn {
    padding: 10px 6px;
    font-size: 0.75rem;
    min-height: 44px;
  }
}
</style>

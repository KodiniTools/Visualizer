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
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.preset-btn:hover {
  background: rgba(139, 92, 246, 0.3);
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}
.preset-btn.active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(236, 72, 153, 0.5) 100%);
  border-color: rgba(236, 72, 153, 0.8);
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
  border-color: var(--border-color, rgba(255, 255, 255, 0.18));
  color: var(--text-muted, #9aa7b4);
}
.preset-btn-none:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--accent-primary, #c9984d);
  box-shadow: none;
  color: var(--text-primary);
}
.preset-btn-none.active {
  background: rgba(110, 200, 110, 0.16);
  border-color: rgba(110, 200, 110, 0.6);
  color: #6ec86e;
  box-shadow: none;
  animation: none;
}

[data-theme='light'] .preset-btn {
  background: #fdfbf2;
  border-color: var(--border-color);
}
[data-theme='light'] .preset-btn-none {
  background: #eef2f8;
  color: #5a6b7a;
}
[data-theme='light'] .preset-btn-none.active {
  background: rgba(34, 139, 34, 0.12);
  border-color: rgba(34, 139, 34, 0.5);
  color: #1f7a1f;
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

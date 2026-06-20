<template>
  <div class="panel">
    <div class="panel-header" @click="collapsed = !collapsed">
      <h3>🎨 {{ t('presets.title') }}</h3>
      <span class="collapse-icon" :class="{ rotated: !collapsed }">▼</span>
    </div>

    <Transition name="panel-collapse">
      <div v-show="!collapsed" class="panel-body">
        <!-- Built-in Presets -->
        <div class="section-label">{{ t('presets.builtIn') }}</div>
        <div class="presets-grid">
          <button
            v-for="preset in builtInPresets"
            :key="preset.id"
            class="preset-card"
            :class="{ active: activePresetId === preset.id }"
            :style="{
              '--preset-color': preset.visualizer.color,
              '--preset-bg': preset.background.color,
            }"
            @click="apply(preset)"
            :title="preset.name"
          >
            <span class="preset-emoji">{{ preset.emoji }}</span>
            <span class="preset-name">{{ preset.name }}</span>
            <span class="preset-viz">{{ preset.visualizer.selectedVisualizer }}</span>
          </button>
        </div>

        <!-- Save current -->
        <div class="save-section">
          <input
            v-model="newPresetName"
            class="preset-name-input"
            :placeholder="t('presets.namePlaceholder')"
            @keydown.enter="saveCurrent"
            maxlength="30"
          />
          <button class="btn-save" @click="saveCurrent" :disabled="!newPresetName.trim()">
            💾 {{ t('presets.save') }}
          </button>
        </div>

        <!-- User Presets -->
        <template v-if="presetStore.userPresets.length > 0">
          <div class="section-label">{{ t('presets.myPresets') }}</div>
          <div class="presets-grid">
            <div
              v-for="preset in presetStore.userPresets"
              :key="preset.id"
              class="preset-card user-preset"
              :class="{ active: activePresetId === preset.id }"
              :style="{
                '--preset-color': preset.visualizer.color,
                '--preset-bg': preset.background.color,
              }"
            >
              <button class="preset-apply-area" @click="apply(preset)">
                <span class="preset-emoji">{{ preset.emoji }}</span>
                <span class="preset-name">{{ preset.name }}</span>
                <span class="preset-viz">{{ preset.visualizer.selectedVisualizer }}</span>
              </button>
              <button
                class="btn-delete"
                @click.stop="deletePreset(preset.id)"
                :title="t('common.delete')"
              >
                ✕
              </button>
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { usePresetStore, BUILT_IN_PRESETS } from '../stores/presetStore.js'
import { useToastStore } from '../stores/toastStore.js'
import { useI18n } from '../lib/i18n.js'

const { t } = useI18n()
const canvasManager = inject('canvasManager')
const presetStore = usePresetStore()
const toastStore = useToastStore()

const collapsed = ref(false)
const newPresetName = ref('')
const builtInPresets = BUILT_IN_PRESETS
const activePresetId = ref(null)

onMounted(() => {
  presetStore.loadUserPresets()
})

function apply(preset) {
  presetStore.applyPreset(preset, canvasManager)
  activePresetId.value = preset.id
  toastStore.show?.(t('presets.applied', { name: preset.name }), 'success')
}

function saveCurrent() {
  const name = newPresetName.value.trim()
  if (!name) return
  presetStore.saveCurrentAsPreset(name, canvasManager)
  newPresetName.value = ''
  toastStore.show?.(t('presets.saved'), 'success')
}

function deletePreset(id) {
  presetStore.deleteUserPreset(id)
}
</script>

<style scoped>
.panel {
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary, #e9e9eb);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

h3 {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-primary, #e9e9eb);
}

.collapse-icon {
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  transition: transform 0.2s ease;
}
.collapse-icon.rotated {
  transform: rotate(-90deg);
}

.panel-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-label {
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-muted, #7a8da0);
}

/* ===== PRESETS GRID ===== */
.presets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.preset-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 6px;
  border-radius: 6px;
  border: 1.5px solid transparent;
  background: linear-gradient(
    135deg,
    var(--preset-bg, #111),
    color-mix(in srgb, var(--preset-bg, #111) 60%, #000)
  );
  cursor: pointer;
  transition: all 0.15s ease;
  overflow: hidden;
  min-height: 62px;
}

.preset-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    transparent 40%,
    color-mix(in srgb, var(--preset-color, #fff) 15%, transparent)
  );
  pointer-events: none;
}

.preset-card:hover {
  border-color: var(--preset-color, var(--accent-primary, #c9984d));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--preset-color, #c9984d) 30%, transparent);
}

.preset-card.active {
  border-color: var(--preset-color, var(--accent-primary, #c9984d));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--preset-color, #c9984d) 40%, transparent);
}

.preset-card.user-preset {
  padding: 0;
  flex-direction: row;
  min-height: unset;
}

.preset-apply-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  min-height: 62px;
}

.preset-emoji {
  font-size: 1.1rem;
  line-height: 1;
}

.preset-name {
  font-size: 0.55rem;
  font-weight: 600;
  color: var(--text-primary, #e9e9eb);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.preset-viz {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* ===== DELETE BUTTON ===== */
.btn-delete {
  align-self: stretch;
  width: 22px;
  padding: 0;
  background: none;
  border: none;
  border-left: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-muted, #7a8da0);
  font-size: 0.6rem;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
  border-radius: 0 6px 6px 0;
  flex-shrink: 0;
}

.btn-delete:hover {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

/* ===== SAVE SECTION ===== */
.save-section {
  display: flex;
  gap: 6px;
  align-items: center;
}

.preset-name-input {
  flex: 1;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  font-family: inherit;
}

.preset-name-input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring);
  border-color: var(--accent-primary, #c9984d);
}

.preset-name-input::placeholder {
  color: var(--text-muted, #7a8da0);
}

.btn-save {
  padding: 5px 10px;
  background: var(--accent-primary, #c9984d);
  border: none;
  border-radius: 5px;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.btn-save:hover:not(:disabled) {
  opacity: 0.85;
}

.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ═══ Light Theme ═══ */
[data-theme='light'] .preset-name {
  color: #1a2a3a;
}
[data-theme='light'] .preset-card {
  border-color: rgba(0, 0, 0, 0.1);
}
[data-theme='light'] .preset-name-input {
  background: #f0f4f8;
  border-color: rgba(0, 57, 113, 0.2);
  color: #1a2a3a;
}
</style>

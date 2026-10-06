<template>
  <div class="panel" :class="{ embedded }">
    <div v-if="!embedded" class="panel-header" @click="collapsed = !collapsed">
      <h3>🎨 {{ t('presets.title') }}</h3>
      <span class="collapse-icon" :class="{ rotated: !collapsed }">▼</span>
    </div>

    <Transition name="panel-collapse">
      <div v-show="embedded || !collapsed" class="panel-body">
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
            :title="
              preset.needsImage ? `${preset.name} — ${t('presets.needsImageHint')}` : preset.name
            "
          >
            <span class="preset-emoji">{{ preset.emoji }}</span>
            <span class="preset-name">{{ preset.name }}</span>
            <span class="preset-viz">{{ presetSubtitle(preset) }}</span>
            <span v-if="preset.needsImage" class="preset-needs-image">{{
              t('presets.needsImage')
            }}</span>
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
                <span class="preset-viz">{{ presetSubtitle(preset) }}</span>
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

// When embedded (e.g. inside the sticky-player-bar popover) the panel drops its
// own collapse header and card chrome, since the popover already supplies them.
defineProps({
  embedded: { type: Boolean, default: false },
})

const canvasManager = inject('canvasManager')
const presetStore = usePresetStore()
const toastStore = useToastStore()

const collapsed = ref(false)
const newPresetName = ref('')
const builtInPresets = BUILT_IN_PRESETS

/**
 * Untertitel der Preset-Kachel: bei Multi-Layer-Vorlagen die Anzahl der
 * Ebenen, sonst der Visualizer-Name.
 */
function presetSubtitle(preset) {
  const v = preset.visualizer
  const count = v?.mode === 'multi' ? (v.layers?.length ?? 0) : 0
  if (count > 0) return `${count} ${t('presets.layers')}`
  return v?.selectedVisualizer || ''
}
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
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary);
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
  color: var(--text-primary);
}

.collapse-icon {
  font-size: 0.6rem;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}
.collapse-icon.rotated {
  transform: rotate(-90deg);
}

.panel.embedded {
  background: none;
  border: none;
  border-radius: 0;
  padding: 0;
}

.panel.embedded .panel-body {
  margin-top: 0;
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
  color: var(--text-muted);
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
  background: var(--preset-bg);
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
    color-mix(in srgb, var(--preset-color) 15%, transparent)
  );
  pointer-events: none;
}

.preset-card:hover {
  border-color: var(--preset-color);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--preset-color) 30%, transparent);
}

.preset-card.active {
  border-color: var(--preset-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--preset-color) 40%, transparent);
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
  color: var(--text-primary);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.preset-needs-image {
  font-size: 0.45rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--accent-tertiary);
  background-color: var(--ds-accent-soft);
  border-radius: 6px;
  padding: 0 5px;
  margin-top: 2px;
}
[data-theme='light'] .preset-needs-image {
  color: var(--accent-ink);
  background-color: color-mix(in srgb, var(--accent-primary) 12%, transparent);
}

.preset-viz {
  font-size: 0.5rem;
  color: var(--text-muted);
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
  border-left: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.6rem;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
  border-radius: 0 6px 6px 0;
  flex-shrink: 0;
}

.btn-delete:hover {
  color: var(--ds-danger);
  background: color-mix(in srgb, var(--ds-danger) 10%, transparent);
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
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  color: var(--text-primary);
  font-size: 0.6rem;
  font-family: inherit;
}

.preset-name-input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring);
  border-color: var(--accent-primary);
}

.preset-name-input::placeholder {
  color: var(--text-muted);
}

.btn-save {
  padding: 5px 10px;
  background: var(--accent-primary);
  border: none;
  border-radius: 5px;
  color: var(--ds-on-accent);
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
[data-theme='light'] .preset-card {
  border-color: var(--ds-border);
}
[data-theme='light'] .preset-name-input {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}
</style>

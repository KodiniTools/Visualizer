<template>
  <details v-if="items.length > 0" class="collapsible-section" open>
    <summary class="section-header">
      <span class="section-icon">📋</span>
      <span>{{ t('textManager.textDirectory') }}</span>
      <span class="count-badge">{{ items.length }}</span>
      <button
        type="button"
        class="play-all-btn"
        :class="{ playing: sequencePlaying }"
        :title="sequencePlaying ? t('textManager.stopPlayback') : t('textManager.playAllTexts')"
        :aria-label="
          sequencePlaying ? t('textManager.stopPlayback') : t('textManager.playAllTexts')
        "
        @click.stop.prevent="$emit(sequencePlaying ? 'stop-all' : 'play-all')"
      >
        {{ sequencePlaying ? '⏹' : '▶' }}
      </button>
    </summary>
    <div class="section-content">
      <div class="hint-text">{{ t('textManager.directoryHint') }}</div>

      <!-- Globale Anzeigedauer für die Reihenwiedergabe -->
      <div class="global-dur">
        <label class="checkbox-label">
          <input v-model="globalDurationEnabled" type="checkbox" />
          {{ t('textManager.globalDuration') }}
        </label>
        <div v-if="globalDurationEnabled" class="dur-row">
          <SliderField
            v-model="globalDuration"
            :min="500"
            :max="30000"
            :step="100"
            :default-value="5000"
            class="slider"
          />
        </div>
        <div v-if="globalDurationEnabled" class="hint-text">
          {{ t('textManager.globalDurationHint') }}
        </div>
      </div>

      <ul class="text-list">
        <li v-for="item in items" :key="item.id" class="text-row">
          <button
            type="button"
            class="text-item"
            :class="{ active: item.id === activeId }"
            @click="$emit('select', item.id)"
          >
            <span class="text-item-name">{{ t('textManager.textItem') }} {{ item.number }}</span>
            <span class="text-item-preview">{{
              item.content || t('textManager.emptyTextLabel')
            }}</span>
            <span v-if="item.animated" class="text-item-icon" title="Animation">🎬</span>
          </button>
          <button
            v-if="item.id === activeId && item.animated"
            type="button"
            class="play-btn"
            :title="t('textManager.restartAnimation')"
            :aria-label="t('textManager.restartAnimation')"
            @click="$emit('restart', item.id)"
          >
            ▶
          </button>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import { useI18n } from '../../lib/i18n.js'

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  activeId: {
    type: [Number, String],
    default: null,
  },
  sequencePlaying: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['select', 'restart', 'play-all', 'stop-all'])

// Zwei-Wege-Bindung für die globale Anzeigedauer (vom TextManagerPanel gesteuert)
const globalDurationEnabled = defineModel('globalDurationEnabled', {
  type: Boolean,
  default: false,
})
const globalDuration = defineModel('globalDuration', { type: Number, default: 5000 })

const { t } = useI18n()
</script>

<style scoped>
.collapsible-section {
  background-color: var(--secondary-bg);
  border: 1px solid var(--card-bg);
  border-radius: var(--ds-radius-md);
  margin-bottom: 10px;
  overflow: hidden;
}

.collapsible-section summary {
  list-style: none;
}

.collapsible-section summary::-webkit-details-marker {
  display: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
}

.section-header::before {
  content: '▶';
  font-size: var(--ds-text-xs);
  color: var(--ds-link);
  transition: transform var(--ds-duration) var(--ds-ease);
  margin-right: 4px;
}

.collapsible-section[open] .section-header::before {
  transform: rotate(90deg);
}

.section-icon {
  font-size: var(--ds-text-md);
  flex-shrink: 0;
}

.count-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  color: var(--ds-link);
}

.play-all-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--ds-link);
  border-radius: var(--ds-radius-sm);
  background: color-mix(in srgb, var(--ds-link) 18%, transparent);
  color: var(--ds-link);
  cursor: pointer;
  font-size: var(--ds-text-xs);
  transition: all var(--ds-duration) var(--ds-ease);
}
.play-all-btn:hover {
  background: var(--ds-link);
  color: #fff;
}
.play-all-btn.playing {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  border-color: var(--ds-danger);
  color: var(--ds-danger);
}
.play-all-btn.playing:hover {
  background: var(--ds-danger);
  color: #fff;
}
[data-theme='light'] .play-all-btn {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}
[data-theme='light'] .play-all-btn:hover {
  background: var(--accent-primary);
  color: var(--accent-text);
}

.section-content {
  padding: 10px 12px;
}

.hint-text {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-bottom: 8px;
  line-height: 1.4;
}

/* Globale Anzeigedauer */
.global-dur {
  margin-bottom: 8px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  background: color-mix(in srgb, var(--ds-link) 6%, transparent);
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
}
.checkbox-label input[type='checkbox'] {
  width: 13px;
  height: 13px;
  cursor: pointer;
  accent-color: var(--ds-link);
}
.dur-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.dur-row .slider {
  flex: 1;
  min-width: 0;
}
.slider {
  height: 3px;
  border-radius: var(--ds-radius-sm);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background: var(--text-muted);
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-link);
  border: 2px solid var(--ds-surface-1);
  cursor: pointer;
}
.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-link);
  border: 2px solid var(--ds-surface-1);
  cursor: pointer;
}
.dur-number {
  flex-shrink: 0;
  width: 66px;
  padding: 5px 6px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
}
.dur-number:focus {
  border-color: var(--ds-link);
  outline: none;
}
[data-theme='light'] .global-dur {
  border-color: var(--border-color);
  background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
}
[data-theme='light'] .dur-number {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}
[data-theme='light'] .dur-number:focus {
  border-color: var(--accent-primary);
}

.text-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
}

.text-row {
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.text-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  cursor: pointer;
  font-size: var(--ds-text-xs);
  text-align: left;
  transition: all var(--ds-duration) var(--ds-ease);
}

.text-item:hover {
  background-color: var(--btn-hover);
  border-color: var(--accent-primary);
}

.text-item.active {
  background: color-mix(in srgb, var(--ds-link) 18%, transparent);
  border-color: var(--ds-link);
  color: var(--ds-link);
  font-weight: var(--ds-weight-semibold);
}

.text-item-name {
  flex-shrink: 0;
  font-weight: var(--ds-weight-semibold);
}

.text-item-preview {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
}

.text-item.active .text-item-preview {
  color: var(--ds-link);
}

.text-item-icon {
  flex-shrink: 0;
  font-size: var(--ds-text-xs);
}

.play-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  padding: 0;
  background: color-mix(in srgb, var(--ds-link) 18%, transparent);
  border: 1px solid var(--ds-link);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-link);
  cursor: pointer;
  font-size: var(--ds-text-xs);
  transition: all var(--ds-duration) var(--ds-ease);
}

.play-btn:hover {
  background: var(--ds-link);
  color: #fff;
}

/* ═══ Light Theme ═══ */
[data-theme='light'] .collapsible-section {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
}

[data-theme='light'] .section-header {
  color: var(--text-primary);
}

[data-theme='light'] .text-item.active {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

[data-theme='light'] .play-btn {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}

[data-theme='light'] .play-btn:hover {
  background: var(--accent-primary);
  color: var(--accent-text);
}
</style>

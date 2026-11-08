<template>
  <details v-if="items.length > 0" class="collapsible-section" open>
    <summary class="section-header">
      <span>{{ t('textManager.textDirectory') }}</span>
      <span class="count-badge">{{ items.length }}</span>
      <UiIconButton
        size="sm"
        variant="secondary"
        class="play-all-btn"
        :class="{ playing: sequencePlaying }"
        :label="sequencePlaying ? t('textManager.stopPlayback') : t('textManager.playAllTexts')"
        @click.stop.prevent="$emit(sequencePlaying ? 'stop-all' : 'play-all')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path :d="sequencePlaying ? ICON_STOP : ICON_PLAY" />
        </svg>
      </UiIconButton>
    </summary>
    <div class="section-content">
      <div class="hint-text">{{ t('textManager.directoryHint') }}</div>

      <!-- Globale Anzeigedauer für die Reihenwiedergabe -->
      <div class="global-dur">
        <UiSwitch v-model="globalDurationEnabled" :label="t('textManager.globalDuration')" />
        <template v-if="globalDurationEnabled">
          <SliderField
            v-model="globalDuration"
            :min="500"
            :max="30000"
            :step="100"
            :default-value="5000"
            class="dur-slider"
          />
          <div class="hint-text">{{ t('textManager.globalDurationHint') }}</div>
        </template>
      </div>

      <ul class="text-list">
        <li
          v-for="item in items"
          :key="item.id"
          class="text-row"
          :class="{ 'text-row--off-canvas': item.offCanvas }"
        >
          <!-- Vom Canvas entfernt: bleibt im Verzeichnis (für Beat-Marker), nicht markierbar -->
          <div v-if="item.offCanvas" class="text-item text-item--off-canvas">
            <span class="text-item-name">{{ t('textManager.textItem') }} {{ item.number }}</span>
            <span class="text-item-preview">{{
              item.content || t('textManager.emptyTextLabel')
            }}</span>
            <span class="off-canvas-badge">{{ t('textManager.offCanvasBadge') }}</span>
          </div>
          <button
            v-else
            type="button"
            class="text-item"
            :class="{ active: item.id === activeId }"
            :aria-pressed="item.id === activeId ? 'true' : 'false'"
            @click="$emit('select', item.id)"
          >
            <span class="text-item-name">{{ t('textManager.textItem') }} {{ item.number }}</span>
            <span class="text-item-preview">{{
              item.content || t('textManager.emptyTextLabel')
            }}</span>
            <svg
              v-if="item.animated"
              class="text-item-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              role="img"
              :aria-label="t('textManager.animation')"
            >
              <title>{{ t('textManager.animation') }}</title>
              <path :d="ICON_ANIMATION" />
            </svg>
          </button>
          <UiIconButton
            v-if="!item.offCanvas && item.id === activeId && item.animated"
            size="sm"
            variant="secondary"
            class="row-action"
            :label="t('textManager.restartAnimation')"
            @click="$emit('restart', item.id)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path :d="ICON_PLAY" />
            </svg>
          </UiIconButton>
          <UiIconButton
            v-if="item.offCanvas"
            size="sm"
            variant="secondary"
            class="row-action"
            data-test="return-to-canvas"
            :label="t('textManager.returnToCanvas')"
            @click="$emit('return-to-canvas', item.id)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path :d="ICON_RETURN" />
            </svg>
          </UiIconButton>
          <UiIconButton
            size="sm"
            variant="secondary"
            class="row-action row-action--danger"
            data-test="delete-from-directory"
            :label="t('textManager.deleteFromDirectory')"
            @click="$emit('delete', item.id)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path :d="ICON_DELETE" />
            </svg>
          </UiIconButton>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiSwitch from '../ui/UiSwitch.vue'
import { useI18n } from '../../lib/i18n'

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

defineEmits(['select', 'restart', 'play-all', 'stop-all', 'return-to-canvas', 'delete'])

// Zwei-Wege-Bindung für die globale Anzeigedauer (vom TextManagerPanel gesteuert)
const globalDurationEnabled = defineModel('globalDurationEnabled', {
  type: Boolean,
  default: false,
})
const globalDuration = defineModel('globalDuration', { type: Number, default: 5000 })

const { t } = useI18n()

const ICON_PLAY = 'M8 5v14l11-7z'
const ICON_STOP = 'M6 6h12v12H6z'
// Filmstreifen (Text hat eine Animation)
const ICON_ANIMATION =
  'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z'
// Pfeil zurück (auf den Canvas)
const ICON_RETURN =
  'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z'
const ICON_DELETE = 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'
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

.count-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  color: var(--ds-link);
}

/* Reihenwiedergabe läuft: Stoppen ist textbasiert danger */
.section-header .play-all-btn.playing {
  border-color: var(--ds-danger);
  color: var(--ds-danger);
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
.dur-slider {
  margin-top: 8px;
}
.global-dur .hint-text {
  margin: 6px 0 0;
}
[data-theme='light'] .global-dur {
  border-color: var(--border-color);
  background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
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
  width: var(--ds-icon-sm);
  height: var(--ds-icon-sm);
}

/* Vom Canvas entfernter Text: nur im Verzeichnis */
.text-item--off-canvas {
  cursor: default;
  border-style: dashed;
  background-color: transparent;
}
.text-item--off-canvas:hover {
  background-color: transparent;
  border-color: var(--border-color);
}
.text-item--off-canvas .text-item-name,
.text-item--off-canvas .text-item-preview {
  color: var(--text-muted);
}
.off-canvas-badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-full);
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.row-action {
  align-self: center;
}
.row-action--danger:hover:not(:disabled) {
  border-color: var(--ds-danger);
  color: var(--ds-danger);
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
</style>

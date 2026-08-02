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

const { t } = useI18n()
</script>

<style scoped>
.collapsible-section {
  background-color: var(--secondary-bg);
  border: 1px solid var(--card-bg);
  border-radius: 8px;
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
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
}

.section-header::before {
  content: '▶';
  font-size: 8px;
  color: #6ea8fe;
  transition: transform 0.2s ease;
  margin-right: 4px;
}

.collapsible-section[open] .section-header::before {
  transform: rotate(90deg);
}

.section-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.count-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 600;
  border-radius: 10px;
  background: rgba(110, 168, 254, 0.2);
  color: #6ea8fe;
}

.play-all-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
  padding: 0;
  border: 1px solid #6ea8fe;
  border-radius: 5px;
  background: rgba(110, 168, 254, 0.18);
  color: #6ea8fe;
  cursor: pointer;
  font-size: 0.6rem;
  transition: all 0.2s ease;
}
.play-all-btn:hover {
  background: #6ea8fe;
  color: #fff;
}
.play-all-btn.playing {
  background: rgba(244, 67, 54, 0.2);
  border-color: #f44336;
  color: #f44336;
}
.play-all-btn.playing:hover {
  background: #f44336;
  color: #fff;
}
[data-theme='light'] .play-all-btn {
  background: rgba(1, 79, 153, 0.1);
  border-color: #014f99;
  color: #014f99;
}
[data-theme='light'] .play-all-btn:hover {
  background: #014f99;
  color: #fff;
}

.section-content {
  padding: 10px 12px;
}

.hint-text {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  margin-bottom: 8px;
  line-height: 1.4;
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
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
  font-size: 0.6rem;
  text-align: left;
  transition: all 0.2s ease;
}

.text-item:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
}

.text-item.active {
  background: rgba(110, 168, 254, 0.18);
  border-color: #6ea8fe;
  color: #cfe1ff;
  font-weight: 600;
}

.text-item-name {
  flex-shrink: 0;
  font-weight: 600;
}

.text-item-preview {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted, #7a8da0);
}

.text-item.active .text-item-preview {
  color: #a9c7ff;
}

.text-item-icon {
  flex-shrink: 0;
  font-size: 0.7rem;
}

.play-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  padding: 0;
  background: rgba(110, 168, 254, 0.18);
  border: 1px solid #6ea8fe;
  border-radius: 5px;
  color: #6ea8fe;
  cursor: pointer;
  font-size: 0.65rem;
  transition: all 0.2s ease;
}

.play-btn:hover {
  background: #6ea8fe;
  color: #fff;
  transform: scale(1.05);
}

/* ═══ Light Theme ═══ */
[data-theme='light'] .collapsible-section {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .section-header {
  color: #003971;
}

[data-theme='light'] .text-item.active {
  background: rgba(1, 79, 153, 0.1);
  border-color: #014f99;
  color: #013a70;
}

[data-theme='light'] .play-btn {
  background: rgba(1, 79, 153, 0.1);
  border-color: #014f99;
  color: #014f99;
}

[data-theme='light'] .play-btn:hover {
  background: #014f99;
  color: #fff;
}
</style>

<template>
  <div v-popover-drag class="spb-popover spb-popover-playlist">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.playlist') }}</span>
      <div class="marker-controls">
        <button
          v-if="playerStore.hasTracks"
          class="btn-clear-markers"
          :title="t('player.deleteAll')"
          @click="clearAllTracks"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
        </button>
        <button class="spb-popover-close" :title="t('common.close')" @click="closePopover">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
    </div>
    <ul class="playlist-container">
      <li v-if="!playerStore.hasTracks" class="playlist-item-empty">
        {{ t('player.playlistEmpty') }}
      </li>
      <li
        v-for="(track, index) in playerStore.playlist"
        :key="track.url"
        class="playlist-item"
        :class="{
          active: index === playerStore.currentTrackIndex,
          dragging: draggedTrackIndex === index,
          'drag-over': dragOverTrackIndex === index && draggedTrackIndex !== index,
        }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver($event, index)"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop($event, index)"
      >
        <span class="drag-handle" :title="t('player.dragToReorder')">⠿</span>
        <span class="track-name" @click="loadTrackOnly(index)">{{ track.name }}</span>
        <button
          class="btn-delete"
          :title="t('player.removeTrack')"
          @click.stop="removeTrack(index)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()
const playerStore = usePlayerStore()

const { popover, playlist } = inject('playerBar')
const { closePopover } = popover
const {
  draggedTrackIndex,
  dragOverTrackIndex,
  loadTrackOnly,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  removeTrack,
  clearAllTracks,
} = playlist
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.playlist-container {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 240px;
  overflow-y: auto;
  background-color: var(--secondary-bg, #0e1c32);
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}
.playlist-item {
  position: relative;
  padding: 6px 8px;
  font-size: 0.65rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.1));
}
.playlist-item:last-child {
  border-bottom: none;
}
.playlist-item:hover {
  background-color: var(--btn-hover, #1a2a42);
}
.playlist-item.active {
  background-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
  font-weight: 600;
}
.track-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.btn-delete {
  background-color: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.6;
  flex-shrink: 0;
}
.btn-delete:hover {
  background-color: rgba(255, 68, 68, 0.8);
  color: #fff;
  opacity: 1;
}
.btn-delete svg {
  width: 14px;
  height: 14px;
}
.playlist-item.active .btn-delete {
  color: var(--accent-text);
  opacity: 0.7;
}
.drag-handle {
  cursor: grab;
  color: var(--text-muted);
  font-size: 0.7rem;
  user-select: none;
  opacity: 0.5;
  flex-shrink: 0;
  padding-right: 4px;
}
.drag-handle:hover {
  opacity: 1;
  color: var(--accent-primary, #c9984d);
}
.drag-handle:active {
  cursor: grabbing;
}
.playlist-item.dragging {
  opacity: 0.5;
  transform: scale(0.98);
  background-color: var(--accent-primary, #c9984d) !important;
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.3);
}
.playlist-item.drag-over {
  border-color: #4ade80;
  background-color: rgba(74, 222, 128, 0.15) !important;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.4);
  transform: scale(1.02);
}
.playlist-item-empty {
  padding: 14px;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  font-size: 11px;
}
.playlist-container::-webkit-scrollbar {
  width: 6px;
}
.playlist-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}
</style>
